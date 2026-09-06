"""Terminal task that merges agent results into one payload.

Every dispatch ends here, which is what gives the API a single task id to
track regardless of whether the agents ran chained or fanned out.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional, Union

from app import metrics
from app.celery_app import celery_app
from app.models import AgentName

logger = logging.getLogger(__name__)

# Each agent result is identified by a field only that agent produces, so the
# merge does not depend on the order the results arrive in.
_DISCRIMINATORS: dict[str, AgentName] = {
    "page_count": AgentName.OCR,
    "rules_evaluated": AgentName.COMPLIANCE,
    "anomaly_score": AgentName.ANOMALY,
}


@celery_app.task(name="aggregate.passthrough")
def passthrough(result: Any) -> Any:
    """Return the upstream result unchanged.

    In pipeline mode the chord body only receives its own header's results, so
    the OCR output from the chain head would be dropped from the merge. Adding
    this to the header carries it through as a header result.
    """
    return result


@celery_app.task(name="aggregate.collect")
def collect(
    results: Union[list[Any], dict[str, Any], None],
    document_id: str,
    submitted_at: Optional[str] = None,
) -> dict[str, Any]:
    """Merge the upstream agent results into a single response body.

    Args:
        results: A list of serialised agent results when this runs as a chord
            body, or a single result when only one agent ran ahead of it.
        document_id: The document these results belong to.
        submitted_at: ISO timestamp stamped by dispatch.py, used to measure
            end-to-end processing duration. Optional for backward compatibility.

    Returns:
        A dict keyed by agent name, plus the document id and completion time.
    """
    try:
        return _collect_impl(results, document_id, submitted_at)
    except Exception:
        # The task will be marked FAILURE; count the failed document here so
        # the application metric lives next to its success counterpart.
        metrics.documents_failed.inc()
        raise


def _collect_impl(
    results: Union[list[Any], dict[str, Any], None],
    document_id: str,
    submitted_at: Optional[str] = None,
) -> dict[str, Any]:
    """Merge logic for ``aggregate.collect`` (see the task docstring)."""
    # A one-task chain hands over the bare result rather than a list.
    if results is None:
        results = []
    elif isinstance(results, dict):
        results = [results]

    merged: dict[str, Any] = {
        "document_id": document_id,
        "agents": {},
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }

    for item in results:
        if not isinstance(item, dict):
            logger.warning(
                "aggregate.collect skipping non-dict result document_id=%s type=%s",
                document_id,
                type(item).__name__,
            )
            continue

        agent = next(
            (name for field, name in _DISCRIMINATORS.items() if field in item),
            None,
        )
        if agent is None:
            logger.warning(
                "aggregate.collect unrecognised result document_id=%s keys=%s",
                document_id,
                sorted(item),
            )
            continue
        merged["agents"][agent.value] = item

    logger.info(
        "aggregate.collect done document_id=%s agents=%s",
        document_id,
        sorted(merged["agents"]),
    )

    # Application metrics: one processed document per successful aggregate.
    metrics.documents_processed.inc()
    if submitted_at:
        try:
            submitted = datetime.fromisoformat(submitted_at)
            metrics.task_processing_seconds.observe(
                max((datetime.now(timezone.utc) - submitted).total_seconds(), 0.0)
            )
        except ValueError:
            logger.warning(
                "aggregate.collect unparseable submitted_at=%r document_id=%s",
                submitted_at,
                document_id,
            )
    return merged
