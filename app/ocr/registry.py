"""Backend selection: name -> implementation.

Imports are deferred until a backend is actually requested, so an image built
for Tesseract does not need boto3 and vice versa. That is what makes the
production swap a matter of configuration plus the right dependency layer.
"""

import importlib
import logging
from functools import lru_cache
from typing import Optional

from app.config import settings
from app.errors import AgentError
from app.ocr.base import OCRBackend

logger = logging.getLogger(__name__)

# name -> "module:ClassName". Add an entry to register a new strategy; nothing
# else in the codebase needs to change.
BACKENDS: dict[str, str] = {
    "stub": "app.ocr.stub:StubBackend",
    "tesseract": "app.ocr.tesseract:TesseractBackend",
    "textract": "app.ocr.textract:TextractBackend",
}


def available_backends() -> list[str]:
    """Registered backend names, for error messages and diagnostics."""
    return sorted(BACKENDS)


@lru_cache(maxsize=None)
def get_ocr_backend(name: Optional[str] = None) -> OCRBackend:
    """Return the configured backend instance.

    Cached per process: backends may hold an SDK client, and rebuilding one per
    task would add a connection setup to every document.

    Args:
        name: Override the configured backend. Used by tests.

    Raises:
        AgentError: `name` is not a registered backend.
        BackendConfigurationError: The backend is registered but not usable.
    """
    resolved = (name or settings.ocr_backend or "stub").strip().lower()
    try:
        target = BACKENDS[resolved]
    except KeyError:
        raise AgentError(
            f"unknown OCR backend {resolved!r}; available: {available_backends()}"
        ) from None

    module_path, _, class_name = target.partition(":")
    module = importlib.import_module(module_path)
    backend: OCRBackend = getattr(module, class_name)()
    # Surface configuration problems now rather than on the first document.
    backend.check_ready()
    logger.info("ocr backend ready: %s", backend)
    return backend
