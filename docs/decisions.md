# Decision log

Append one line per decision: date, decision, short reason. Never edit old lines; supersede them.

| Date | Decision | Why |
|---|---|---|
| 2026-10-26 | Product: Kitzur Hub, a per-course study hub; solo | Real use by the owner; builds on Kitzur |
| 2026-10-26 | Three services: React frontend, FastAPI backend (only one touching SQLite), Pydantic AI service | Course requirement |
| 2026-10-26 | Hebrew content, RTL UI | Real HIT Zoom transcripts are Hebrew |
| 2026-10-26 | Kitzur extension stays standalone; the hub imports downloaded transcript files | Graders have no Zoom access; "Send to Hub" later |
| 2026-10-26 | Practice is multiple choice and flashcards only | Deterministic grading |
| 2026-10-26 | AI extracts facts from syllabus and exams; code computes readiness | Grounded, testable feedback |
| 2026-10-26 | Real model: GLM via OpenRouter, optional; tests use TestModel | Owner's current model; graders need no key |
| 2026-10-26 | Long AI calls run as background jobs (202 + polling) | Summaries take 1 to 3 minutes |
| 2026-10-26 | AI features output HTML documents rendered by templates from stored JSON | Viewable anywhere; the model never writes markup |
| 2026-10-26 | Backend: uv, Python 3.14, SQLModel + SQLite, nested list routes, cascade deletes | Course reference stack |
| 2026-10-26 | Lecture segments stored as JSON; speakers stored as roles only | Read whole; privacy |
| 2026-10-26 | Task deadlines are Israel wall-clock times without a zone | Course deadlines are published that way |
| 2026-10-30 | Seed = the EASS course with its real lectures, anonymized by `backend/scripts/anonymize_transcript.py` | Realistic demo data without personal data |
| 2026-10-30 | Frontend: Mantine, TanStack Query, React Router, i18next with typed keys, Biome, types generated from OpenAPI | Owner request: separation of concerns, constants, hooks, i18n |
| 2026-10-30 | Materials (PDF/TXT/MD) in EX2, AI analysis in EX3 | Surface the Hebrew PDF risk early |
| 2026-10-30 | Docker Compose with 2 services already in EX2 | One command for graders |
| 2026-10-30 | Server grades answers; practice serves least practiced questions first | Server owns the truth; prepares EX3 weighting |
| 2026-11-05 | nginx serves the app and proxies `/api` | Same origin, no CORS |
| 2026-11-05 | Displayed user text uses `dirOf()` instead of `dir="auto"` | Mixed Hebrew/English strings rendered backwards |
| 2026-11-05 | TypeScript pinned to 5.9 | openapi-typescript needs the TypeScript 5 compiler API |
| 2026-11-05 | One stage = one branch = one PR; stacked PRs merged oldest first with merge commits | Easy review |
| 2026-11-23 | The repo is the project memory: `AGENTS.md`, `docs/plan.md`, `docs/decisions.md`, `docs/progress.json`, all public | Works for every tool and parallel session; graders may see it |
| 2026-11-23 | No AI attribution in commits or PRs, enforced by a `commit-msg` hook | Owner rule |
