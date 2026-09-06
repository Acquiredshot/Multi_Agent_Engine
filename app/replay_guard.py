"""Celery/RabbitMQ replay-guard helpers.

RabbitMQ adds an `x-death` header when a message is requeued via a dead-letter
exchange or dead-letter queue. This helper inspects that header and stops the
message from re-entering the workflow after a bounded number of replays.
"""

from __future__ import annotations

from typing import Any, Mapping


def check_death_count(request_headers: Mapping[str, Any] | None, max_replays: int = 2) -> None:
    """Reject messages that have exceeded the configured replay limit.

    RabbitMQ's `x-death` header is a list of event dicts; the first entry is the
    most recent dead-letter event and includes the `count` field that tells us how
    many times the message has been dead-lettered.
    """
    if not request_headers or "x-death" not in request_headers:
        return

    deaths = request_headers.get("x-death")
    if not deaths:
        return

    try:
        death_count = deaths[0]["count"]
    except (TypeError, KeyError, IndexError):
        return

    if death_count > max_replays:
        raise Exception("Poison Pill Detected: Exceeded maximum DLQ replay count.")
