"""CRUD for courses at ``/courses``.

Root resource: a delete cascades to that course's lectures and tasks.
"""

from fastapi import APIRouter, Response
from sqlmodel import select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.models import Course, CourseCreate, CoursePublic, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CoursePublic])
def list_courses(session: SessionDep, limit: Limit = 50, offset: Offset = 0) -> list[Course]:
    """List courses ordered by id."""
    return list(session.exec(select(Course).order_by(Course.id).offset(offset).limit(limit)))


@router.post("", response_model=CoursePublic, status_code=201)
def create_course(body: CourseCreate, session: SessionDep) -> Course:
    """Create a course."""
    course = Course.model_validate(body)

    session.add(course)
    session.commit()
    session.refresh(course)

    return course


@router.get("/{course_id}", response_model=CoursePublic)
def read_course(course_id: int, session: SessionDep) -> Course:
    """Return one course."""
    return get_or_404(session, Course, course_id)


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
