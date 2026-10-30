"""Shared types and steps for every transcript importer.

Pipeline: format parser -> RawTranscript -> merge -> anonymize -> split long text
-> NormalizedTranscript (segments, duration, sha256).
"""

import hashlib
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date

from app.models import Segment, Speaker

MERGE_GAP_SEC = 30
MERGE_MAX_CHARS = 1500
MAX_TRANSCRIPT_CHARS = 300_000

HEBREW_MONTHS = {
    "ינואר": 1, "פברואר": 2, "מרץ": 3, "מרס": 3, "אפריל": 4, "מאי": 5, "יוני": 6,
    "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
}  # fmt: skip
ENGLISH_MONTHS = {
    m: i
    for i, m in enumerate(
        ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"), 1
    )
}


class TranscriptError(ValueError):
    """The file was read but does not contain a usable transcript (HTTP 422)."""


class UnsupportedFormatError(TranscriptError):
    """The file type is not one of the supported transcript formats (HTTP 415)."""


@dataclass
class RawSegment:
    """One block as found in the file, before anonymization."""

    start_sec: float
    end_sec: float
    name: str | None
    text: str


@dataclass
class RawTranscript:
    """Parser output: optional metadata plus raw blocks in file order."""

    segments: list[RawSegment]
    title: str | None = None
    held_on: date | None = None
    duration_sec: float | None = None


@dataclass
class NormalizedTranscript:
    """Importer output, ready to be stored as a Lecture."""

    title: str | None
    held_on: date | None
    segments: list[Segment] = field(default_factory=list)
    duration_sec: float = 0.0
    sha256: str = ""


def clean(text: str) -> str:
    """Collapse whitespace runs to single spaces and trim.

    Args:
        text: Any text.

    Returns:
        The cleaned text.
    """
    return re.sub(r"\s+", " ", text).strip()


def hms_to_sec(value: str) -> float:
    """Convert ``HH:MM:SS(.fff)`` or ``MM:SS(.fff)`` to seconds.

    Args:
        value: Timestamp string; a comma is accepted as the decimal separator.

    Returns:
        Seconds as a float.

    Raises:
        TranscriptError: If the value is not a timestamp.
    """
    parts = value.strip().replace(",", ".").split(":")
    try:
        numbers = [float(p) for p in parts]
    except ValueError:
        raise TranscriptError(f"invalid timestamp: {value!r}") from None

    if len(numbers) not in (2, 3) or any(n < 0 for n in numbers):
        raise TranscriptError(f"invalid timestamp: {value!r}")
    seconds = 0.0

    # Convert the numbers to seconds.
    for number in numbers:
        seconds = seconds * 60 + number
    return seconds


def parse_loose_date(value: str | None) -> date | None:
    """Best-effort date parsing for recording metadata.

    Accepts ISO dates (``2026-10-19``, optionally followed by a time) and Zoom's
    display forms in Hebrew (``19 באוקטובר 2026``) and English
    (``Oct 19, 2026 06:01 PM``). Anything else returns None and the user can set
    the date later with PATCH.

    Args:
        value: Raw date text, possibly None.

    Returns:
        The date, or None if it cannot be read.
    """
    if not value:
        return None
    # If the value is an ISO date, parse it.
    if iso := re.match(r"(\d{4})-(\d{2})-(\d{2})", value.strip()):
        try:
            return date(*map(int, iso.groups()))
        except ValueError:
            return None

    # If the value is a Hebrew date, parse it.
    if heb := re.search(r"(\d{1,2})\s+ב?(\S+)\s+(\d{4})", value):
        month = HEBREW_MONTHS.get(heb.group(2))
        if month:
            try:
                return date(int(heb.group(3)), month, int(heb.group(1)))
            except ValueError:
                return None

    # If the value is an English date, parse it.
    if eng := re.match(r"([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})", value.strip()):
        month = ENGLISH_MONTHS.get(eng.group(1).lower())
        if month:
            try:
                return date(int(eng.group(3)), month, int(eng.group(2)))
            except ValueError:
                return None

    # If the value is not a date, return None.
    return None


def merge(segments: list[RawSegment]) -> list[RawSegment]:
    """Merge consecutive blocks from the same speaker.

    Zoom emits one block per short utterance. Merging keeps the transcript
    readable while the gap and size caps keep timestamps meaningful. Blocks with
    no speaker name are never merged: two unattributed paragraphs are not known
    to come from the same person.

    Args:
        segments: Blocks sorted by start time.

    Returns:
        A new list of merged blocks.
    """
    merged: list[RawSegment] = []
    for seg in segments:
        last = merged[-1] if merged else None

        # If the last segment is the same speaker and the gap is less than the merge gap, merge the
        # segments.
        if (
            last is not None
            and last.name is not None
            and last.name == seg.name
            and seg.start_sec - last.end_sec <= MERGE_GAP_SEC
            and len(last.text) + len(seg.text) + 1 <= MERGE_MAX_CHARS
        ):
            last.text = f"{last.text} {seg.text}"
            last.end_sec = max(last.end_sec, seg.end_sec)
        else:
            merged.append(RawSegment(seg.start_sec, seg.end_sec, seg.name, seg.text))
    return merged


