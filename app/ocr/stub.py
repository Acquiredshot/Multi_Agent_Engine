"""No-op backend: the default, so the stack runs with no OCR dependencies.

Returns a schema-valid empty extraction and logs loudly, which keeps the
pipeline exercisable end to end without Tesseract installed or AWS reachable.
"""

import logging

from app.ocr.base import OCRBackend, OCRExtraction
from app.sources import SourceDocument

logger = logging.getLogger(__name__)


class StubBackend(OCRBackend):
    """Extracts nothing. Never fails."""

    name = "stub"

    def extract(self, document: SourceDocument) -> OCRExtraction:
        logger.warning(
            "ocr backend 'stub' returns no text; set OCR_BACKEND to a real "
            "backend (document_id=%s)",
            document.document_id,
        )
        return OCRExtraction(
            text="",
            page_count=0,
            mean_confidence=0.0,
            language=None,
            tables=[],
            backend=self.name,
            metadata={"stub": True, "uri": document.uri},
        )
