"""Tasks: nested list/create on a course, single-resource routes at ``/tasks/{id}``.

List accepts optional ``status`` and sorts by due date (undated last).
POST always sets manual origin.
"""

from fastapi import APIRouter, Response
from sqlmodel import col, select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.models import Course, Task, TaskCreate, TaskPublic, TaskStatus, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/courses/{course_id}/tasks", response_model=list[TaskPublic])
def list_tasks(
    course_id: int,
    session: SessionDep,
    status: TaskStatus | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
) -> list[Task]:
    """List a course's tasks, ordered by earliest deadline first, undated tasks last."""
    get_or_404(session, Course, course_id)

    query = select(Task).where(Task.course_id == course_id)
    if status is not None:
        query = query.where(Task.status == status)

    # NULL due_at sorts after real deadlines (same pattern as lecture held_on).
    query = query.order_by(col(Task.due_at).is_(None), col(Task.due_at), col(Task.id))

    return list(session.exec(query.offset(offset).limit(limit)))


# CRUD


@router.post("/courses/{course_id}/tasks", response_model=TaskPublic, status_code=201)
def create_task(course_id: int, body: TaskCreate, session: SessionDep) -> Task:
    """Create a manual task in a course."""
    get_or_404(session, Course, course_id)

    # origin defaults to MANUAL on the table; clients cannot set syllabus/lecture via POST.
    task = Task.model_validate(body, update={"course_id": course_id})

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


@router.get("/tasks/{task_id}", response_model=TaskPublic)
def read_task(task_id: int, session: SessionDep) -> Task:
    """Return one task."""
    return get_or_404(session, Task, task_id)


@router.patch("/tasks/{task_id}", response_model=TaskPublic)
def update_task(task_id: int, body: TaskUpdate, session: SessionDep) -> Task:
    """Apply only the fields present in the body."""
    task = get_or_404(session, Task, task_id)
    task.sqlmodel_update(body.model_dump(exclude_unset=True))

    session.commit()
    session.refresh(task)

    return task


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, session: SessionDep) -> Response:
    """Delete a task."""
    session.delete(get_or_404(session, Task, task_id))
    session.commit()

    return Response(status_code=204)