def speaker_roles(segments: list[RawSegment]) -> dict[str | None, Speaker]:
    """Map every real name to an anonymous role.

    Developer note: the lecturer is the named speaker with the most transcribed
    characters. Zoom misattributes lines fairly often, but over a whole lecture
    the lecturer still dominates by a wide margin, so this is stable in practice.
    Everyone else becomes a student; a missing name stays unknown. A file that is
    already anonymized (names equal to the role labels) keeps its labels as is.

    Args:
        segments: Raw blocks with real names.

    Returns:
        A mapping from name (or None) to Speaker.
    """
    labels = {role.value: role for role in Speaker}
    volume: Counter[str] = Counter()

    # Count the volume of each speaker (counting array).
    for seg in segments:
        if seg.name and seg.name not in labels:
            volume[seg.name] += len(seg.text)

    # Create a mapping from name (or None) to Speaker.
    roles: dict[str | None, Speaker] = {None: Speaker.UNKNOWN, **labels}
    lecturer = volume.most_common(1)[0][0] if volume else None
    for name in volume:
        # If the name is the lecturer, set the role to LECTURER, otherwise set the role to STUDENT.
        roles[name] = Speaker.LECTURER if name == lecturer else Speaker.STUDENT
    return roles


def split_text(text: str, limit: int = MERGE_MAX_CHARS) -> list[str]:
    """Split text into chunks of at most ``limit`` characters on word boundaries.

    Args:
        text: Cleaned text.
        limit: Maximum chunk length.

    Returns:
        Non-empty chunks in order.
    """
    chunks: list[str] = []
    current = ""

    # Split the text into words and split the words into chunks.
    for word in text.split(" "):
        while len(word) > limit:  # a single "word" longer than the limit
            if current:
                chunks.append(current)
                current = ""
            chunks.append(word[:limit])
            word = word[limit:]
        candidate = f"{current} {word}" if current else word
        if len(candidate) <= limit:
            current = candidate
        else:
            chunks.append(current)
            current = word

    # If there is any text left, add it to the chunks.
    if current:
        chunks.append(current)
    return chunks


def normalize(raw: RawTranscript) -> NormalizedTranscript:
    """Turn parser output into anonymized, size-checked segments plus a content hash.

    Args:
        raw: Parser output.

    Returns:
        The normalized transcript.

    Raises:
        TranscriptError: If nothing usable remains or the text is too long.
    """
    # Create a list of RawSegment objects from the raw segments.
    blocks = [
        RawSegment(
            s.start_sec, max(s.end_sec, s.start_sec), clean(s.name or "") or None, clean(s.text)
        )
        for s in raw.segments
    ]

    # Sort the blocks by start time.
    blocks = sorted((b for b in blocks if b.text), key=lambda b: b.start_sec)

    # If there are no blocks, raise an error.
    if not blocks:
        raise TranscriptError("the file contains no transcript text")

    # If the total length of the blocks is greater than the maximum allowed length, raise an error.
    if sum(len(b.text) for b in blocks) > MAX_TRANSCRIPT_CHARS:
        raise TranscriptError(f"transcript is longer than {MAX_TRANSCRIPT_CHARS} characters")

    # Merge the blocks.
    blocks = merge(blocks)

    # Create a mapping from name (or None) to Speaker.
    roles = speaker_roles(blocks)

    # Create a list of Segment objects from the blocks.
    segments = [
        Segment(start_sec=b.start_sec, end_sec=b.end_sec, speaker=roles[b.name], text=chunk)
        for b in blocks
        for chunk in split_text(b.text)
    ]

    # Create a fingerprint of the segments.
    fingerprint = "\n".join(f"{s.speaker}|{s.text}" for s in segments)

    # Create a NormalizedTranscript object from the raw transcript.
    return NormalizedTranscript(
        title=clean(raw.title or "")[:200] or None,
        held_on=raw.held_on,
        segments=segments,
        duration_sec=max(raw.duration_sec or 0.0, max(s.end_sec for s in segments)),
        sha256=hashlib.sha256(fingerprint.encode("utf-8")).hexdigest(),
    )
