# AGENTS.md

Instructions for any AI agent (Claude, Codex, Cursor, Copilot) working in this repo.

## Project
Kitzur Hub: an EASS (HIT) course product. Three services grown over EX1 to EX3:
`backend/` (FastAPI + SQLModel + SQLite), `frontend/` (React, from EX2), `ai-service/` (Pydantic AI, from EX3).
The design, decisions and course requirements live in `docs/guide.html` (local planning file, gitignored; ask the owner for it if missing). Read its "Decisions" section before changing anything structural.

## Hard rules
1. Clean, minimal code. No filler comments, no speculative abstractions.
2. No em dashes anywhere (code, comments, docs, commit messages). Use a colon, comma or hyphen.
3. Every function, method and module has a docstring (Google style). Ruff rule set `D` enforces it.
4. Complex logic gets a short developer note explaining WHY, not what.
5. Anything not already agreed in `docs/guide.html` (Decisions) must be asked to the owner (Gitam) before implementing.
6. Tests never call a paid API or the network.
7. Never commit secrets, real course PDFs or `.db` files. A real transcript is committed only after
   `backend/scripts/anonymize_transcript.py` (speaker roles, names in text, contact details).
   Raw files and the names list stay in `private/` (gitignored).

## Progress tracking
The single source of truth is the JSON block `<script id="progress">` inside `docs/guide.html`.
- Starting a stage: set its `status` to `in_progress` and `agent` to your name.
- Finishing a stage: set `status` to `done`, write a one-line `note`, update `updated`.
- Blocked: set `status` to `blocked` and put the question in `note`.
Use `python scripts/progress.py <stage> <status> --agent <name> --note "..."` instead of editing by hand (`python scripts/progress.py` lists stages). Statuses: `todo`, `in_progress`, `done`, `blocked`.

## Commands (from `backend/`)
```bash
uv sync                      # install
uv run fastapi dev           # run on :8000
uv run pytest                # tests
uv run ruff check . && uv run ruff format --check .
```
Running inside a Linux VM against a macOS checkout? Keep the venv out of the repo:
`export UV_PROJECT_ENVIRONMENT=$HOME/.venvs/kitzur-hub-backend`.

## Before finishing any stage
- Tests and ruff pass.
- `python scripts/check_no_em_dash.py` passes.
- Progress block updated.
