"""Document source resolution.

`SourceDocument` is what the OCR strategies receive. It deliberately exposes
two ways to reach the same document:

* `read_bytes()` — for backends that need the content in hand (Tesseract).
* `s3_location` — for backends that can read from S3 themselves (Textract's
  asynchronous API, which accepts *only* an S3 object).

Handing backends raw bytes and nothing else would have quietly ruled out
Textract's multi-page path, so the choice stays with the strategy.
"""

import errno
import logging
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import unquote, urlparse
from urllib.request import url2pathname

from app.config import settings
from app.errors import AgentError, BackendConfigurationError, TransientAgentError

logger = logging.getLogger(__name__)

# Schemes `read_bytes()` knows how to fetch.
SUPPORTED_SCHEMES = frozenset({"file", "s3", "http", "https"})


@dataclass(frozen=True)
class SourceDocument:
    """A document to be processed, identified by URI rather than by content."""

    document_id: str
    uri: str
    content_type: str = "application/pdf"

    @property
    def scheme(self) -> str:
        """The URI scheme, lowercased. A bare path is treated as `file`."""
        return (urlparse(self.uri).scheme or "file").lower()

    @property
    def s3_location(self) -> Optional[tuple[str, str]]:
        """`(bucket, key)` when this document already lives in S3, else None."""
        if self.scheme != "s3":
            return None
        parsed = urlparse(self.uri)
        bucket, key = parsed.netloc, unquote(parsed.path).lstrip("/")
        if not bucket or not key:
            raise AgentError(f"malformed s3 uri: {self.uri!r}")
        return bucket, key

    @property
    def is_pdf_or_tiff(self) -> bool:
        """Whether this is a paged format, which changes the Textract path."""
        ct = (self.content_type or "").lower()
        return "pdf" in ct or "tiff" in ct or self.uri.lower().endswith(
            (".pdf", ".tif", ".tiff")
        )

    def read_bytes(self) -> bytes:
        """Fetch the document content.

        Raises:
            AgentError: The URI is unsupported, missing, or too large.
            TransientAgentError: A retryable transport failure.
        """
        scheme = self.scheme
        if scheme not in SUPPORTED_SCHEMES:
            raise AgentError(
                f"unsupported source scheme {scheme!r} for {self.uri!r}; "
                f"supported: {sorted(SUPPORTED_SCHEMES)}"
            )

        loaders = {
            "file": self._read_file,
            "http": self._read_http,
            "https": self._read_http,
            "s3": self._read_s3,
        }
        data = loaders[scheme]()

        if len(data) > settings.source_max_bytes:
            raise AgentError(
                f"document {self.document_id} is {len(data)} bytes, over the "
                f"{settings.source_max_bytes} byte limit"
            )
        if not data:
            raise AgentError(f"document {self.document_id} is empty at {self.uri!r}")
        logger.debug("fetched %d bytes for %s", len(data), self.document_id)
        return data

    # -- per-scheme loaders -------------------------------------------------

    #: Filesystem errors that will never resolve on their own.
    _PERMANENT_OS_ERRNOS = frozenset(
        {errno.ENOENT, errno.EISDIR, errno.EINVAL, errno.ENAMETOOLONG, errno.EACCES}
    )

    def _read_file(self) -> bytes:
        parsed = urlparse(self.uri)
        if parsed.scheme == "file":
            # url2pathname rather than a bare unquote: on Windows a file:// URI
            # parses to /C:/dir/x.pdf, which is not a usable path until it is
            # translated. On POSIX this just unquotes.
            raw = url2pathname(parsed.path)
        else:
            # A bare filesystem path passes through untouched.
            raw = self.uri
        path = Path(raw)

        try:
            return path.read_bytes()
        except FileNotFoundError as exc:
            raise AgentError(f"no such document: {path}") from exc
        except IsADirectoryError as exc:
            raise AgentError(f"source is a directory, not a document: {path}") from exc
        except OSError as exc:
            if exc.errno in self._PERMANENT_OS_ERRNOS:
                # A malformed path or a denied file will read the same next time.
                raise AgentError(f"cannot read {path}: {exc}") from exc
            # Anything else (EIO, ESTALE, ETIMEDOUT) may be a flaky network
            # mount, which is worth a retry.
            raise TransientAgentError(f"could not read {path}: {exc}") from exc

    def _read_http(self) -> bytes:
        try:
            with urllib.request.urlopen(self.uri, timeout=settings.source_timeout_s) as r:
                return r.read(settings.source_max_bytes + 1)
        except urllib.error.HTTPError as exc:
            # 4xx will not change on retry; 5xx, 408, 425 and 429 might.
            if exc.code in (408, 425, 429) or exc.code >= 500:
                raise TransientAgentError(f"{self.uri} returned {exc.code}") from exc
            raise AgentError(f"{self.uri} returned {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise TransientAgentError(f"could not fetch {self.uri}: {exc}") from exc

    def _read_s3(self) -> bytes:
        bucket, key = self.s3_location  # type: ignore[misc]
        try:
            import boto3
            from botocore.exceptions import BotoCoreError, ClientError
        except ImportError as exc:
            raise BackendConfigurationError(
                "s3:// sources need boto3: pip install -r requirements-textract.txt"
            ) from exc

        client = boto3.client("s3", region_name=settings.textract_region)
        try:
            return client.get_object(Bucket=bucket, Key=key)["Body"].read()
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("NoSuchKey", "NoSuchBucket", "404"):
                raise AgentError(f"s3://{bucket}/{key} does not exist") from exc
            if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
                raise BackendConfigurationError(
                    f"s3://{bucket}/{key} denied: {code}"
                ) from exc
            raise TransientAgentError(f"s3 get_object failed: {code or exc}") from exc
        except BotoCoreError as exc:
            raise TransientAgentError(f"s3 transport failure: {exc}") from exc
