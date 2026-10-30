"""Unit tests for transcript parsing, merging and anonymization."""

from datetime import date
from pathlib import Path

import pytest

from app.importers import TranscriptError, UnsupportedFormatError, import_transcript
from app.importers.common import (
    RawSegment,
    hms_to_sec,
    merge,
    parse_loose_date,
    speaker_roles,
    split_text,
)
from app.models import SourceFormat, Speaker

FIXTURES = Path(__file__).parent / "fixtures"


def load(name: str) -> bytes:
    """Read a fixture file as bytes."""
    return (FIXTURES / name).read_bytes()


def test_kitzur_markdown() -> None:
    """Header metadata is read, wrapped lines join their block, names are anonymized."""
    fmt, t = import_transcript("x.transcript.md", load("kitzur.transcript.md"))
    assert fmt is SourceFormat.KITZUR_MD
    assert t.title == "שיעור 2: HTTP ו-FastAPI"
    assert t.held_on == date(2026, 10, 26)
    assert t.duration_sec == 600
    assert [s.speaker for s in t.segments] == [Speaker.LECTURER, Speaker.STUDENT, Speaker.LECTURER]
    assert t.segments[1].text.endswith("המשך השאלה בשורה שנייה.")
    assert t.segments[0].end_sec == t.segments[1].start_sec == 70


def test_zoom_json_whitelist_drops_everything_else() -> None:
    """Only whitelisted fields survive: no signed URL, access id or real name anywhere."""
    fmt, t = import_transcript("rec.json", load("zoom.json"))
    assert fmt is SourceFormat.ZOOM_JSON
    assert (t.title, t.held_on, t.duration_sec) == ("שיעור 3: התמדה", date(2026, 11, 2), 600)
    stored = repr(t.segments)
    for secret in ("SECRET", "cdn.example.com", "ישראלי", "יואב"):
        assert secret not in stored
    assert "נזרקת" not in stored  # entry with a broken timestamp is skipped
    assert t.segments[0].text == "היום נלמד על SQLite ו-SQLModel."  # merged, 1 s gap


def test_vtt_reads_short_speaker_prefix_only() -> None:
    """A short ``name:`` prefix is a speaker; a long one stays part of the text."""
    fmt, t = import_transcript("c.vtt", load("captions.vtt"))
    assert fmt is SourceFormat.VTT
    assert t.segments[0].speaker is Speaker.LECTURER
    assert t.segments[1].speaker is Speaker.UNKNOWN
    assert t.segments[1].text.startswith("זו שורה ארוכה")
    assert t.segments[2].speaker is Speaker.STUDENT


def test_txt_paragraphs_and_filename_title() -> None:
    """Plain text becomes untimed segments; the title falls back to the file name."""
    fmt, t = import_transcript("my-notes.txt", load("notes.txt"))
    assert fmt is SourceFormat.TEXT
    assert t.title == "my-notes"
    assert [s.text for s in t.segments] == [
        "סיכום ידני של השיעור. שורה שנייה של אותה פסקה.",
        "פסקה שנייה.",
    ]
    assert {s.speaker for s in t.segments} == {Speaker.UNKNOWN}


def test_same_content_gives_same_hash() -> None:
    """The hash depends on content, not on the file name."""
    a = import_transcript("a.md", load("kitzur.transcript.md"))[1].sha256
    b = import_transcript("b.md", load("kitzur.transcript.md"))[1].sha256
    assert a == b
    assert len(a) == 64


@pytest.mark.parametrize(
    ("name", "data", "error"),
    [
        ("slides.pdf", b"%PDF", UnsupportedFormatError),
        ("x.md", "# כותרת בלבד".encode(), TranscriptError),
        ("x.json", b"{not json", TranscriptError),
        ("x.json", b'{"result": {}}', TranscriptError),
        ("x.vtt", b"no header", TranscriptError),
        ("x.txt", b"\xff\xfe\x00bad", TranscriptError),
        ("x.txt", b"   \n\n  ", TranscriptError),
    ],
)
def test_rejects_unusable_files(name: str, data: bytes, error: type[Exception]) -> None:
    """Unsupported or empty files raise the matching error."""
    with pytest.raises(error):
        import_transcript(name, data)


def test_merge_respects_speaker_gap_and_size() -> None:
    """Blocks merge only for the same speaker, a short gap and a bounded size."""
    segs = [
        RawSegment(0, 1, "a", "x"),
        RawSegment(2, 3, "a", "y"),  # merges
        RawSegment(100, 101, "a", "z"),  # gap too long
        RawSegment(102, 103, "b", "w"),  # other speaker
        RawSegment(104, 105, "b", "v" * 1500),  # too long to merge
    ]
    assert [s.text[:3] for s in merge(segs)] == ["x y", "z", "w", "vvv"]


def test_lecturer_is_the_speaker_with_most_text() -> None:
    """The dominant speaker by characters is the lecturer, not the first one."""
    roles = speaker_roles([RawSegment(0, 0, "s", "hi"), RawSegment(1, 1, "l", "long " * 20)])
    assert (roles["l"], roles["s"], roles[None]) == (
        Speaker.LECTURER,
        Speaker.STUDENT,
        Speaker.UNKNOWN,
    )


def test_split_text_keeps_every_chunk_within_limit() -> None:
    """Long text is cut on word boundaries, and an oversized word is cut hard."""
    chunks = split_text("aa bb cc " + "x" * 12, limit=5)
    assert chunks == ["aa bb", "cc", "xxxxx", "xxxxx", "xx"]


def test_already_anonymized_labels_are_kept() -> None:
    """Re-importing an anonymized file must not promote a student to lecturer."""
    roles = speaker_roles(
        [RawSegment(0, 0, "סטודנט/ית", "long " * 50), RawSegment(1, 1, "מרצה", "short")]
    )
    assert (roles["מרצה"], roles["סטודנט/ית"]) == (Speaker.LECTURER, Speaker.STUDENT)


@pytest.mark.parametrize(
    ("value", "expected"),
    [("00:01:02.5", 62.5), ("01:02", 62), ("1:00:00,250", 3600.25)],
)
def test_hms_to_sec(value: str, expected: float) -> None:
    """Hours are optional and a comma decimal separator is accepted."""
    assert hms_to_sec(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("2026-10-19T18:00:00", date(2026, 10, 19)),
        ("19 באוקטובר 2026", date(2026, 10, 19)),
        ("Oct 19, 2026 06:01 PM", date(2026, 10, 19)),
        ("September 1 2026", date(2026, 9, 1)),
        ("31 בפברואר 2026", None),
        ("yesterday", None),
        (None, None),
    ],
)
def test_parse_loose_date(value: str | None, expected: date | None) -> None:
    """ISO and Hebrew display dates parse; anything else is None."""
    assert parse_loose_date(value) == expected
