"""Error taxonomy shared by the task, source and OCR-backend layers.

Lives outside `app.tasks` so the lower layers can raise these without
importing anything Celery-aware.
"""


class AgentError(Exception):
    """A permanent failure. Retrying will not help, so the task fails."""


class TransientAgentError(AgentError):
    """A temporary failure (network blip, upstream 503, throttling).

    Only this class triggers Celery's automatic retry: retrying a malformed
    document or a missing file would just burn the retry budget.
    """


class BackendConfigurationError(AgentError):
    """A backend is selected but not usable: missing dependency or credentials.

    Permanent by design. A misconfigured worker will not fix itself between
    retries, and failing fast makes the cause obvious in the logs.
    """
