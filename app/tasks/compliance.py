"""Compliance agent: evaluates rules against a document."""

import logging
from typing import Any, Optional

from app.celery_app import celery_app
from app.models import ComplianceResult, DocumentRequest, OCRResult
from app.tasks.base import TASK_DEFAULTS

logger = logging.getLogger(__name__)


@celery_app.task(name="compliance.check_compliance", **TASK_DEFAULTS)
def check_compliance(
    self,
    ocr_result: Optional[dict[str, Any]],
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Run the compliance rule set over a document.

    Args:
        ocr_result: A serialised `OCRResult` when running in pipeline mode,
            where Celery prepends the upstream OCR output. `None` in fan-out
            mode, where this agent runs independently of OCR.
        payload: A serialised `DocumentRequest`.

    Returns:
        A serialised `ComplianceResult`.
    """
    request = DocumentRequest.model_validate(payload)
    ocr = OCRResult.model_validate(ocr_result) if ocr_result else None
    logger.info(
        "compliance.check_compliance start document_id=%s has_ocr=%s attempt=%d",
        request.document_id,
        ocr is not None,
        self.request.retries + 1,
    )

    # TODO: implement. Evaluate the rule set against ocr.text (falling back to
    # fetching request.source_uri when ocr is None) and append a
    # ComplianceFinding per violation.
    logger.warning(
        "compliance.check_compliance is a stub; reporting pass for document_id=%s",
        request.document_id,
    )
    result = ComplianceResult(
        document_id=request.document_id,
        passed=True,
        findings=[],
        rules_evaluated=0,
    )

    return result.model_dump(mode="json")
