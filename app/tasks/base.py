"""Shared task plumbing: the retry policy applied to every agent task."""

from app.config import settings
from app.errors import AgentError, BackendConfigurationError, TransientAgentError

# Re-exported so task modules can import the error taxonomy from one place.
__all__ = [
    "AgentError",
    "BackendConfigurationError",
    "TransientAgentError",
    "TASK_DEFAULTS",
]


# Applied to every agent task. `bind=True` means each task's first parameter
# is `self`.
TASK_DEFAULTS = {
    "bind": True,
    "autoretry_for": (TransientAgentError,),
    "max_retries": settings.task_max_retries,
    "retry_backoff": settings.task_retry_backoff_s,
    "retry_backoff_max": 600,
    "retry_jitter": True,
}
