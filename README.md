# Kitzur Hub

A study hub for one university course: import lecture transcripts, track deadlines, and (from EX3) get Hebrew summaries, practice questions and an exam-readiness report.

EASS course project, HIT, semester A 2026-27. Repository: `EASS-PART-A-2026-X/kitzur-hub`.

> **Status: EX1 (backend).** The frontend arrives in EX2 and the AI service in EX3.

## Product sketch

**Purpose.** A student's course knowledge is scattered across hours of Zoom recordings, a syllabus PDF and old exams, so it is hard to know what is left to do and what the exam actually weighs.

**Operational principle.** After I drop the syllabus and two past exams and press _Analyze_, the course deadlines and exam topics appear; after I drop a lecture transcript and press _Summarize_, its Hebrew summary and practice questions are linked to those topics; after I practise, my readiness score and "study next" list update, and everything is still there tomorrow.

**User stories.**

1. As a student, I can drop a lecture transcript so that I get a Hebrew summary, flashcards and multiple-choice questions.
2. As a student, I can drop the syllabus and past exams so that I see every deliverable, its due date and which topics the exam weighs most.
3. As a student, I can practise questions weighted by exam importance so that I know what to study before the exam.

**Data (EX1).**

| Record  | Fields (type, limit)                                                                                                                                                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course  | name (str, 1-80), code (str, 1-20), semester (str, 1-20), exam_date (date, optional)                                                                                               |
| Lecture | title (str, 1-200), held_on (date, optional), source_format (md/json/vtt/txt), segments (list of {start_sec, end_sec, speaker, text 1-5000}), duration_sec, sha256                 |
| Task    | title (str, 1-200), kind (hw/exam/project/quiz/other), due_at (local datetime, optional), weight_pct (0-100, optional), status (todo/doing/done), origin (manual/syllabus/lecture) |

**AI service (EX3).** Turns messy Hebrew course text into validated, structured study data: a lecture summary with questions, and a course plan (deliverables and exam topics).

**Data flow.**

```text
browser -> frontend (React, :8501) -> backend (FastAPI, :8000) -> SQLite (backend only)
                                              \-> ai-service (Pydantic AI, :8001, called only by the backend)
```

## Run

