"""Pluggable OCR strategies.

The ocr agent depends only on this package's public surface, never on a
specific vendor:

    from app.ocr import get_ocr_backend
    extraction = get_ocr_backend().extract(document)

Selection is driven by `settings.ocr_backend` (`OCR_BACKEND` in the
environment). See `registry.BACKENDS` for the registered names.
"""

from app.ocr.base import OCRBackend, OCRExtraction
from app.ocr.registry import BACKENDS, available_backends, get_ocr_backend

__all__ = [
    "BACKENDS",
    "OCRBackend",
    "OCRExtraction",
    "available_backends",
    "get_ocr_backend",
]
