"""CRUD for courses at ``/courses``.

Root resource: a delete cascades to that course's lectures and tasks.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Response
from sqlalchemy import case, func
from sqlmodel import Session, col, select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.models import Course, CourseCreate, CoursePublic, CourseUpdate, Lecture, Task, TaskStatus

LOCAL_TZ = ZoneInfo("Asia/Jerusalem")

router = APIRouter(prefix="/courses", tags=["courses"])


def with_counts(session: Session, courses: list[Course]) -> list[CoursePublic]:
    """Attach lecture count, open task count and next deadline to courses.

    Developer note: three grouped queries for the whole page instead of three
    per course. "Next deadline" is the earliest open task due from now on, in
    Israel wall-clock time, matching how ``Task.due_at`` is stored.

    Args:
        session: Open session.
        courses: Course rows.

    Returns:
        Public courses with their counts.
    """
    ids = [c.id for c in courses]
    now = datetime.now(LOCAL_TZ).replace(tzinfo=None)
    lectures = dict(
        session.exec(
            select(Lecture.course_id, func.count(col(Lecture.id)))
            .where(col(Lecture.course_id).in_(ids))
            .group_by(Lecture.course_id)
        ).all()
    )
    open_tasks = (
        select(Task).where(col(Task.course_id).in_(ids), Task.status != TaskStatus.DONE).subquery()
    )
    stats = {
        course_id: (count, due)
        for course_id, count, due in session.exec(
            select(
                open_tasks.c.course_id,
                func.count(open_tasks.c.id),
                func.min(case((open_tasks.c.due_at >= now, open_tasks.c.due_at))),
            ).group_by(open_tasks.c.course_id)
        ).all()
    }
    return [
        CoursePublic.model_validate(
            course,
            update={
                "lecture_count": lectures.get(course.id, 0),
                "open_task_count": stats.get(course.id, (0, None))[0],
                "next_due_at": stats.get(course.id, (0, None))[1],
            },
        )
        for course in courses
    ]


@router.get("", response_model=list[CoursePublic])
def list_courses(session: SessionDep, limit: Limit = 50, offset: Offset = 0) -> list[CoursePublic]:
    """List courses ordered by id."""
    courses = list(session.exec(select(Course).order_by(Course.id).offset(offset).limit(limit)))
    return with_counts(session, courses)


@router.post("", response_model=CoursePublic, status_code=201)
def create_course(body: CourseCreate, session: SessionDep) -> Course:
    """Create a course."""
    course = Course.model_validate(body)

    session.add(course)
    session.commit()
    session.refresh(course)

    return course


@router.get("/{course_id}", response_model=CoursePublic)
def read_course(course_id: int, session: SessionDep) -> CoursePublic:
    """Return one course."""
    return with_counts(session, [get_or_404(session, Course, course_id)])[0]


@router.patch("/{course_id}", response_model=CoursePublic)
def update_course(course_id: int, body: CourseUpdate, session: SessionDep) -> Course:
    """Apply only the fields present in the body."""
    course = get_or_404(session, Course, course_id)

    # exclude_unset: omitted PATCH keys stay unchanged; explicit null rules are on CourseUpdate.
    course.sqlmodel_update(body.model_dump(exclude_unset=True))

    session.commit()
    session.refresh(course)

    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, session: SessionDep) -> Response:
    """Delete a course together with its lectures and tasks."""
    session.delete(get_or_404(session, Course, course_id))
    session.commit()

    return Response(status_code=204)
