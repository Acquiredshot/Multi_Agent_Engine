"""Translates a DocumentRequest into a Celery canvas, and reads status back.

Kept separate from the HTTP layer so the routing rules can be tested without
a running API.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from celery import chain, chord, group
from celery.result import AsyncResult

from app import metrics
from app.celery_app import celery_app
from app.models import AgentName, DocumentRequest, TaskState, TaskStatusResponse
from app.tasks.aggregate import collect, passthrough
from app.tasks.anomaly import detect_anomalies
from app.tasks.compliance import check_compliance
from app.tasks.ocr import extract_text

logger = logging.getLogger(__name__)

# Agents that can consume OCR output, and therefore run after it in pipeline
# mode. OCR itself is handled separately as the pipeline head.
_POST_OCR_TASKS = {
    AgentName.COMPLIANCE: check_compliance,
    AgentName.ANOMALY: detect_anomalies,
}


def _build_canvas(request: DocumentRequest):
    """Assemble the Celery canvas for a request.

    Pipeline mode chains OCR ahead of a chord of the remaining agents, so they
    all receive the OCR output. Fan-out mode puts every agent in one chord
    header. Either shape terminates in `aggregate.collect`, so the caller gets
    exactly one task id to poll.
    """
    payload = request.model_dump(mode="json")
    # Preserve caller order while dropping duplicates.
    agents = list(dict.fromkeys(request.agents))
    post_ocr = [a for a in agents if a in _POST_OCR_TASKS]
    has_ocr = AgentName.OCR in agents
    # Stamped at dispatch so the aggregate task can measure end-to-end
    # processing duration. Extra keys are ignored by DocumentRequest validation.
    payload["_submitted_at"] = datetime.now(timezone.utc).isoformat()
    submitted_at = payload["_submitted_at"]

    if request.pipeline and has_ocr:
        head = extract_text.s(payload)
        if not post_ocr:
            return chain(head, collect.s(request.document_id, submitted_at))
        # Celery prepends the OCR result to each header task's arguments.
        # `passthrough` carries that OCR result into the chord body, which
        # otherwise only sees the results of its own header.
        header = [passthrough.s()]
        header += [_POST_OCR_TASKS[a].s(payload) for a in post_ocr]
        return chain(
            head,
            chord(group(header), collect.s(request.document_id, submitted_at)),
        )

    if request.pipeline and not has_ocr:
        logger.info(
            "pipeline requested without the ocr agent; falling back to fan-out "
            "document_id=%s",
            request.document_id,
        )

    header = [extract_text.s(payload)] if has_ocr else []
    # No upstream OCR result to prepend here, so pass None explicitly.
    header += [_POST_OCR_TASKS[a].s(None, payload) for a in post_ocr]
    return chord(group(header), collect.s(request.document_id, submitted_at))


def submit(request: DocumentRequest) -> str:
    """Enqueue a request and return the id of its terminal task."""
    canvas = _build_canvas(request)
    result = canvas.apply_async()

    # Application metrics: count accepted documents and per-agent work.
    metrics.documents_submitted.inc()
    for agent in dict.fromkeys(request.agents):
        metrics.agent_tasks_total.labels(agent.value).inc()

    logger.info(
        "dispatched document_id=%s task_id=%s agents=%s pipeline=%s",
        request.document_id,
        result.id,
        [a.value for a in request.agents],
        request.pipeline,
    )
    return result.id


def _to_task_state(raw: str) -> TaskState:
    """Map a Celery state onto the API's enum, defaulting to PENDING.

    Celery reports PENDING for ids it has never seen, and custom states can be
    introduced by task code; neither should 500 the status endpoint.
    """
    try:
        return TaskState(raw)
    except ValueError:
        logger.warning("unmapped celery state %r; reporting PENDING", raw)
        return TaskState.PENDING


def get_status(task_id: str) -> TaskStatusResponse:
    """Read the current state of a dispatched task."""
    async_result: AsyncResult = celery_app.AsyncResult(task_id)
    state = _to_task_state(async_result.state)

    payload: Optional[Any] = None
    error: Optional[str] = None
    successful: Optional[bool] = None

    if async_result.ready():
        successful = async_result.successful()
        if successful:
            payload = async_result.result
        else:
            # On failure `result` holds the exception (or a traceback string
            # for a revoked task), which is not JSON-serialisable.
            error = str(async_result.result) or state.value

    return TaskStatusResponse(
        task_id=task_id,
        state=state,
        ready=async_result.ready(),
        successful=successful,
        result=payload,
        error=error,
    )
