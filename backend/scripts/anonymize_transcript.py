"""Turn a real lecture transcript into an anonymized Kitzur markdown file.

Usage (from backend/):
    uv run python -m scripts.anonymize_transcript IN OUT --names-file ../private/names.txt \
        [--title "..."]

Steps:
    1. Import IN with the app's own pipeline (whitelist, merge, speaker roles).
    2. Redact every speaker name token and every extra name in --names-file from
       the text itself, including Hebrew one-letter prefixes (לאורי, ואורי).
    3. Redact e-mail addresses and Israeli phone numbers.
    4. Write OUT in Kitzur's .transcript.md format, which the importer reads back.

The names file is personal data: keep it under private/ (gitignored).
"""

import argparse
import re
import sys
from pathlib import Path

from app.importers import PARSERS, import_transcript
from app.importers.common import clean

REDACTED = "[שם]"
HEBREW_PREFIXES = "והבלמשכ"
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
PHONE = re.compile(r"(?<!\d)0[2-9]\d?-?\d{7}(?!\d)")


def speaker_names(filename: str, data: bytes) -> set[str]:
    """Collect the name tokens of every speaker in the original file.

    Args:
        filename: Input file name (selects the parser).
        data: Raw file bytes.

    Returns:
        Name tokens of two or more characters.
    """
    raw = PARSERS[Path(filename).suffix.lower()][1](data.decode("utf-8-sig"))
    return {
        tok for seg in raw.segments if seg.name for tok in clean(seg.name).split() if len(tok) > 1
    }


def name_pattern(names: set[str]) -> re.Pattern[str]:
    """Build one regex matching any name as a whole word.

    Developer note: Hebrew attaches prepositions and conjunctions to the next
    word (ל+אורי = לאורי), so an optional one-letter prefix is allowed before a
    Hebrew name. Longest names go first so a "Dana K" style pair is not split.

    Args:
        names: Names to match.

    Returns:
        A compiled, case-insensitive pattern.
    """
    alternatives = "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True))
    return re.compile(rf"(?<!\w)[{HEBREW_PREFIXES}]?(?:{alternatives})(?!\w)", re.IGNORECASE)


def to_hms(seconds: float) -> str:
    """Format seconds as HH:MM:SS.

    Args:
        seconds: Non-negative number of seconds.

    Returns:
        The formatted time.
    """
    total = int(seconds)
    return f"{total // 3600:02d}:{total % 3600 // 60:02d}:{total % 60:02d}"


def main() -> None:
    """Anonymize one transcript and report how much was redacted."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", type=Path)
    parser.add_argument("target", type=Path)
    parser.add_argument("--names-file", type=Path, required=True)
    parser.add_argument("--title")
    args = parser.parse_args()

    data = args.source.read_bytes()
    extra = {
        line.strip()
        for line in args.names_file.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    }
    names = speaker_names(args.source.name, data) | extra
    pattern = name_pattern(names)

    _, transcript = import_transcript(args.source.name, data)
    counts = {"names": 0, "contacts": 0}
    lines = []
    for seg in transcript.segments:
        text, hits = pattern.subn(REDACTED, seg.text)
        counts["names"] += hits
        text, hits = EMAIL.subn("[email]", text)
        counts["contacts"] += hits
        text, hits = PHONE.subn("[phone]", text)
        counts["contacts"] += hits
        lines.append(f"**[{to_hms(seg.start_sec)}] {seg.speaker}:** {text}")

    leaked = [
        n for n in names if re.search(rf"(?<!\w){re.escape(n)}(?!\w)", "\n".join(lines), re.I)
    ]
    if leaked:
        sys.exit(f"names still present after redaction: {len(leaked)}")

    header = [
        f"# {args.title or transcript.title or args.source.stem}",
        "",
        f"- **תאריך:** {transcript.held_on.isoformat() if transcript.held_on else '-'}",
        f"- **אורך:** {to_hms(transcript.duration_sec)}",
        "",
        "---",
        "",
    ]
    args.target.write_text("\n".join(header) + "\n\n".join(lines) + "\n", encoding="utf-8")
    print(
        f"{args.target.name}: {len(lines)} segments, {counts['names']} names and "
        f"{counts['contacts']} contact details redacted"
    )


if __name__ == "__main__":
    main()
