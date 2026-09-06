"""Pydantic schemas for request/response validation."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AgentName(str, Enum):
    """The agents this engine can dispatch work to."""

    OCR = "ocr"
    COMPLIANCE = "compliance"
    ANOMALY = "anomaly"


class TaskState(str, Enum):
    """Normalised task states exposed by the API.

    These mirror Celery's own states so callers never have to know about
    Celery specifics.
    """

    PENDING = "PENDING"
    STARTED = "STARTED"
    RETRY = "RETRY"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    REVOKED = "REVOKED"


# --------------------------------------------------------------------------
# Requests
# --------------------------------------------------------------------------


class DocumentRequest(BaseModel):
    """A document submitted for analysis."""

    document_id: str = Field(..., min_length=1, max_length=128)
    source_uri: str = Field(
        ...,
        min_length=1,
        description="Where the document lives (s3://, file://, https://...).",
    )
    content_type: str = Field(default="application/pdf")
    agents: list[AgentName] = Field(
        default_factory=lambda: [AgentName.OCR, AgentName.COMPLIANCE, AgentName.ANOMALY],
        min_length=1,
        description="Which agents to run. Defaults to the full pipeline.",
    )
    pipeline: bool = Field(
        default=True,
        description=(
            "Run agents as a chained pipeline (OCR output feeds the rest). "
            "Set false to fan them out independently."
        ),
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


# --------------------------------------------------------------------------
# Agent results
# --------------------------------------------------------------------------


class OCRTable(BaseModel):
    """A table recovered from a document, as a rectangular grid of cell text."""

    page: int = Field(default=1, ge=1)
    row_count: int = Field(default=0, ge=0)
    column_count: int = Field(default=0, ge=0)
    mean_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    rows: list[list[str]] = Field(default_factory=list)


class OCRResult(BaseModel):
    """Text extracted from a document."""

    document_id: str
    page_count: int = Field(ge=0)
    text: str = ""
    mean_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    language: Optional[str] = None
    # Empty for backends without table support. Defaulted, so older callers
    # and stored results stay valid.
    tables: list[OCRTable] = Field(default_factory=list)


class ComplianceFinding(BaseModel):
    """A single rule violation or flag raised by the compliance agent."""

    rule_id: str
    severity: str = Field(default="low", pattern="^(low|medium|high|critical)$")
    message: str
    page: Optional[int] = None


class ComplianceResult(BaseModel):
    """Outcome of a compliance sweep over a document."""

    document_id: str
    passed: bool
    findings: list[ComplianceFinding] = Field(default_factory=list)
    rules_evaluated: int = Field(default=0, ge=0)


class AnomalyResult(BaseModel):
    """Outcome of anomaly detection over a document."""

    document_id: str
    anomaly_score: float = Field(ge=0.0, le=1.0)
    is_anomalous: bool
    reasons: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------
# Responses
# --------------------------------------------------------------------------


class TaskSubmitResponse(BaseModel):
    """Returned immediately when work is accepted onto a queue."""

    task_id: str
    document_id: str
    agents: list[AgentName]
    state: TaskState = TaskState.PENDING
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskStatusResponse(BaseModel):
    """Current state of a submitted task, plus its result once finished."""

    task_id: str
    state: TaskState
    ready: bool = False
    successful: Optional[bool] = None
    result: Optional[Any] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Liveness / dependency check payload."""

    status: str = "ok"
    app: str
    version: str
    broker_reachable: bool
    # Which OCR strategy this deployment is running. Worth surfacing: a
    # production box silently left on "stub" would extract nothing.
    ocr_backend: str = "unknown"
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ErrorResponse(BaseModel):
    """Uniform error envelope."""

    detail: str
    code: Optional[str] = None


class ComponentStatus(BaseModel):
    """Health of one infrastructure component (api, broker, redis)."""

    status: str
    detail: Optional[str] = None


class WorkerStatus(BaseModel):
    """Health of one agent worker, inferred from its RabbitMQ consumers."""

    status: str
    detail: Optional[str] = None


class MonitoringStatusResponse(BaseModel):
    """Consolidated health for the monitoring page / System Health frontend.

    Built from live checks (broker ping, redis ping, RabbitMQ management API)
    rather than Prometheus, so the frontend never needs to query Prometheus
    directly.
    """

    api: ComponentStatus
    rabbitmq: ComponentStatus
    redis: ComponentStatus
    workers: dict[str, WorkerStatus]
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
