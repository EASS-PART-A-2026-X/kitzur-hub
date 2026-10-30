"""Parser for the ``.transcript.md`` file that Kitzur's "Download transcript" button saves.

Shape (see Kitzur ``lib/transcript.js`` toMarkdown):

    # <topic>
    - **תאריך:** <date text>
    - **אורך:** HH:MM:SS
    ---
    **[HH:MM:SS] <name>:** <text>
"""

import re

from app.importers.common import (
    RawSegment,
    RawTranscript,
    TranscriptError,
    hms_to_sec,
    parse_loose_date,
)

BLOCK = re.compile(r"^\*\*\[(?P<ts>[\d:.]+)\]\s*(?P<name>[^*]*?):\*\*\s*(?P<text>.*)$")
TITLE = re.compile(r"^#\s+(.+)$")
DATE = re.compile(r"^-\s*\*\*תאריך:\*\*\s*(.+)$")
LENGTH = re.compile(r"^-\s*\*\*אורך:\*\*\s*([\d:]+)\s*$")
KITZUR_DEFAULT_TITLE = "הקלטת שיעור"


def parse(text: str) -> RawTranscript:
    """Parse a Kitzur markdown transcript.

    Lines that do not start a block are treated as continuations of the previous
    block, so hand-edited files with wrapped lines still import. Each block ends
    where the next one starts because the format has no end timestamps.

    Args:
        text: File content.

    Returns:
        Raw transcript with title, date and duration from the header.

    Raises:
        TranscriptError: If no ``**[time] name:**`` block is found.
    """
    title = held_on = duration = None
    segments: list[RawSegment] = []

    # Extract the segments from the lines, and create a RawTranscript object with the segments,
    # title, held_on, and duration.
    for line in text.splitlines():
        line = line.strip()
        if block := BLOCK.match(line):
            start = hms_to_sec(block["ts"])
            if segments:
                segments[-1].end_sec = max(segments[-1].start_sec, start)
            segments.append(RawSegment(start, start, block["name"], block["text"]))
        elif segments and line and line != "---":
            segments[-1].text += f" {line}"
        elif not segments and (match := TITLE.match(line)):
            title = None if match[1].strip() == KITZUR_DEFAULT_TITLE else match[1]
        elif not segments and (match := DATE.match(line)):
            held_on = parse_loose_date(match[1])
        elif not segments and (match := LENGTH.match(line)):
            duration = hms_to_sec(match[1])

    # If no segments are found, raise an error.
    if not segments:
        raise TranscriptError("no '**[HH:MM:SS] name:** text' blocks found")

    if duration is not None:
        segments[-1].end_sec = max(segments[-1].start_sec, duration)

    return RawTranscript(segments=segments, title=title, held_on=held_on, duration_sec=duration)
