"""Parser for the raw Zoom recording-info JSON (``/nws/recording/1.0/play/info/...``).

Whitelist port of Kitzur's ``filterPayload``: only the fields named here are read,
so signed CloudFront URLs, access ids and any field Zoom adds later are dropped
by construction instead of by a blacklist.
"""

import json
from typing import Any

from app.importers.common import (
    RawSegment,
    RawTranscript,
    TranscriptError,
    hms_to_sec,
    parse_loose_date,
)


def _segment(item: Any) -> RawSegment | None:
    """Read one ``transcriptList`` entry, keeping only ts, end_ts, username and text.

    Args:
        item: One list entry of unknown shape.

    Returns:
        A raw segment, or None if the entry lacks text or a valid start time.
    """
    if not isinstance(item, dict) or not isinstance(item.get("text"), str):
        return None
    try:
        start = hms_to_sec(str(item.get("ts", "")))
    except TranscriptError:
        return None
    try:
        end = hms_to_sec(str(item.get("end_ts", item.get("ts"))))
    except TranscriptError:
        end = start
    name = item.get("username") if isinstance(item.get("username"), str) else None
    return RawSegment(start, end, name, item["text"])


def parse(text: str) -> RawTranscript:
    """Parse a Zoom recording-info response.

    Args:
        text: File content.

    Returns:
        Raw transcript with topic, date and duration from ``result.meet``.

    Raises:
        TranscriptError: If the JSON is invalid or has no ``result.transcriptList``.
    """
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise TranscriptError(f"invalid JSON: {exc.msg}") from None

    result = payload.get("result") if isinstance(payload, dict) else None
    items = result.get("transcriptList") if isinstance(result, dict) else None
    if not isinstance(items, list) or not items:
        raise TranscriptError("JSON has no result.transcriptList")

    meet = result.get("meet") if isinstance(result.get("meet"), dict) else {}
    topic = meet.get("topic") if isinstance(meet.get("topic"), str) else None
    started = meet.get("meetingStartTimeStr")
    duration = result.get("duration")

    # Extract the segments from the items, and create a RawTranscript object with the segments,
    # title, held_on, and duration.
    return RawTranscript(
        segments=[seg for item in items if (seg := _segment(item)) is not None],
        title=topic,
        held_on=parse_loose_date(started if isinstance(started, str) else None),
        duration_sec=float(duration) if isinstance(duration, int | float) else None,
    )
