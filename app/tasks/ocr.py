"""OCR agent: turns a source document into text.

Runs first in pipeline mode; its output is fed to the other agents.

The extraction itself is delegated to whichever `OCRBackend` is configured, so
this task holds no vendor-specific logic. See `app/ocr/` for the strategies.
"""

import logging
from typing import Any

from app.celery_app import celery_app
from app.models import DocumentRequest, OCRResult, OCRTable
from app.ocr import get_ocr_backend
from app.sources import SourceDocument
from app.tasks.base import TASK_DEFAULTS

logger = logging.getLogger(__name__)


@celery_app.task(name="ocr.extract_text", **TASK_DEFAULTS)
def extract_text(self, payload: dict[str, Any]) -> dict[str, Any]:
    """Extract text from the document described by `payload`.

    Args:
        payload: A serialised `DocumentRequest`.

    Returns:
        A serialised `OCRResult`.

    Raises:
        AgentError: The document cannot be processed. Not retried.
        TransientAgentError: A retryable failure. Retried per TASK_DEFAULTS.
    """
    request = DocumentRequest.model_validate(payload)
    document = SourceDocument(
        document_id=request.document_id,
        uri=request.source_uri,
        content_type=request.content_type,
    )
    # Cached per worker process, so this is a dict lookup after the first call.
    backend = get_ocr_backend()

    logger.info(
        "ocr.extract_text start document_id=%s backend=%s scheme=%s attempt=%d",
        request.document_id,
        backend.name,
        document.scheme,
        self.request.retries + 1,
    )

    extraction = backend.extract(document)

    logger.info(
        "ocr.extract_text done document_id=%s backend=%s pages=%d chars=%d "
        "tables=%d confidence=%.3f",
        request.document_id,
        extraction.backend or backend.name,
        extraction.page_count,
        len(extraction.text),
        len(extraction.tables),
        extraction.mean_confidence,
    )

    result = OCRResult(
        document_id=request.document_id,
        page_count=extraction.page_count,
        text=extraction.text,
        mean_confidence=extraction.mean_confidence,
        language=extraction.language,
        tables=[
            OCRTable(
                page=t.page,
                row_count=t.row_count,
                column_count=t.column_count,
                mean_confidence=t.mean_confidence,
                rows=t.rows,
            )
            for t in extraction.tables
        ],
    )
    return result.model_dump(mode="json")
