"""Anomaly agent: scores a document for statistical outliers."""

import logging
from typing import Any, Optional

from app.celery_app import celery_app
from app.models import AnomalyResult, DocumentRequest, OCRResult
from app.tasks.base import TASK_DEFAULTS

logger = logging.getLogger(__name__)


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

    # TODO: implement. Score ocr.text / document features and record a reason
    # string per contributing signal.
    logger.warning(
        "anomaly.detect_anomalies is a stub; reporting score 0.0 for document_id=%s",
        request.document_id,
    )
    result = AnomalyResult(
        document_id=request.document_id,
        anomaly_score=0.0,
        is_anomalous=False,
        reasons=[],
    )

    return result.model_dump(mode="json")
