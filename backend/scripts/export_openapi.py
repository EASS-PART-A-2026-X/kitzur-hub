"""Write the backend's OpenAPI schema to frontend/openapi.json.

Usage (from backend/):
    uv run python -m scripts.export_openapi

The frontend generates its request and response types from this file
(``npm run gen:api``), so run this after any API change and commit both files.
"""

import json
from pathlib import Path

from app.main import create_app

TARGET = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def main() -> None:
    """Build the app without touching any database and dump its schema."""
    schema = create_app("sqlite://", seed_demo=False).openapi()
    TARGET.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {TARGET.relative_to(TARGET.parents[1])}")


if __name__ == "__main__":
    main()
