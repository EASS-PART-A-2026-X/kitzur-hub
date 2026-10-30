"""Update the progress block in docs/guide.html.

Usage:
    python scripts/progress.py                       # print all stages
    python scripts/progress.py 1.2 in_progress --agent codex
    python scripts/progress.py 1.2 done --note "Tables and schemas, 14 tests"

Only the JSON inside <script type="application/json" id="progress"> is touched,
so agents never need to read or rewrite the rest of the guide.
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

GUIDE = Path(__file__).resolve().parent.parent / "docs" / "guide.html"
BLOCK = re.compile(
    r'(<script type="application/json" id="progress">\n)(.*?)(\n</script>)', re.DOTALL
)
STATUSES = ("todo", "in_progress", "done", "blocked")


def load(html: str) -> dict:
    """Extract and parse the progress JSON from the guide.

    Args:
        html: Full guide HTML.

    Returns:
        The parsed progress object.

    Raises:
        SystemExit: If the block is missing.
    """
    match = BLOCK.search(html)
    if not match:
        sys.exit("progress block not found in docs/guide.html")
    return json.loads(match.group(2))


def save(html: str, data: dict) -> str:
    """Return the guide HTML with the progress block replaced by ``data``.

    Args:
        html: Full guide HTML.
        data: Progress object to serialize.

    Returns:
        Updated HTML.
    """
    body = json.dumps(data, indent=1, ensure_ascii=False)
    return BLOCK.sub(lambda m: m.group(1) + body + m.group(3), html, count=1)


def main() -> None:
    """Parse arguments and print or update one stage."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("stage", nargs="?")
    parser.add_argument("status", nargs="?", choices=STATUSES)
    parser.add_argument("--agent")
    parser.add_argument("--note")
    args = parser.parse_args()

    html = GUIDE.read_text(encoding="utf-8")
    data = load(html)

    if not args.stage:
        for st in data["stages"]:
            print(f"{st['id']:<5} {st['status']:<12} {st['agent']:<8} {st['title']}")
        return

    stage = next((s for s in data["stages"] if s["id"] == args.stage), None)
    if stage is None:
        sys.exit(f"unknown stage {args.stage}")
    if args.status:
        stage["status"] = args.status
    if args.agent is not None:
        stage["agent"] = args.agent
    if args.note is not None:
        stage["note"] = args.note
    data["updated"] = dt.date.today().isoformat()
    GUIDE.write_text(save(html, data), encoding="utf-8")
    print(f"{stage['id']} -> {stage['status']}")


if __name__ == "__main__":
    main()
