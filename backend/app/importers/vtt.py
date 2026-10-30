"""Parser for WebVTT captions, including Zoom's transcript download.

Zoom writes cues as ``Speaker Name: text``. A prefix is treated as a speaker
only when it is short, so a sentence that happens to contain a colon stays text.
"""

import re

from app.importers.common import RawSegment, RawTranscript, TranscriptError, hms_to_sec

CUE_TIME = re.compile(r"^(?P<start>[\d:.,]+)\s+-->\s+(?P<end>[\d:.,]+)")
SPEAKER = re.compile(r"^(?P<name>[^:]{1,40}):\s+(?P<text>.+)$")


def parse(text: str) -> RawTranscript:
    """Parse a WebVTT file.

    Args:
        text: File content.

    Returns:
        Raw transcript, one segment per cue.

    Raises:
        TranscriptError: If the header is missing or there are no cues.
    """
    lines = text.splitlines()
    if not lines or not lines[0].strip().startswith("WEBVTT"):
        raise TranscriptError("missing WEBVTT header")

    segments: list[RawSegment] = []
    current: RawSegment | None = None

    # Extract the segments from the lines, and create a RawTranscript object with the segments.
    for line in lines[1:]:
        line = line.strip()
        if timing := CUE_TIME.match(line):
            current = RawSegment(hms_to_sec(timing["start"]), hms_to_sec(timing["end"]), None, "")
            segments.append(current)
        elif not line:
            current = None
        elif current is not None:
            if not current.text and (speaker := SPEAKER.match(line)):
                current.name, line = speaker["name"], speaker["text"]
            current.text = f"{current.text} {line}".strip()

    if not segments:
        raise TranscriptError("no cues found")
    return RawTranscript(segments=segments)
