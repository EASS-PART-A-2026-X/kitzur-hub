"""Practice questions and graded attempts."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import case, func
from sqlalchemy.sql.elements import Label
from sqlmodel import Session, col, select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.models import (
    Attempt,
    AttemptCreate,
    AttemptResult,
    Course,
    Lecture,
    PracticeSummary,
    Question,
    QuestionCreate,
    QuestionDetail,
    QuestionPublic,
    QuestionType,
)

router = APIRouter(tags=["questions"])

PracticeCount = Annotated[int, Query(ge=1, le=50)]


def attempt_count_column() -> Label[int]:
    """Correlated subquery counting the attempts of the outer Question row.

    Returns:
        A labeled scalar subquery usable in select() and order_by().
    """
    return (
        select(func.count(col(Attempt.id)))
        .where(Attempt.question_id == Question.id)
        .scalar_subquery()
        .label("attempt_count")
    )


def check_lecture(session: Session, course_id: int, lecture_id: int | None) -> None:
    """Make sure a lecture filter or link points at a lecture of this course.

    Args:
        session: Open session.
        course_id: The course in the URL.
        lecture_id: Lecture id from the body or query, if any.

    Raises:
        HTTPException: 422 if the lecture does not exist in this course.
    """
    if lecture_id is None:
        return
    lecture = session.get(Lecture, lecture_id)
    if lecture is None or lecture.course_id != course_id:
        raise HTTPException(422, f"lecture {lecture_id} is not part of course {course_id}")


@router.post("/courses/{course_id}/questions", response_model=QuestionDetail, status_code=201)
def create_question(course_id: int, body: QuestionCreate, session: SessionDep) -> QuestionDetail:
    """Add a question to a course, optionally linked to one of its lectures."""
    get_or_404(session, Course, course_id)
    check_lecture(session, course_id, body.lecture_id)
    question = Question.model_validate(body, update={"course_id": course_id})
    session.add(question)
    session.commit()
    session.refresh(question)
    return QuestionDetail.model_validate(question)


@router.get("/courses/{course_id}/questions", response_model=list[QuestionDetail])
def list_questions(
    course_id: int,
    session: SessionDep,
    lecture_id: int | None = None,
    type: QuestionType | None = None,
    limit: Limit = 50,
    offset: Offset = 0,
) -> list[QuestionDetail]:
    """List a course's questions with their answers, for review."""
    get_or_404(session, Course, course_id)
    count = attempt_count_column()
    query = select(Question, count).where(Question.course_id == course_id)
    if lecture_id is not None:
        query = query.where(Question.lecture_id == lecture_id)
    if type is not None:
        query = query.where(Question.type == type)
    rows = session.exec(query.order_by(col(Question.id)).offset(offset).limit(limit))
    return [QuestionDetail.model_validate(q, update={"attempt_count": n}) for q, n in rows]


@router.get("/courses/{course_id}/practice", response_model=list[QuestionPublic])
def practice_session(
    course_id: int,
    session: SessionDep,
    count: PracticeCount = 10,
    lecture_id: int | None = None,
    type: QuestionType | None = None,
) -> list[QuestionPublic]:
    """Pick questions for a practice session, least practiced first.

    Developer note: ordering by attempt count and then random() means a new
    session covers unseen questions before repeating any, while ties are
    shuffled so two sessions do not look identical.
    """
    get_or_404(session, Course, course_id)
    check_lecture(session, course_id, lecture_id)
    attempts = attempt_count_column()
    query = select(Question, attempts).where(Question.course_id == course_id)
    if lecture_id is not None:
        query = query.where(Question.lecture_id == lecture_id)
    if type is not None:
        query = query.where(Question.type == type)
    rows = session.exec(query.order_by(attempts, func.random()).limit(count))
    return [QuestionPublic.model_validate(q, update={"attempt_count": n}) for q, n in rows]


@router.get("/courses/{course_id}/practice/summary", response_model=PracticeSummary)
def practice_summary(course_id: int, session: SessionDep) -> PracticeSummary:
    """Totals over every attempt in a course."""
    get_or_404(session, Course, course_id)
    questions = session.exec(
        select(func.count(col(Question.id))).where(Question.course_id == course_id)
    ).one()
    attempted, attempts, correct = session.exec(
        select(
            func.count(func.distinct(Attempt.question_id)),
            func.count(col(Attempt.id)),
            func.coalesce(func.sum(case((col(Attempt.correct), 1), else_=0)), 0),
        )
        .join(Question, col(Question.id) == Attempt.question_id)
        .where(Question.course_id == course_id)
    ).one()
    return PracticeSummary(
        questions=questions,
        attempted_questions=attempted,
        attempts=attempts,
        correct_attempts=correct,
        accuracy=round(correct / attempts, 3) if attempts else None,
    )


@router.get("/questions/{question_id}", response_model=QuestionDetail)
def read_question(question_id: int, session: SessionDep) -> QuestionDetail:
    """Return one question with its answer."""
    question = get_or_404(session, Question, question_id)
    count = session.exec(
        select(func.count(col(Attempt.id))).where(Attempt.question_id == question_id)
    ).one()
    return QuestionDetail.model_validate(question, update={"attempt_count": count})


@router.delete("/questions/{question_id}", status_code=204)
def delete_question(question_id: int, session: SessionDep) -> Response:
    """Delete a question and its attempts."""
    session.delete(get_or_404(session, Question, question_id))
    session.commit()
    return Response(status_code=204)


@router.post("/questions/{question_id}/attempts", response_model=AttemptResult, status_code=201)
def answer_question(question_id: int, body: AttemptCreate, session: SessionDep) -> AttemptResult:
    """Grade and store one answer, then reveal the solution.

    Multiple choice is graded by the server against ``correct_index``; a
    flashcard is self-graded with ``knew``.

    Raises:
        HTTPException: 404 unknown question, 422 if the body does not match
            the question type.
    """
    question = get_or_404(session, Question, question_id)
    if question.type is QuestionType.MCQ:
        if body.chosen_index is None or body.knew is not None:
            raise HTTPException(422, "multiple choice expects chosen_index only")
        correct = body.chosen_index == question.correct_index
    else:
        if body.knew is None or body.chosen_index is not None:
            raise HTTPException(422, "a flashcard expects knew only")
        correct = body.knew

    attempt = Attempt(
        question_id=question_id,
        correct=correct,
        chosen_index=body.chosen_index,
        answered_at=datetime.now(UTC),
    )
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return AttemptResult(
        id=attempt.id,
        question_id=question_id,
        correct=correct,
        correct_index=question.correct_index,
        explanation=question.explanation,
        answer=question.answer,
    )
