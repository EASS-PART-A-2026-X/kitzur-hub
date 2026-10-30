"""Fail if any tracked text file contains an em dash.

(I hate em dashes, this is a project hard rule.)
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EM_DASH = chr(0x2014)  # written as a code point so this file passes its own check


def tracked_files() -> list[Path]:
    """List files git would track (tracked plus untracked, minus ignored).

    Runs from the repository root so the result is the same from any directory.

    Returns:
        Absolute paths.
    """
    out = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        capture_output=True,
        text=True,
        check=True,
        cwd=ROOT,
    ).stdout
    return [ROOT / line for line in out.splitlines() if line]


def main() -> None:
    """Print every offending line and exit non-zero if any is found."""
    hits = 0
    for path in tracked_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue  # binary file
        except FileNotFoundError:
            continue  # deleted but still listed by git
        for number, line in enumerate(text.splitlines(), start=1):
            if EM_DASH in line:
                print(f"{path.relative_to(ROOT)}:{number}: {line.strip()}")
                hits += 1
    sys.exit(1 if hits else 0)


if __name__ == "__main__":
    main()
