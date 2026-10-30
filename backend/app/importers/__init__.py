"""Transcript importers: detect the format, parse it, normalize the result."""

from datetime import UTC, datetime
from pathlib import PurePath

from app.importers import kitzur_md, txt, vtt, zoom_json
from app.importers.common import (
    NormalizedTranscript,
    TranscriptError,
    UnsupportedFormatError,
    normalize,
)
from app.models import Lecture, SourceFormat

PARSERS = {
    ".md": (SourceFormat.KITZUR_MD, kitzur_md.parse),
    ".json": (SourceFormat.ZOOM_JSON, zoom_json.parse),
    ".vtt": (SourceFormat.VTT, vtt.parse),
    ".txt": (SourceFormat.TEXT, txt.parse),
}

__all__ = ["TranscriptError", "UnsupportedFormatError", "build_lecture", "import_transcript"]


def import_transcript(filename: str, data: bytes) -> tuple[SourceFormat, NormalizedTranscript]:
    """Detect the format from the file extension, then parse and normalize.

    Args:
        filename: Uploaded file name, used for the extension and as a fallback title.
        data: Raw file bytes.

    Returns:
        The detected format and the normalized transcript.

    Raises:
        UnsupportedFormatError: For an extension other than .md, .json, .vtt or .txt.
        TranscriptError: If the file is not UTF-8 or holds no usable transcript.
    """
    path = PurePath(filename or "")
    entry = PARSERS.get(path.suffix.lower())
    if entry is None:
        raise UnsupportedFormatError("supported formats: .md (Kitzur), .json (Zoom), .vtt, .txt")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise TranscriptError("file is not UTF-8 text") from None

    source_format, parse = entry
    result = normalize(parse(text))
    if result.title is None:
        result.title = path.name.split(".")[0][:200] or "שיעור ללא שם"

    return source_format, result


def build_lecture(course_id: int, filename: str, data: bytes) -> Lecture:
    """Import a file and wrap the result in an unsaved Lecture row.

    Used by the upload endpoint and by the demo seed, so both store lectures
    the same way.

    Args:
        course_id: Parent course.
        filename: File name (selects the parser).
        data: Raw file bytes.

    Returns:
        A Lecture ready to be added to a session.

    Raises:
        UnsupportedFormatError: Unknown extension.
        TranscriptError: Unusable content.
    """
    source_format, transcript = import_transcript(filename, data)
    return Lecture(
        course_id=course_id,
        title=transcript.title,
        held_on=transcript.held_on,
        source_format=source_format,
        segments=[s.model_dump(mode="json") for s in transcript.segments],
        duration_sec=transcript.duration_sec,
        sha256=transcript.sha256,
        created_at=datetime.now(UTC),
    )
