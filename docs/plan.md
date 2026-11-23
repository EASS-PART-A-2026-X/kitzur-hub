# Plan

What is left and how each next stage is defined. Status per stage: `python scripts/progress.py`.
Decisions: [decisions.md](decisions.md). Rules and lessons: [../AGENTS.md](../AGENTS.md).

## Now
- **EX1** (backend): done.
- **EX2** (frontend + backend), due Mon 30 Nov 2026, 23:59: built. Owner steps left:
  1. `docker compose up --build --wait` on the Mac (the Docker build could not run in the agent sandbox).
  2. Push the stacked branches and open the PRs (`private/ex2-stages/open_prs.sh`), merge oldest first with merge commits.
  3. Run the README "Manual checks" once on `main`, then submit the repo URL.
- **EX3** (complete product), due Mon 11 Jan 2027, 23:59, with a demo and an individual oral.

## EX3 stages
Confirm this table with the owner before starting 3.1. Stages on separate folders can run in parallel sessions.

| Stage | Goal | Done when |
|---|---|---|
| 3.1 | `ai-service/` scaffold: FastAPI, Pydantic AI, `AI_MODEL` (`test` = TestModel, or an OpenRouter GLM slug) | `/health` works; tests pass offline with `ALLOW_MODEL_REQUESTS = False` |
| 3.2 | `POST /summarize-lecture` returns `LectureSummary` (port of Kitzur's schema) | Validators enforce Hebrew ratio, completeness, 4 distinct options and grounded quotes; each validator has a failing test when removed |
| 3.3 | Backend jobs for long AI calls | 202 + `GET /jobs/{id}`, idempotency key, stuck jobs failed on restart, AI down maps to 503 quickly |
| 3.4 | AI outputs as HTML documents | Jinja2 templates (summary, plan, readiness) render from stored JSON with autoescape; view in an iframe and download |
| 3.5 | `POST /analyze-course` on syllabus + past exams | Deliverables become suggested tasks, exam topics are stored, every item quotes its source |
| 3.6 | Readiness report | Deterministic score, study-next list with reasons, dashboard tab |
| 3.7 | Generated questions in Practice | Summary questions saved with topic links; practice weighted by topic |
| 3.8 | Evals | 10 synthetic Hebrew cases, at least 3 evaluators, dated results table in the README |
| 3.9 | Compose with 3 services | AI port not published, failure drills (AI down, backend down) documented and tested |
| 3.10 | Release | `ci.yml` green, `scripts/clean-checkout.sh`, runbook, `v1.0.0-rc.1`, rehearsal, `v1.0.0` |

## Backlog (not required)
Route code splitting (bundle over 500 KB), Kitzur "Send to Hub", calendar export, English locale, dark mode, task board drag and drop.

## Open questions for the lecturer
Submission channel; React frontend accepted; real anonymized lecture text in the repo; building on Kitzur.
