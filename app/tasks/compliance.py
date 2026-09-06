"""Compliance agent: evaluates rules against a document."""

import logging
from typing import Any, Optional

from app.agents.langgraph_agents import run_compliance_agent
from app.celery_app import celery_app
from app.models import ComplianceResult, DocumentRequest, OCRResult
from app.tasks.base import TASK_DEFAULTS

logger = logging.getLogger(__name__)


def run_compliance_task(request: DocumentRequest, ocr: Optional[OCRResult]) -> ComplianceResult:
    """Execute the compliance workflow for a document."""
    return run_compliance_agent(request, ocr)


run_compliance_agent_task = run_compliance_task


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

    result = run_compliance_task(request, ocr)
    logger.info(
        "compliance.check_compliance completed document_id=%s findings=%d passed=%s",
        request.document_id,
        len(result.findings),
        result.passed,
    )
    return result.model_dump(mode="json")
