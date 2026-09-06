"""Prometheus metrics for the Multi-Agent Engine.

Two families of metrics live here:

* **Application metrics** (``mae_documents_*``, ``mae_task_*``,
  ``mae_agent_tasks_total``): created at import time, so they exist in every
  process that imports the app (API and workers). The API increments the
  submission counters; the workers increment the execution counters. Because
  unincremented copies read as 0, ``sum()`` across all scrape targets stays
  correct.

* **Worker metrics** (``mae_worker_*``, ``mae_active_tasks``): updated from
  Celery signals inside worker processes only. Each prefork child process
  exports its own registry on a dedicated HTTP port so Prometheus can scrape
  per-worker data without a push gateway.

No task_id / document_id / source_uri labels are ever used — the label set is
bounded to the agent name.
"""

import logging
import os
import re
import time
from multiprocessing import current_process

from celery.signals import task_postrun, task_prerun, worker_process_init
from prometheus_client import Counter, Gauge, Histogram, start_http_server

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application metrics (API + workers)
# ---------------------------------------------------------------------------

# Standard-name gauge for in-flight HTTP requests. This instrumentator
# version does not ship one, so it is maintained by a small ASGI middleware
# in app/main.py.
http_requests_inprogress = Gauge(
    "http_requests_inprogress",
    "HTTP requests currently being processed by the API.",
    ["method"],
)

documents_submitted = Counter(
    "mae_documents_submitted_total",
    "Documents accepted by POST /documents.",
)
documents_processed = Counter(
    "mae_documents_processed_total",
    "Documents whose aggregate task completed successfully.",
)
documents_failed = Counter(
    "mae_documents_failed_total",
    "Documents whose aggregate task failed.",
)
task_processing_seconds = Histogram(
    "mae_task_processing_seconds",
    "End-to-end document processing time (dispatch to aggregate completion).",
    buckets=(1, 5, 10, 30, 60, 120, 300, 600, 1200),
)
agent_tasks_total = Counter(
    "mae_agent_tasks_total",
    "Agent tasks requested at dispatch time.",
    ["agent"],
)

# ---------------------------------------------------------------------------
# Worker metrics (updated by Celery signals; exported per worker process)
# ---------------------------------------------------------------------------

worker_tasks_started = Counter(
    "mae_worker_tasks_started_total",
    "Agent task executions started in this worker process.",
    ["agent"],
)
worker_tasks_completed = Counter(
    "mae_worker_tasks_completed_total",
    "Agent task executions that completed successfully.",
    ["agent"],
)
worker_tasks_failed = Counter(
    "mae_worker_tasks_failed_total",
    "Agent task executions that failed.",
    ["agent"],
)
worker_task_duration_seconds = Histogram(
    "mae_worker_task_duration_seconds",
    "Agent task execution duration.",
    ["agent"],
    buckets=(1, 2, 5, 10, 30, 60, 120, 300, 600),
)
active_tasks = Gauge(
    "mae_active_tasks",
    "Agent tasks currently executing in this worker process.",
    ["agent"],
)

# Task name -> agent label. Anything unmapped is ignored (e.g. internal celery
# bookkeeping), keeping the label cardinality bounded.
_AGENT_BY_TASK = {
    "ocr.extract_text": "ocr",
    "compliance.check_compliance": "compliance",
    "anomaly.detect_anomalies": "anomaly",
    "aggregate.collect": "aggregate",
    "aggregate.passthrough": "aggregate",
}

# monotonic start times keyed by task id, so postrun can measure duration even
# if a retry re-enters prerun.
_starts: dict[str, float] = {}


def _agent_for(task) -> str | None:
    return _AGENT_BY_TASK.get(task.name)


@task_prerun.connect
def _on_task_prerun(task_id, task, *args, **kwargs) -> None:
    agent = _agent_for(task)
    if agent is None:
        return
    worker_tasks_started.labels(agent).inc()
    active_tasks.labels(agent).inc()
    _starts[task_id] = time.monotonic()


@task_postrun.connect
def _on_task_postrun(task_id, task, state, *args, **kwargs) -> None:
    agent = _agent_for(task)
    if agent is None:
        return
    active_tasks.labels(agent).dec()
    start = _starts.pop(task_id, None)
    if start is not None:
        worker_task_duration_seconds.labels(agent).observe(time.monotonic() - start)
    if state == "SUCCESS":
        worker_tasks_completed.labels(agent).inc()
    elif state == "FAILURE":
        worker_tasks_failed.labels(agent).inc()
    # RETRY is neither completed nor failed; the retried attempt re-enters
    # through task_prerun, so the gauge stays balanced.


@worker_process_init.connect
def _on_worker_process_init(**kwargs) -> None:
    """Export this prefork child's metrics on its own HTTP port.

    Celery names prefork children ``ForkPoolWorker-1..N``; each child gets
    ``base_port + index`` (default base 8001). Prometheus is configured with
    the resulting targets (see monitoring/prometheus/prometheus.yml), so no
    push gateway is required. Only children export — the main worker process
    never executes tasks, and the API process never fires these signals.
    """
    name = current_process().name
    match = re.match(r"^ForkPoolWorker-(\d+)$", name)
    if not match:
        return
    base = int(os.environ.get("PROMETHEUS_METRICS_PORT", "8001"))
    port = base + int(match.group(1))
    try:
        start_http_server(port)
        logger.info("worker metrics server listening on :%d (%s)", port, name)
    except OSError:
        logger.warning("could not bind worker metrics port %d (%s)", port, name)