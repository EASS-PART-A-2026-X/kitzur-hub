"""Unit tests for material text extraction and normalization."""

import pytest

from app.materials import (
    MaterialError,
    UnsupportedMaterialError,
    extract_material,
    fix_mirrored_brackets,
    normalize_page,
)
from tests.pdf_factory import encrypt, make_pdf

SYLLABUS_LINES = [
    "Week 1: HTTP and FastAPI",
    "Week 2: Persistence with SQLModel",
    "Grading: exercises 40 percent, exam 60 percent",
]


@pytest.mark.parametrize(
    ("extracted", "expected"),
    [
        # Patterns copied from a real HIT exam extracted with pypdf.
        (
            "250 תאים )חלקם תאי עצב וחלקם תאי גזע(. להלן",
            "250 תאים (חלקם תאי עצב וחלקם תאי גזע). להלן",
        ),
        ("מועד ב' )סדר תשובות מעורבב( שאלה", "מועד ב' (סדר תשובות מעורבב) שאלה"),
        (
            "רשתות נוירונים )אלגוריתם backpropagation ( .ב",
            "רשתות נוירונים (אלגוריתם backpropagation ) .ב",
        ),
        # Already correct or ambiguous: left alone.
        ('תשפ"ו (2026)ק', 'תשפ"ו (2026)ק'),
        ("f(x) = max(0, x)", "f(x) = max(0, x)"),
        ("(נכון) כתאי גזע", "(נכון) כתאי גזע"),
        # A pair split across lines is not a pair.
        (")חלקם\nגזע(", ")חלקם\nגזע("),
    ],
)
def test_fix_mirrored_brackets(extracted: str, expected: str) -> None:
    """Only complete mirrored pairs that start with Hebrew are swapped."""
    assert fix_mirrored_brackets(extracted) == expected


def test_normalize_joins_word_per_line_pages() -> None:
    """A page with one word per line becomes one paragraph."""
    raw = "מבחן\n \nבלמידת\n \nמכונה\n \n-\n \nמועד\n \nב'"
    assert normalize_page(raw) == "מבחן בלמידת מכונה - מועד ב'"


def test_normalize_keeps_structured_lines() -> None:
    """Normal-length lines keep their breaks; inner whitespace runs collapse."""
    raw = "  שבוע 1:   HTTP ו-FastAPI  \n\n שבוע 2: התמדה עם SQLModel \n"
    assert normalize_page(raw) == "שבוע 1: HTTP ו-FastAPI\nשבוע 2: התמדה עם SQLModel"


def test_pdf_text_and_page_count() -> None:
    """Pages are extracted in order and separated by a blank line."""
    result = extract_material("syllabus.pdf", make_pdf([SYLLABUS_LINES, ["Final exam: February"]]))
    assert result.page_count == 2
    assert result.text.startswith("Week 1: HTTP and FastAPI\nWeek 2")
    assert result.text.endswith("\n\nFinal exam: February")


@pytest.mark.parametrize(
    ("data", "message"),
    [
        (make_pdf([[], []]), "no text layer"),
        (encrypt(make_pdf([SYLLABUS_LINES])), "password protected"),
        (b"%PDF-1.4 this is not really a pdf", "cannot be read"),
    ],
)
def test_unusable_pdfs(data: bytes, message: str) -> None:
    """Scanned, encrypted and corrupt PDFs give a clear reason."""
    with pytest.raises(MaterialError, match=message):
        extract_material("exam.pdf", data)


def test_plain_text_and_markdown() -> None:
    """UTF-8 with a BOM and Windows line endings is normalized."""
    result = extract_material("notes.md", "﻿# סילבוס\r\nשבוע 1\r\n".encode())
    assert result.text == "# סילבוס\nשבוע 1"
    assert result.page_count is None


@pytest.mark.parametrize(
    ("name", "data", "error"),
    [
        ("syllabus.docx", b"PK", UnsupportedMaterialError),
        ("notes.txt", b"   \n ", MaterialError),
        ("notes.txt", b"\xff\xfe\x00bad", MaterialError),
        ("long.txt", b"a" * 200_001, MaterialError),
    ],
)
def test_rejected_files(name: str, data: bytes, error: type[Exception]) -> None:
    """Unsupported, empty, non-UTF-8 and oversized texts are rejected."""
    with pytest.raises(error):
        extract_material(name, data)
