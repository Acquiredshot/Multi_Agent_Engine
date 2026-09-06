"""The OCR strategy interface.

`OCRBackend` is the abstraction the ocr agent talks to. Every implementation
takes a `SourceDocument` and returns an `OCRExtraction`, so swapping Tesseract
for Textract is a configuration change rather than a code change.

Two rules keep implementations interchangeable:

1. `mean_confidence` is normalised to 0.0-1.0 here, whatever scale the vendor
   reports (both Tesseract and Textract use 0-100).
2. Vendor exceptions are translated into the shared taxonomy in `app.errors`,
   so retry behaviour does not depend on which backend is active.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from app.sources import SourceDocument


@dataclass(frozen=True)
class OCRExtraction:
    """Backend-neutral extraction result.

    Deliberately excludes `document_id`: a backend is handed a document and
    reports what it read, while the task owns the request envelope.
    """

    text: str
    page_count: int
    mean_confidence: float
    language: Optional[str] = None
    backend: str = ""
    # Vendor-specific extras (job ids, block counts) for debugging. Never
    # relied on by the pipeline.
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not 0.0 <= self.mean_confidence <= 1.0:
            raise ValueError(
                f"mean_confidence must be 0.0-1.0, got {self.mean_confidence!r}; "
                "backends must normalise vendor confidence scales"
            )
        if self.page_count < 0:
            raise ValueError(f"page_count must be >= 0, got {self.page_count!r}")


class OCRBackend(ABC):
    """A pluggable text-extraction strategy."""

    #: Registry key, and what /health reports.
    name: ClassVar[str] = ""

    #: Source schemes this backend can handle, before staging is considered.
    supported_schemes: ClassVar[frozenset[str]] = frozenset(
        {"file", "http", "https", "s3"}
    )

    @abstractmethod
    def extract(self, document: SourceDocument) -> OCRExtraction:
        """Extract text from `document`.

        Raises:
            AgentError: The document cannot be processed, ever.
            TransientAgentError: A retryable failure.
            BackendConfigurationError: The backend is not usable as configured.
        """

    def check_ready(self) -> None:
        """Preflight the backend's dependencies and credentials.

        Called once when the backend is constructed, so a misconfigured worker
        fails at startup with a clear message instead of on the first document.
        Default implementation does nothing.

        Raises:
            BackendConfigurationError: The backend cannot run.
        """

    @staticmethod
    def normalise_confidence(vendor_value: float) -> float:
        """Convert a vendor 0-100 confidence to this interface's 0.0-1.0."""
        return max(0.0, min(1.0, vendor_value / 100.0))

    def __repr__(self) -> str:
        return f"<{type(self).__name__} name={self.name!r}>"
