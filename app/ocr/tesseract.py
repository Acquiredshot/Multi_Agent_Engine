"""Local Tesseract backend, for development.

Rasterises PDFs with pdf2image/poppler, then runs pytesseract per page. Needs
system packages (`tesseract-ocr`, `poppler-utils`) as well as the Python
dependencies in requirements-tesseract.txt; build the image with
`OCR_BACKEND=tesseract` to get both.
"""

import logging
from typing import Any

from app.config import settings
from app.errors import AgentError, BackendConfigurationError, TransientAgentError
from app.ocr.base import OCRBackend, OCRExtraction
from app.sources import SourceDocument

logger = logging.getLogger(__name__)


class TesseractBackend(OCRBackend):
    """Extracts text locally via Tesseract."""

    name = "tesseract"
    # Everything is rasterised locally, so any fetchable scheme works.
    supported_schemes = frozenset({"file", "http", "https", "s3"})

    def check_ready(self) -> None:
        try:
            import pytesseract
        except ImportError as exc:
            raise BackendConfigurationError(
                "tesseract backend needs pytesseract: "
                "pip install -r requirements-tesseract.txt"
            ) from exc
        try:
            version = pytesseract.get_tesseract_version()
        except Exception as exc:
            # Python package present, system binary missing.
            raise BackendConfigurationError(
                "the tesseract binary is not on PATH; install the "
                "tesseract-ocr system package"
            ) from exc
        logger.info("tesseract binary version %s", version)

    def extract(self, document: SourceDocument) -> OCRExtraction:
        import pytesseract
        from pytesseract import Output

        data = document.read_bytes()
        images = self._to_images(document, data)

        texts: list[str] = []
        confidences: list[float] = []
        for index, image in enumerate(images, start=1):
            try:
                page = pytesseract.image_to_data(
                    image,
                    lang=settings.tesseract_lang,
                    output_type=Output.DICT,
                    timeout=settings.tesseract_timeout_s,
                )
            except RuntimeError as exc:
                # pytesseract raises RuntimeError on timeout; a longer document
                # may well succeed on a retry with a warm cache.
                raise TransientAgentError(
                    f"tesseract timed out on page {index} of "
                    f"{document.document_id}: {exc}"
                ) from exc

            words = [w for w in page.get("text", []) if w and w.strip()]
            texts.append(" ".join(words))
            # -1 marks blocks Tesseract could not score; averaging them in
            # would drag confidence down for no reason.
            confidences.extend(
                float(c) for c in page.get("conf", []) if float(c) >= 0
            )

        mean = sum(confidences) / len(confidences) if confidences else 0.0
        return OCRExtraction(
            text="\n\n".join(t for t in texts if t),
            page_count=len(images),
            mean_confidence=self.normalise_confidence(mean),
            language=settings.tesseract_lang,
            # Tesseract has no table model. Empty, never None, so callers do
            # not branch on which backend produced the result.
            tables=[],
            backend=self.name,
            metadata={"scored_words": len(confidences), "dpi": settings.tesseract_dpi},
        )

    def _to_images(self, document: SourceDocument, data: bytes) -> list[Any]:
        """Turn document bytes into a list of PIL images, one per page."""
        if document.is_pdf_or_tiff:
            try:
                from pdf2image import convert_from_bytes
                from pdf2image.exceptions import (
                    PDFInfoNotInstalledError,
                    PDFPageCountError,
                    PDFSyntaxError,
                )
            except ImportError as exc:
                raise BackendConfigurationError(
                    "pdf sources need pdf2image: "
                    "pip install -r requirements-tesseract.txt"
                ) from exc
            try:
                return convert_from_bytes(data, dpi=settings.tesseract_dpi)
            except PDFInfoNotInstalledError as exc:
                raise BackendConfigurationError(
                    "poppler is not installed; install the poppler-utils "
                    "system package"
                ) from exc
            except (PDFPageCountError, PDFSyntaxError) as exc:
                raise AgentError(
                    f"{document.document_id} is not a readable PDF: {exc}"
                ) from exc

        try:
            import io

            from PIL import Image, UnidentifiedImageError
        except ImportError as exc:
            raise BackendConfigurationError(
                "image sources need Pillow: "
                "pip install -r requirements-tesseract.txt"
            ) from exc
        try:
            return [Image.open(io.BytesIO(data))]
        except UnidentifiedImageError as exc:
            raise AgentError(
                f"{document.document_id} is not a recognised image format"
            ) from exc
