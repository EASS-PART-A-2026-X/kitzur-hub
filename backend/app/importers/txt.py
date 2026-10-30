"""Parser for plain text transcripts (pasted notes, other tools' exports)."""

from app.importers.common import RawSegment, RawTranscript


def parse(text: str) -> RawTranscript:
    """Turn each blank-line separated paragraph into one untimed, unattributed segment.

    Args:
        text: File content.

    Returns:
        Raw transcript with every segment at time 0 and an unknown speaker.
    """
    paragraphs = [p for p in text.replace("\r\n", "\n").split("\n\n") if p.strip()]
    return RawTranscript(segments=[RawSegment(0.0, 0.0, None, p) for p in paragraphs])
