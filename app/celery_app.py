"""Celery application: broker wiring, task routing and worker defaults.

Referenced by the worker services as ``app.celery_app.celery_app``.
"""

import logging

from celery import Celery

from app.config import settings

logging.basicConfig(level=settings.log_level)

celery_app = Celery(
    settings.app_name,
    broker=settings.broker_url,
    backend=settings.result_backend_url,
    # Explicit rather than autodiscovery: the API process imports this module
    # too, and needs every task registered to build canvases.
    include=[
        "app.tasks.ocr",
        "app.tasks.compliance",
        "app.tasks.anomaly",
        "app.tasks.aggregate",
    ],
)

celery_app.conf.update(
    # --- serialisation ---
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # --- routing ---
    # Each agent has a dedicated queue with a dedicated worker pool, so a slow
    # OCR backlog cannot starve compliance or anomaly work.
    task_default_queue=settings.queue_default,
    task_routes={
        "ocr.*": {"queue": settings.queue_ocr},
        "compliance.*": {"queue": settings.queue_compliance},
        "anomaly.*": {"queue": settings.queue_anomaly},
        "aggregate.*": {"queue": settings.queue_default},
    },
    # --- execution limits ---
    task_time_limit=settings.task_time_limit_s,
    task_soft_time_limit=settings.task_soft_time_limit_s,
    # Report STARTED instead of leaving tasks in PENDING while they run, so
    # TaskState.STARTED in the API is meaningful.
    task_track_started=True,
    # Ack after completion so a killed worker's message is redelivered rather
    # than lost. Requires tasks to be idempotent.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Long tasks: fetching a batch up front would leave messages parked behind
    # a busy worker.
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=200,
    # --- results ---
    result_expires=settings.result_expires_s,
    result_extended=True,
)

# Imported for its side effects: registers the Celery signal handlers that
# feed the worker Prometheus metrics, and the per-worker metrics HTTP servers
# (see app/metrics.py). Both the API and the workers import this module.
import app.metrics  # noqa: F401
