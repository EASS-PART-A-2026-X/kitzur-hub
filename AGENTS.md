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

## Frontend rules (`frontend/`)
1. TypeScript strict, no `any`. JSDoc on every function and component.
2. Layers, each with one job:
   - `config/constants.ts`: every magic value and route path. Values that mirror the backend say so.
   - `api/`: the only code that does HTTP (`client.ts`), error model (`errors.ts`), query keys (`keys.ts`),
     friendly type names (`types.ts`). `schema.d.ts` is generated: never edit it.
   - `hooks/`: all data access and shared logic (`useCourses`, `useErrorMessage`). Components never call `api` directly.
   - `components/`: reusable UI with no data fetching. `pages/`: one route each, composed from hooks + components.
   - `app/`: providers, theme, router, query client policy. `i18n/`: setup and locale files.
3. Every data view renders through `<QueryState>` (loading, error with retry, empty with a next step, content).
4. Errors are turned into text only by `useErrorMessage`. Writes never retry automatically.
5. No hard-coded UI text: every string is a key in `i18n/locales/he.ts`. Keys are type-checked.
6. RTL: CSS logical properties only. Displayed user text gets `dir={dirOf(text)}` (`lib/text.ts`), not
   `dir="auto"`, because mixed Hebrew/English strings starting with English render backwards. Inputs keep `dir="auto"`.
7. User text is rendered as text. `dangerouslySetInnerHTML` is a lint error.
8. After any backend API change: `uv run python -m scripts.export_openapi` (backend/), then `npm run gen:api` (frontend/).

## Progress tracking
The single source of truth is the JSON block `<script id="progress">` inside `docs/guide.html`.
- Starting a stage: set its `status` to `in_progress` and `agent` to your name.
- Finishing a stage: set `status` to `done`, write a one-line `note`, update `updated`.
- Blocked: set `status` to `blocked` and put the question in `note`.
Use `python scripts/progress.py <stage> <status> --agent <name> --note "..."` instead of editing by hand (`python scripts/progress.py` lists stages). Statuses: `todo`, `in_progress`, `done`, `blocked`.

## Commands
Frontend (from `frontend/`): `npm ci`, `npm run dev` (http://localhost:5173, proxies `/api` to :8000),
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

Backend (from `backend/`):
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
