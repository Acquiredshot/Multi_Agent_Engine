"""AWS Textract backend, for production.

Textract has two paths, and which one applies is a property of the document:

* Synchronous ``DetectDocumentText`` -- single images, content passed inline
  or read from S3.
* Asynchronous ``StartDocumentTextDetection`` plus polling -- multi-page
  PDF/TIFF. This path accepts *only* an S3 object, never inline bytes.

That asymmetry is why `SourceDocument` exposes `s3_location` alongside
`read_bytes()`. A document that needs the async path but is not in S3 is
staged into `textract_staging_bucket`; if that is unset the document is
rejected rather than silently processed as its first page only.

Needs requirements-textract.txt and standard AWS credential resolution.
"""

import logging
import time
from typing import Any, Optional

from app.config import settings
from app.errors import AgentError, BackendConfigurationError, TransientAgentError
from app.ocr.base import OCRBackend, OCRExtraction
from app.sources import SourceDocument

logger = logging.getLogger(__name__)

# Codes worth another attempt: capacity and transport, not content.
_RETRYABLE_CODES = frozenset(
    {
        "ThrottlingException",
        "ProvisionedThroughputExceededException",
        "LimitExceededException",
        "InternalServerError",
        "ServiceUnavailable",
        "RequestTimeout",
    }
)
# Codes that mean the credentials or policy are wrong, not the document.
_CONFIG_CODES = frozenset(
    {
        "AccessDeniedException",
        "UnrecognizedClientException",
        "InvalidSignatureException",
        "ExpiredTokenException",
        "InvalidClientTokenId",
    }
)


