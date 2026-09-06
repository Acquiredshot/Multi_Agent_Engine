"""FastAPI dispatch layer.

Referenced by the api service as ``app.main:app``.
"""

import logging

from fastapi import APIRouter, FastAPI, HTTPException, status

from app import __version__
from app.celery_app import celery_app
from app.config import settings
from app.dispatch import get_status, submit
from app.models import (
    DocumentRequest,
    ErrorResponse,
    HealthResponse,
    TaskSubmitResponse,
    TaskStatusResponse,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    debug=settings.debug,
)

router = APIRouter()


def _broker_reachable() -> bool:
    """Ping the broker without blocking on a retry loop."""
    try:
        connection = celery_app.connection_for_read()
        try:
            connection.ensure_connection(max_retries=0, timeout=2)
        finally:
            connection.release()
        return True
    except Exception:
        # safe_broker_url, not broker_url: the latter embeds the password.
        logger.warning("broker unreachable at %s", settings.safe_broker_url, exc_info=True)
        return False


# Deliberately outside `router`: the container healthcheck hits /health, so it
# must not move when api_prefix is set.
# Sync def, so FastAPI runs the blocking socket check on the threadpool.
@app.get("/health", response_model=HealthResponse, tags=["ops"])
def health() -> HealthResponse:
    """Liveness plus broker reachability."""
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=__version__,
        broker_reachable=_broker_reachable(),
        ocr_backend=settings.ocr_backend,
    )


@router.post(
    "/documents",
    response_model=TaskSubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={503: {"model": ErrorResponse}},
    tags=["documents"],
)
def submit_document(request: DocumentRequest) -> TaskSubmitResponse:
    """Accept a document for analysis and return its task id."""
    try:
        task_id = submit(request)
    except Exception as exc:
        # Almost always the broker being down. Surface it as 503 rather than a
        # 500, so callers know to retry.
        logger.exception("dispatch failed document_id=%s", request.document_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"could not enqueue document: {exc}",
        ) from exc

    return TaskSubmitResponse(
        task_id=task_id,
        document_id=request.document_id,
        agents=request.agents,
    )


@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    responses={503: {"model": ErrorResponse}},
    tags=["documents"],
)
def read_task(task_id: str) -> TaskStatusResponse:
    """Report the state of a dispatched task.

    Note that an unknown task id reports PENDING rather than 404: Celery does
    not distinguish "never existed" from "not started yet".
    """
    try:
        return get_status(task_id)
    except Exception as exc:
        # Reading state touches the result backend, which raises rather than
        # reporting a state when Redis is unreachable.
        logger.exception("status lookup failed task_id=%s", task_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"could not read task status: {exc}",
        ) from exc


app.include_router(router, prefix=settings.api_prefix)
