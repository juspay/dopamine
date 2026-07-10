import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import collect_metadata as cm  # noqa: E402


class FakeMedia:
    def __init__(self, pk):
        self.pk = pk


def test_fetch_kwargs_cold_start_is_full():
    assert cm._fetch_kwargs(None, 200, False) == {"amount": 0, "last_media_pk": 0}


def test_fetch_kwargs_incremental_uses_cursor_and_cap():
    assert cm._fetch_kwargs("123", 200, False) == {"amount": 200, "last_media_pk": 123}


def test_fetch_kwargs_force_full_ignores_cursor():
    assert cm._fetch_kwargs("123", 200, True) == {"amount": 0, "last_media_pk": 0}


def test_next_cursor_uses_head_when_nonempty():
    assert cm._next_cursor([FakeMedia(9), FakeMedia(8)], "1") == "9"


def test_next_cursor_keeps_old_when_empty():
    assert cm._next_cursor([], "1") == "1"