class TextractBackend(OCRBackend):
    """Extracts text via AWS Textract."""

    name = "textract"
    supported_schemes = frozenset({"file", "http", "https", "s3"})

    def __init__(self) -> None:
        self._client: Optional[Any] = None
        self._s3: Optional[Any] = None

    # -- lifecycle ----------------------------------------------------------

    def check_ready(self) -> None:
        try:
            import boto3
            from botocore.exceptions import BotoCoreError
        except ImportError as exc:
            raise BackendConfigurationError(
                "textract backend needs boto3: "
                "pip install -r requirements-textract.txt"
            ) from exc

        try:
            self._client = boto3.client("textract", region_name=settings.textract_region)
        except BotoCoreError as exc:
            # Almost always an unresolvable region.
            raise BackendConfigurationError(
                f"could not create a textract client: {exc}"
            ) from exc

        if self._client.meta.region_name is None:
            raise BackendConfigurationError(
                "no AWS region resolved; set TEXTRACT_REGION or AWS_REGION"
            )
        logger.info("textract client ready in %s", self._client.meta.region_name)

    @property
    def client(self) -> Any:
        if self._client is None:  # check_ready is normally what builds it
            self.check_ready()
        return self._client

    @property
    def s3(self) -> Any:
        if self._s3 is None:
            import boto3

            self._s3 = boto3.client("s3", region_name=settings.textract_region)
        return self._s3

    # -- strategy entry point ----------------------------------------------

    def extract(self, document: SourceDocument) -> OCRExtraction:
        if document.is_pdf_or_tiff:
            bucket, key = self._ensure_in_s3(document)
            return self._extract_async(document, bucket, key)
        return self._extract_sync(document)

    # -- synchronous path (single images) ----------------------------------

    def _extract_sync(self, document: SourceDocument) -> OCRExtraction:
        location = document.s3_location
        if location is not None:
            # Let Textract read from S3 directly rather than pulling the bytes
            # through this worker.
            bucket, key = location
            payload: dict[str, Any] = {"S3Object": {"Bucket": bucket, "Name": key}}
        else:
            payload = {"Bytes": document.read_bytes()}

        response = self._call("detect_document_text", document, Document=payload)
        return self._to_extraction(document, [response], mode="sync")

    # -- asynchronous path (multi-page PDF/TIFF) ---------------------------

    def _extract_async(
        self, document: SourceDocument, bucket: str, key: str
    ) -> OCRExtraction:
        started = self._call(
            "start_document_text_detection",
            document,
            DocumentLocation={"S3Object": {"Bucket": bucket, "Name": key}},
        )
        job_id = started["JobId"]
        logger.info(
            "textract job %s started for document_id=%s", job_id, document.document_id
        )

        pages = self._await_job(document, job_id)
        folded = self._to_extraction(document, pages, mode="async")
        return OCRExtraction(
            text=folded.text,
            page_count=folded.page_count,
            mean_confidence=folded.mean_confidence,
            language=folded.language,
            backend=self.name,
            metadata={**folded.metadata, "job_id": job_id},
        )

    def _await_job(self, document: SourceDocument, job_id: str) -> list[dict[str, Any]]:
        """Poll a Textract job to completion, following result pagination."""
        deadline = time.monotonic() + settings.textract_max_poll_s
        while True:
            response = self._call("get_document_text_detection", document, JobId=job_id)
            status = response.get("JobStatus")

            if status == "SUCCEEDED":
                return self._collect_pages(document, job_id, response)
            if status == "PARTIAL_SUCCESS":
                # Some pages failed. Return what there is rather than nothing,
                # but make it visible.
                logger.warning(
                    "textract job %s partially succeeded for document_id=%s: %s",
                    job_id,
                    document.document_id,
                    response.get("Warnings"),
                )
                return self._collect_pages(document, job_id, response)
            if status == "FAILED":
                raise AgentError(
                    f"textract job {job_id} failed for {document.document_id}: "
                    f"{response.get('StatusMessage')}"
                )
            if status != "IN_PROGRESS":
                raise AgentError(f"textract job {job_id} in unknown state {status!r}")

            if time.monotonic() >= deadline:
                # A retry starts a fresh job, which is wasteful but correct.
                # textract_max_poll_s is kept below task_soft_time_limit_s so
                # this fires before Celery kills the task mid-poll.
                raise TransientAgentError(
                    f"textract job {job_id} still running after "
                    f"{settings.textract_max_poll_s}s"
                )
            time.sleep(settings.textract_poll_interval_s)

    def _collect_pages(
        self, document: SourceDocument, job_id: str, first: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Follow NextToken so long documents are not truncated."""
        responses = [first]
        token = first.get("NextToken")
        while token:
            page = self._call(
                "get_document_text_detection", document, JobId=job_id, NextToken=token
            )
            responses.append(page)
            token = page.get("NextToken")
        return responses

    # -- staging ------------------------------------------------------------

    def _ensure_in_s3(self, document: SourceDocument) -> tuple[str, str]:
        """Return the S3 location for the async path, uploading if needed."""
        location = document.s3_location
        if location is not None:
            return location

        bucket = settings.textract_staging_bucket
        if not bucket:
            raise AgentError(
                f"{document.document_id} is a paged document at {document.uri!r}, "
                "which Textract can only process asynchronously from S3. "
                "Provide an s3:// source or set TEXTRACT_STAGING_BUCKET."
            )

        key = f"{settings.textract_staging_prefix}{document.document_id}"
        logger.info("staging %s to s3://%s/%s", document.document_id, bucket, key)

        from botocore.exceptions import BotoCoreError, ClientError

        try:
            self.s3.put_object(Bucket=bucket, Key=key, Body=document.read_bytes())
        except ClientError as exc:
            self._raise_for_client_error(exc, document, "s3 put_object")
        except BotoCoreError as exc:
            raise TransientAgentError(f"staging upload failed: {exc}") from exc
        return bucket, key

    # -- shared plumbing ----------------------------------------------------

    def _call(self, operation: str, document: SourceDocument, **kwargs: Any) -> Any:
        """Invoke a Textract operation, mapping vendor errors to the taxonomy."""
        from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

        try:
            return getattr(self.client, operation)(**kwargs)
        except NoCredentialsError as exc:
            raise BackendConfigurationError(
                "no AWS credentials resolved for textract"
            ) from exc
        except ClientError as exc:
            self._raise_for_client_error(exc, document, operation)
        except BotoCoreError as exc:
            raise TransientAgentError(
                f"textract {operation} transport error: {exc}"
            ) from exc

    def _raise_for_client_error(
        self, exc: Any, document: SourceDocument, operation: str = "textract"
    ) -> None:
        """Translate a botocore ClientError into the shared error taxonomy."""
        code = exc.response.get("Error", {}).get("Code", "")
        detail = f"{operation} on {document.document_id}: {code or exc}"
        if code in _RETRYABLE_CODES:
            raise TransientAgentError(detail) from exc
        if code in _CONFIG_CODES:
            raise BackendConfigurationError(detail) from exc
        # UnsupportedDocumentException, DocumentTooLargeException,
        # InvalidS3ObjectException, BadDocumentException and friends: the
        # document will never work.
        raise AgentError(detail) from exc

    def _to_extraction(
        self, document: SourceDocument, responses: list[dict[str, Any]], mode: str
    ) -> OCRExtraction:
        """Fold Textract blocks into an OCRExtraction."""
        lines: list[str] = []
        confidences: list[float] = []
        page_count = 0

        for response in responses:
            page_count = max(
                page_count, int(response.get("DocumentMetadata", {}).get("Pages", 0))
            )
            for block in response.get("Blocks", []):
                block_type = block.get("BlockType")
                if block_type == "LINE" and block.get("Text"):
                    lines.append(block["Text"])
                # WORD confidences are the finest-grained signal available.
                elif block_type == "WORD" and block.get("Confidence") is not None:
                    confidences.append(float(block["Confidence"]))

        mean = sum(confidences) / len(confidences) if confidences else 0.0
        return OCRExtraction(
            text="\n".join(lines),
            page_count=page_count or (1 if lines else 0),
            mean_confidence=self.normalise_confidence(mean),
            # DetectDocumentText does not report a language.
            language=None,
            backend=self.name,
            metadata={"mode": mode, "scored_words": len(confidences)},
        )