Requirements: [uv](https://docs.astral.sh/uv/) (installs Python 3.14 itself) and Docker Desktop.

### Locally

```bash
cd backend
uv sync
uv run fastapi dev            # http://localhost:8000, API docs at /docs
```

The database is created at `backend/data/app.db` and seeded on first start with the EASS course itself: its first two real lectures (anonymized), 12 practice questions and its four deadlines.

### With Docker

```bash
cd backend
docker build -t kitzur-hub-backend .
docker run -d --name backend -p 127.0.0.1:8000:8000 -v backend-data:/app/data kitzur-hub-backend
curl localhost:8000/health    # {"status":"ok"}
```

Data lives in the `backend-data` volume and survives `docker rm -f backend` plus a new `docker run`. Deleting the volume (`docker volume rm backend-data`) resets to the seed.

### Configuration

| Variable       | Default                                                          | Meaning                        |
| -------------- | ---------------------------------------------------------------- | ------------------------------ |
| `DATABASE_URL` | `sqlite:///./data/app.db` (Docker: `sqlite:////app/data/app.db`) | SQLAlchemy URL of the database |

All settings are listed in [`.env.example`](.env.example). No secrets are needed for EX1.

## Test

```bash
cd backend
uv run pytest                                 # each test uses its own temporary database
uv run ruff check . && uv run ruff format --check .
python3 ../scripts/check_no_em_dash.py        # repo style rule
```

## API

| Method             | Path                                               | Success       | Errors                  |
| ------------------ | -------------------------------------------------- | ------------- | ----------------------- |
| GET                | `/health`                                          | 200           |                         |
| GET, POST          | `/courses`                                         | 200, 201      | 422                     |
| GET, PATCH, DELETE | `/courses/{id}`                                    | 200, 200, 204 | 404, 422                |
| GET                | `/courses/{id}/lectures`                           | 200           | 404                     |
| POST               | `/courses/{id}/lectures/import` (multipart `file`) | 201           | 404, 409, 413, 415, 422 |
| GET, PATCH, DELETE | `/lectures/{id}`                                   | 200, 200, 204 | 404, 422                |
| GET, POST          | `/courses/{id}/tasks` (`?status=`)                 | 200, 201      | 404, 422                |
| GET, PATCH, DELETE | `/tasks/{id}`                                      | 200, 200, 204 | 404, 422                |

Lists accept `limit` (1-100, default 50) and `offset`. Request bodies reject unknown fields. PATCH changes only the fields sent; `null` clears optional fields and is rejected for required ones.

### Transcript import

| Extension | Source                                                                       |
| --------- | ---------------------------------------------------------------------------- |
| `.md`     | Kitzur extension, "Download transcript" (`**[HH:MM:SS] name:** text` blocks) |
| `.json`   | Raw Zoom recording-info response (`result.transcriptList`)                   |
| `.vtt`    | WebVTT captions, `Speaker: text` cues                                        |
| `.txt`    | Plain text, one segment per paragraph                                        |

- **Privacy:** only whitelisted fields are read, and speakers are stored as `מרצה` (the speaker with the most text), `סטודנט/ית` or `לא ידוע`, never by name.
- **Real transcripts in this repo** (`backend/app/seed_data/`) went through `backend/scripts/anonymize_transcript.py`: speakers become roles, and every participant name in the text, e-mail address and phone number is replaced by a placeholder. Raw files stay in the gitignored `private/` folder.
- **Duplicates:** the same transcript uploaded twice to one course returns 409 with the existing `lecture_id`.
- **Limits:** files are capped at 5 MB and 300,000 characters.

### Practice questions

- **Types:** multiple choice (exactly 4 distinct options plus `correct_index`) or a flashcard (`answer`). A question may belong to a lecture or to the whole course.
- **Practice sessions** serve the least practiced questions first, with random order among ties. They hide the correct option and explanation of multiple choice questions.
- **Attempts** are graded by the server: send `chosen_index` for multiple choice, or `knew` (self-graded) for a flashcard. The response reveals the solution.
- **Seed:** the demo course ships with 12 hand-written questions on its two lectures. From EX3 the AI service generates them.

### Course materials

Syllabus and past exams (`kind`: `syllabus` or `past_exam`) are stored as extracted text; the file itself is not kept.

| Extension | Handling |
|---|---|
| `.pdf` | Text layer via pypdf. Scanned (image-only) or password-protected PDFs return 422 |
| `.txt`, `.md` | UTF-8 text |

- **Hebrew PDFs:** right-to-left PDFs often extract with mirrored parentheses (`)טקסט(`); complete mirrored pairs are swapped back. Pages that come out one word per line are joined into paragraphs, and other pages keep their line breaks.
- **Duplicates:** the same text uploaded twice to one course returns 409 with the existing `material_id`.
- **Checking a real file:** `uv run python -m scripts.extract_material <file>` prints what would be stored.

### Manual checks

```bash
curl -s -F file=@samples/lecture-03.transcript.md localhost:8000/courses/1/lectures/import   # 201
curl -s -o /dev/null -w "%{http_code}\n" -F file=@samples/lecture-03.transcript.md localhost:8000/courses/1/lectures/import  # 409
curl -s -o /dev/null -w "%{http_code}\n" localhost:8000/courses/999                          # 404
curl -s -o /dev/null -w "%{http_code}\n" --json '{"name": ""}' localhost:8000/courses       # 422
```

## Repository layout

```text
backend/        FastAPI app (app/), tests/, scripts/ (anonymizer), Dockerfile, pyproject.toml, uv.lock
samples/        synthetic transcripts for upload demos
scripts/        progress.py (tracker), check_no_em_dash.py (style check)
AGENTS.md       rules for AI coding agents working in this repo
```

## AI use

- **Tools:** Claude (Anthropic) Code, used as a pair programmer. Cursor (XSI) as an IDE a various of models usage.
- **Help received:** it planned the stages with me and drafted the code and tests for each stage.
- **Checks performed:** I reviewed each stage's code and design decisions. Every stage passed `pytest`, `ruff` and the style check before being marked done, and I ran the Docker verification on my own machine.
- **Upstream work:** all maintainer-facing text in my open-source PRs was written by me.

## Open-source evidence

| Student                       | Repository                                                      | License      | Stars (checked)    | PR                                                           | Contribution                                                                                                | Merge evidence                                                  |
| ----------------------------- | --------------------------------------------------------------- | ------------ | ------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Gitam Shimoni (@GitamShimoni) | [Kludex/starlette](https://github.com/Kludex/starlette)         | BSD-3-Clause | 12.7k (2026-10-26) | [#3713](https://github.com/Kludex/starlette/pull/3713)       | Docs: replaced the removed `route()` decorator hint in the host routing example with `Router(routes=[...])` | Merged into `main` 2026-10-23, commit `fe000fb`                 |
| Gitam Shimoni (@GitamShimoni) | [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) | MIT          | 19.6k (2026-10-26) | [#11149](https://github.com/pydantic/pydantic-ai/pull/11149) | Docs: replaced the deprecated Cerebras model `llama-3.3-70b` with `gpt-oss-120b`                            | Merged into `main` via merge queue 2026-10-25, commit `ead5e54` |
| Gitam Shimoni (@GitamShimoni) | [pydantic/pydantic-ai](https://github.com/pydantic/pydantic-ai) | MIT          | 19.6k (2026-10-26) | [#10625](https://github.com/pydantic/pydantic-ai/pull/10625) | Docs: Heroku examples use Heroku's model ID `claude-4-5-sonnet`                                             | Merged into `main` via merge queue, commit `04942a9`            |

`Kludex/starlette` is the official upstream of Starlette (project site starlette.dev).
