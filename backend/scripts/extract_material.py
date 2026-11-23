"""Print what the materials endpoint would store for a local file.

Usage (from backend/):
    uv run python -m scripts.extract_material ../private/syllabus.pdf [--chars 800]

Use it on real documents (kept in private/) before relying on them in the app.
"""

import argparse
from pathlib import Path

from app.materials import extract_material


def main() -> None:
    """Extract one file and print a summary plus the start of the text."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("path", type=Path)
    parser.add_argument("--chars", type=int, default=800)
    args = parser.parse_args()

    result = extract_material(args.path.name, args.path.read_bytes())
    print(f"{args.path.name}: {result.page_count or '-'} pages, {len(result.text)} chars")
    print(result.text[: args.chars])


if __name__ == "__main__":
    main()
