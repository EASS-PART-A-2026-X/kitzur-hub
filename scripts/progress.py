"""Read and update the stage tracker in docs/progress.json.

Usage:
    python scripts/progress.py                 # all stages, one line each
    python scripts/progress.py next            # the first stage that is not done
    python scripts/progress.py 3.2 in_progress --agent claude
    python scripts/progress.py 3.2 done --note "Summary agent, 14 tests"

If the local docs/guide.html exists, its progress table is kept in sync.
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"
TRACKER = DOCS / "progress.json"
GUIDE = DOCS / "guide.html"
GUIDE_BLOCK = re.compile(
    r'(<script type="application/json" id="progress">\n)(.*?)(\n</script>)', re.DOTALL
)
STATUSES = ("todo", "in_progress", "done", "blocked")


def save(data: dict) -> None:
    """Write the tracker, and mirror it into the local guide when present.

    Args:
        data: Tracker object.
    """
    body = json.dumps(data, indent=1, ensure_ascii=False)
    TRACKER.write_text(body + "\n", encoding="utf-8")
    if GUIDE.exists():
        html = GUIDE.read_text(encoding="utf-8")
        GUIDE.write_text(
            GUIDE_BLOCK.sub(lambda m: m.group(1) + body + m.group(3), html, count=1),
            encoding="utf-8",
        )


def line(stage: dict) -> str:
    """Format one stage for the terminal.

    Args:
        stage: Stage entry.

    Returns:
        A single line: id, status, agent, title.
    """
    return f"{stage['id']:<5} {stage['status']:<12} {stage['agent']:<7} {stage['title']}"


def main() -> None:
    """Print the tracker, print the next stage, or update one stage."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("stage", nargs="?", help="stage id, or 'next'")
    parser.add_argument("status", nargs="?", choices=STATUSES)
    parser.add_argument("--agent")
    parser.add_argument("--note")
    args = parser.parse_args()

    data = json.loads(TRACKER.read_text(encoding="utf-8"))
    stages = data["stages"]
    if args.stage is None:
        print("\n".join(line(s) for s in stages))
        return
    if args.stage == "next":
        pending = next((s for s in stages if s["status"] != "done"), None)
        print(line(pending) if pending else "all stages done")
        return

    stage = next((s for s in stages if s["id"] == args.stage), None)
    if stage is None:
        sys.exit(f"unknown stage {args.stage}")
    if args.status:
        stage["status"] = args.status
    if args.agent is not None:
        stage["agent"] = args.agent
    if args.note is not None:
        stage["note"] = args.note
    data["updated"] = dt.date.today().isoformat()
    save(data)
    print(line(stage))


if __name__ == "__main__":
    main()
