# AGENTS.md

Instructions for any AI agent (Claude, Codex, Cursor, Copilot) working in this repo.

## Project
Kitzur Hub: an EASS (HIT) course product, grown over three assignments.

| Service | Stack | Since |
|---|---|---|
| `backend/` | FastAPI, SQLModel, SQLite, pypdf | EX1 |
| `frontend/` | React 19, TypeScript, Mantine (RTL), TanStack Query, i18next, served by nginx | EX2 |
| `ai-service/` | Pydantic AI on OpenRouter | EX3 (not started) |

Status: EX1 and EX2 complete (stages 1.1 to 1.6 and 2.1 to 2.9). The design, decisions and course
requirements live in `docs/guide.html` (local planning file, gitignored; ask the owner for it if
missing). Read its "Decisions" section before changing anything structural.

## Hard rules
1. Clean, minimal code. No filler comments, no speculative abstractions, no unused exports or props.
2. No em dashes anywhere (code, comments, docs, commit messages). Use a colon, comma or hyphen.
3. Every function, method, component and module has a short docstring (Google style in Python,
   JSDoc in TypeScript). Ruff rule set `D` enforces it in Python.
4. Complex logic gets a short developer note explaining WHY, not what.
5. Anything not already agreed in `docs/guide.html` (Decisions) must be asked to the owner (Gitam) before implementing.
6. Tests never call a paid API or the network.
7. Never commit secrets, real course PDFs or `.db` files. A real transcript is committed only after
   `backend/scripts/anonymize_transcript.py` (speaker roles, names in text, contact details).
   Raw files and the names list stay in `private/` (gitignored).
8. Never claim a check you did not run. If something could not be verified (for example a Docker
   build without registry access), say so in the stage summary.

## Backend rules (`backend/`)
1. One resource, one pattern: `Base` → table / `Create` / `Update` (PATCH, `NOT_NULL` for required
   columns) / `Public` (always has `id`). Request schemas use `extra="forbid"` and a limit on every field.
2. Only the backend touches the database. Rules the client could bypass (grading, deduplication,
   course membership) are enforced on the server.
3. Slow synchronous work (PDF parsing) runs in the thread pool, never directly in an async endpoint.
4. After any API change: `uv run python -m scripts.export_openapi`, then `npm run gen:api` in `frontend/`.

## Frontend rules (`frontend/`)
1. TypeScript strict, no `any`. JSDoc on every function and component.
2. Layers, each with one job:
   - `config/constants.ts`: every magic value and route path. Values that mirror the backend say so.
   - `api/`: the only code that does HTTP (`client.ts`), the error model (`errors.ts`), query keys
     (`keys.ts`), friendly type names (`types.ts`). `schema.d.ts` is generated: never edit it.
   - `hooks/`: all data access and shared logic. Components never call `api` directly.
   - `components/` (and `components/practice/`): reusable UI with no data fetching.
   - `pages/`: one route or tab each, composed from hooks and components.
   - `lib/`: pure helpers (`dates.ts` Israel time, `format.ts`, `text.ts` direction).
   - `app/`: providers, theme, router, query client policy. `i18n/`: setup and locale files.
3. Every data view renders through `<QueryState>` (loading, error with retry, empty with a next step, content).
4. Errors become text only through `useErrorMessage`. Writes never retry automatically, and every
   write refetches its lists when it settles (success or failure).
5. No hard-coded UI text: every string is a key in `i18n/locales/he.ts`. Keys are type-checked.
6. RTL: CSS logical properties only. Displayed user text gets `dir={dirOf(text)}` (`lib/text.ts`),
   not `dir="auto"`, because mixed Hebrew/English strings that start with English render backwards.
   Inputs keep `dir="auto"`.
7. User text is rendered as text. `dangerouslySetInnerHTML` is a lint error.
8. Do not name a variable `describe`: Biome's Playwright rules flag it as a test block.

## Tests
- Backend: pytest, one temporary SQLite file per test.
- Frontend: Vitest + Testing Library, backend mocked with MSW (`tests/msw/server.ts`). Render through
  `tests/render.tsx`, which uses Mantine's test environment (no transitions or portals).
- End to end: Playwright (`frontend/e2e`) against a fresh real backend.
- Every new guard gets a "break it on purpose" check: remove it once and confirm a test fails.
  The README table lists the current ones.

## Git and PRs
- One stage = one branch = one PR, small enough to review in one sitting.
- Branch names: `ex<N>/<stage>-<topic>`, for example `ex3/3.2-summary-agent`.
- When stages are stacked (each branch built on the previous one), merge PRs oldest first with a
  merge commit (`gh pr merge <branch> --merge --delete-branch`), so the next PR keeps a clean diff.
- Commit and push are done by the owner unless he asks otherwise.

## Progress tracking
The single source of truth is the JSON block `<script id="progress">` inside `docs/guide.html`.
Use `python scripts/progress.py <stage> <status> --agent <name> --note "..."`
(`python scripts/progress.py` lists stages). Statuses: `todo`, `in_progress`, `done`, `blocked`.
Blocked: put the question in `note`.

## Commands
Whole stack: `docker compose up --build --wait`, then http://localhost:8501 (API on :8000).

Frontend (from `frontend/`): `npm ci`, `npm run dev` (http://localhost:5173, proxies `/api` to :8000),
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run e2e`
(first time: `npx playwright install chromium`).

Backend (from `backend/`):
```bash
uv sync                      # install
uv run fastapi dev           # run on :8000
uv run pytest                # tests
uv run ruff check .. && uv run ruff format --check ..
```
Running inside a Linux VM against a macOS checkout? Keep the venv out of the repo
(`export UV_PROJECT_ENVIRONMENT=$HOME/.venvs/kitzur-hub-backend`) and keep `node_modules` in a
separate copy: macOS and Linux need different native binaries.

## Before finishing any stage
1. Backend: pytest and ruff pass. Frontend: tests, lint, typecheck and build pass.
2. `python scripts/check_no_em_dash.py` passes.
3. UI changes were looked at in a real browser (desktop and phone width), not only in tests.
4. The stage summary says what was done, how, what to understand, and what was not verified.
5. Progress block updated.

## Lessons learned (keep adding)
Each one cost time once. Turn new ones into a rule here.

| What happened | Rule |
|---|---|
| Real PDFs had mirrored brackets; Kitzur wrote English dates the importer could not read | Test parsers on real files (kept in `private/`) before calling them done |
| A first bracket-fix rule broke the real syllabus | Check a heuristic on every real sample, not only the one that motivated it |
| Screenshots showed a truncated badge, backwards titles and a misleading 422 message that all tests missed | Look at every UI stage in a browser before marking it done |
| Behind nginx a stopped backend returns a 502 page, not a network error | Test failure paths through the production path (the proxy), not only the dev server |
| A README manual check claimed a message the app did not show | Run every documented check before writing it down |
| New major versions (TypeScript 7, MSW 3, Mantine 9) changed APIs | Read the installed `.d.ts` before using an API; pin tools that need an older compiler (TypeScript 5.9 for openapi-typescript) |
| jsdom: Mantine modals animate, `scrollIntoView` is missing, uploaded files lose their names | Use `tests/render.tsx` (Mantine test env), the setup polyfills, and let mocks tell files apart by content |
| The owner's computer went to sleep mid-stage | Commit at the end of every stage and keep work reproducible from a clean clone |
