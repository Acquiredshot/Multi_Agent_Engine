"""Anomaly agent: scores a document for statistical outliers."""

import logging
from typing import Any, Optional

from app.agents.langgraph_agents import run_anomaly_agent
from app.celery_app import celery_app
from app.models import AnomalyResult, DocumentRequest, OCRResult
from app.tasks.base import TASK_DEFAULTS

logger = logging.getLogger(__name__)


def run_anomaly_task(request: DocumentRequest, ocr: Optional[OCRResult]) -> AnomalyResult:
    """Execute the anomaly workflow for a document."""
    return run_anomaly_agent(request, ocr)


run_anomaly_agent_task = run_anomaly_task


@celery_app.task(name="anomaly.detect_anomalies", **TASK_DEFAULTS)
def detect_anomalies(
    self,
    ocr_result: Optional[dict[str, Any]],
    payload: dict[str, Any],
) -> dict[str, Any]:
    """Score a document for anomalies.

    Args:
        ocr_result: A serialised `OCRResult` when running in pipeline mode,
            where Celery prepends the upstream OCR output. `None` in fan-out
            mode, where this agent runs independently of OCR.
        payload: A serialised `DocumentRequest`.

    Returns:
        A serialised `AnomalyResult`.
    """
    request = DocumentRequest.model_validate(payload)
    ocr = OCRResult.model_validate(ocr_result) if ocr_result else None
    logger.info(
        "anomaly.detect_anomalies start document_id=%s has_ocr=%s attempt=%d",
        request.document_id,
        ocr is not None,
        self.request.retries + 1,
    )

    result = run_anomaly_task(request, ocr)
    logger.info(
        "anomaly.detect_anomalies completed document_id=%s score=%.4f anomalous=%s",
        request.document_id,
        result.anomaly_score,
        result.is_anomalous,
    )
    return result.model_dump(mode="json")
