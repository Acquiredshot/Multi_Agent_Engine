"""FastAPI dispatch layer.

Referenced by the api service as ``app.main:app``.
"""

import base64
import json
import logging
import urllib.error
import urllib.request

import redis as redis_lib
from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

# Imported for its side effects (custom metrics on the default registry) and
# used by the in-flight request middleware below. Aliased because `app` is
# already bound to the FastAPI instance by the time the middleware runs.
from app import metrics as metrics_module

from app import __version__
from app.celery_app import celery_app
from app.config import settings
from app.dispatch import get_status, submit
from app.models import (
    ComponentStatus,
    DocumentRequest,
    ErrorResponse,
    HealthResponse,
    MonitoringStatusResponse,
    TaskSubmitResponse,
    TaskStatusResponse,
    WorkerStatus,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    debug=settings.debug,
)

# CORS: the local Vite dev server talks through the Vite proxy (same origin),
# but direct browser access to the API needs an explicit allowlist. Origins
# are configurable via CORS_ORIGINS (comma-separated), defaulting to the Vite
# dev server. Never a wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus HTTP metrics: request count, latency histogram, in-flight gauge.
# /metrics stays at the root regardless of api_prefix (same reason as /health),
# and is excluded from its own instrumentation.
Instrumentator(
    should_group_status_codes=False,
    should_group_untemplated=True,
    excluded_handlers=["/metrics", "/health"],
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.middleware("http")
async def track_inflight_requests(request, call_next):
    """Keep the http_requests_inprogress gauge in sync with live requests."""
    metrics_module.http_requests_inprogress.labels(request.method).inc()
    try:
        return await call_next(request)
    finally:
        metrics_module.http_requests_inprogress.labels(request.method).dec()

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


def _redis_status() -> ComponentStatus:
    """Ping the Celery result backend (Redis) with a short timeout."""
    try:
        client = redis_lib.Redis.from_url(
            settings.result_backend_url,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            ok = bool(client.ping())
        finally:
            client.close()
        return ComponentStatus(
            status="ok" if ok else "error",
            detail="PONG" if ok else "no PONG from redis",
        )
    except Exception as exc:
        return ComponentStatus(status="error", detail=str(exc))


def _worker_statuses() -> dict[str, WorkerStatus]:
    """Infer per-worker liveness from RabbitMQ's management API.

    Each agent worker holds a consumer on its own queue, so a connected
    consumer on queue X means worker X is up — no worker-side heartbeat code
    required. Falls back to "unknown" (never "ok") if the management API is
    unreachable.
    """
    queue_by_agent = {
        "ocr": settings.queue_ocr,
        "compliance": settings.queue_compliance,
        "anomaly": settings.queue_anomaly,
    }
    unknown = {
        agent: WorkerStatus(status="unknown", detail="rabbitmq management API unreachable")
        for agent in queue_by_agent
    }

    try:
        password = settings.resolved_rabbitmq_password
        credentials = base64.b64encode(
            f"{settings.rabbitmq_user}:{password}".encode("utf-8")
        ).decode("ascii")
        request = urllib.request.Request(
            f"http://{settings.rabbitmq_host}:15672/api/queues",
            headers={"Authorization": f"Basic {credentials}"},
        )
        with urllib.request.urlopen(request, timeout=3) as response:
            queues = json.load(response)
    except Exception as exc:
        logger.warning("rabbitmq management API unavailable: %s", exc)
        return unknown

    consumers_by_queue = {
        q.get("name"): q.get("consumers", 0) for q in queues if isinstance(q, dict)
    }
    result: dict[str, WorkerStatus] = {}
    for agent, queue in queue_by_agent.items():
        consumers = consumers_by_queue.get(queue, 0)
        if consumers > 0:
            result[agent] = WorkerStatus(
                status="ok",
                detail=f"{consumers} consumer(s) on queue '{queue}'",
            )
        else:
            result[agent] = WorkerStatus(
                status="idle",
                detail=f"no consumer on queue '{queue}'",
            )
    return result


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


@app.get("/monitoring/status", response_model=MonitoringStatusResponse, tags=["ops"])
def monitoring_status() -> MonitoringStatusResponse:
    """Live health of the API, broker, Redis and agent workers.

    Intended for the System Health page. Worker status is inferred from
    RabbitMQ consumers (see ``_worker_statuses``); the response is always
    JSON-serialisable and never includes credentials.
    """
    broker_ok = _broker_reachable()
    return MonitoringStatusResponse(
        api=ComponentStatus(status="ok", detail=f"{settings.app_name} v{__version__}"),
        rabbitmq=ComponentStatus(
            status="ok" if broker_ok else "error",
            detail="broker reachable" if broker_ok else "broker unreachable",
        ),
        redis=_redis_status(),
        workers=_worker_statuses(),
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