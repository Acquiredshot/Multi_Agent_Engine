import pytest

from app.replay_guard import check_death_count


def test_check_death_count_allows_normal_traffic():
    headers = {"x-death": [{"count": 1}, {"count": 2}]}

    check_death_count(headers, max_replays=2)


def test_check_death_count_raises_on_replay_loop():
    headers = {"x-death": [{"count": 3}]}

    with pytest.raises(Exception, match="Poison Pill Detected"):
        check_death_count(headers, max_replays=2)


def test_check_death_count_ignores_missing_headers():
    check_death_count({})
    check_death_count(None)
