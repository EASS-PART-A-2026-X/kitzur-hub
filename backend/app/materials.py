"""Text extraction for course materials (syllabus, past exams).

Supported: .pdf (text layer only), .txt, .md. The extracted text is what the AI
service reads in EX3, so it is normalized here once instead of in every consumer.
"""

import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePath

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_MATERIAL_CHARS = 200_000
MIN_TEXT_CHARS_PER_PAGE = 20
WORD_PER_LINE_AVG = 15
HEBREW = "֐-׿"
# ")" + Hebrew ... "(" with no other bracket or line break in between, up to 120 chars.
MIRRORED_PAIR = re.compile(rf"\)([{HEBREW}][^()\n]{{0,120}}?)\(")


class MaterialError(ValueError):
    """The file was read but no usable text came out of it (HTTP 422)."""


class UnsupportedMaterialError(MaterialError):
    """The file type is not supported (HTTP 415)."""


@dataclass
class ExtractedText:
    """Extraction result: normalized text plus the page count for PDFs."""

    text: str
    page_count: int | None


def fix_mirrored_brackets(text: str) -> str:
    """Swap parentheses that PDF extraction mirrored inside Hebrew text.

    Developer note: in right-to-left PDFs the glyphs for "(" and ")" are stored
    mirrored, so extraction yields ")חלקם תאי עצב(" for "(חלקם תאי עצב)".
    Only a complete mirrored pair is swapped: ")" directly followed by Hebrew,
    then "(" on the same line with no other bracket in between (the content may
    end in English, as in ")אלגוריתם PCA ("). Single brackets
    next to numbers or English (common in mixed-direction lines such as
    "(2026)ק") are ambiguous, so they are left as extracted.

    Args:
        text: Extracted text.

    Returns:
        Text with the mirrored pairs fixed.
    """
    return MIRRORED_PAIR.sub(r"(\1)", text)


def normalize_page(raw: str) -> str:
    """Clean one page of extracted text.

    Developer note: some PDFs come out with every word on its own line. When
    the average line is shorter than a word or two, lines are joined with
    spaces; otherwise line breaks are kept because they carry table and list
    structure (weekly schedules, grading tables).

    Args:
        raw: Text of one page as returned by the PDF library.

    Returns:
        The cleaned page.
    """
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in raw.splitlines()]
    lines = [line for line in lines if line]
    if not lines:
        return ""
    average = sum(len(line) for line in lines) / len(lines)
    joined = " ".join(lines) if average < WORD_PER_LINE_AVG else "\n".join(lines)
    return fix_mirrored_brackets(joined)


def extract_pdf(data: bytes) -> ExtractedText:
    """Extract and normalize the text layer of a PDF.

    Args:
        data: PDF bytes.

    Returns:
        Pages joined by blank lines, plus the page count.

    Raises:
        MaterialError: For unreadable, encrypted or image-only (scanned) PDFs.
    """
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise MaterialError("the PDF is password protected")
        pages = [normalize_page(page.extract_text() or "") for page in reader.pages]
    except PdfReadError as exc:
        raise MaterialError(f"the PDF cannot be read: {exc}") from None
    text = "\n\n".join(page for page in pages if page)
    if len(text.replace(" ", "")) < MIN_TEXT_CHARS_PER_PAGE * max(len(pages), 1):
        raise MaterialError(
            "the PDF has no text layer (scanned?). Upload a text PDF or a .txt file"
        )
    return ExtractedText(text=text, page_count=len(pages))


def extract_plain(data: bytes) -> ExtractedText:
    """Decode a UTF-8 text or markdown file and normalize line endings.

    Args:
        data: File bytes.

    Returns:
        The text, with no page count.

    Raises:
        MaterialError: If the file is not UTF-8 or is empty.
    """
    try:
        text = data.decode("utf-8-sig").replace("\r\n", "\n").strip()
    except UnicodeDecodeError:
        raise MaterialError("file is not UTF-8 text") from None
    if not text:
        raise MaterialError("the file is empty")
    return ExtractedText(text=text, page_count=None)


EXTRACTORS = {".pdf": extract_pdf, ".txt": extract_plain, ".md": extract_plain}


def extract_material(filename: str, data: bytes) -> ExtractedText:
    """Pick the extractor by file extension and enforce the size limit.

    Args:
        filename: Uploaded file name.
        data: File bytes.

    Returns:
        The extracted text.

    Raises:
        UnsupportedMaterialError: For extensions other than .pdf, .txt and .md.
        MaterialError: If extraction fails or the text is too long.
    """
    extractor = EXTRACTORS.get(PurePath(filename or "").suffix.lower())
    if extractor is None:
        raise UnsupportedMaterialError("supported formats: .pdf, .txt, .md")
    result = extractor(data)
    if len(result.text) > MAX_MATERIAL_CHARS:
        raise MaterialError(f"text is longer than {MAX_MATERIAL_CHARS} characters")
    return result
