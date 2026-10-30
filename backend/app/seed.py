"""Idempotent demo data for a fresh database: the EASS course itself."""

from datetime import datetime
from pathlib import Path

from sqlalchemy import Engine
from sqlmodel import Session, select

from app.importers import build_lecture
from app.models import Course, CourseCreate, Task, TaskCreate, TaskKind

SEED_DIR = Path(__file__).parent / "seed_data"

# Real EASS lectures, anonymized with scripts/anonymize_transcript.py.
DEMO_LECTURES = ("eass-lecture-01.transcript.md", "eass-lecture-02.transcript.md")

DEMO_COURSE = CourseCreate(
    name="Engineering of Advanced Software Solutions",
    code="EASS",
    semester="2027A",
)

DEMO_TASKS = [
    TaskCreate(title="EX1: Backend", kind=TaskKind.HOMEWORK, due_at=datetime(2026, 11, 9, 23, 59)),
    TaskCreate(
        title="EX2: Frontend + backend",
        kind=TaskKind.HOMEWORK,
        due_at=datetime(2026, 11, 30, 23, 59),
    ),
    TaskCreate(
        title="EX3: Complete product", kind=TaskKind.PROJECT, due_at=datetime(2027, 1, 11, 23, 59)
    ),
    TaskCreate(
        title="Open-source evidence: 3 merged PRs",
        kind=TaskKind.OTHER,
        due_at=datetime(2027, 1, 11, 23, 59),
    ),
]


def seed(engine: Engine) -> bool:
    """Insert the demo course, lectures and tasks if the database has no courses.

    Data goes through the Create schemas above, so the seed obeys the same limits
    as API input. Running it twice changes nothing.

    Args:
        engine: Engine to write to.

    Returns:
        True if data was inserted, False if the database already had courses.
    """
    with Session(engine) as session:
        if session.exec(select(Course.id).limit(1)).first() is not None:
            return False
        course = Course.model_validate(DEMO_COURSE)
        session.add(course)
        session.flush()  # assigns course.id for the tasks below
        for name in DEMO_LECTURES:
            session.add(build_lecture(course.id, name, (SEED_DIR / name).read_bytes()))
        for task in DEMO_TASKS:
            session.add(Task.model_validate(task, update={"course_id": course.id}))
        session.commit()
        return True
