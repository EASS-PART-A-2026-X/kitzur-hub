"""Lectures under a course (list, import) and by id (read, patch, delete).

New rows only from ``POST …/lectures/import``; importers normalize and anonymize speakers.
Re-importing the same transcript in one course is rejected (409).
Full segments only on GET ``/lectures/{id}``.
"""

from fastapi import APIRouter, HTTPException, Response, UploadFile
from sqlmodel import col, select

from app.deps import Limit, Offset, SessionDep, get_or_404
from app.importers import TranscriptError, UnsupportedFormatError, build_lecture
from app.models import Course, Lecture, LectureDetail, LecturePublic, LectureUpdate

MAX_UPLOAD_BYTES = 5 * 1024 * 1024

router = APIRouter(tags=["lectures"])


def to_public(lecture: Lecture) -> LecturePublic:
    """Build the list view of a lecture without its transcript.

    Args:
        lecture: Table row.

    Returns:
        Metadata plus the number of transcript segments.
    """
    return LecturePublic.model_validate(lecture, update={"segment_count": len(lecture.segments)})


def to_detail(lecture: Lecture) -> LectureDetail:
    """Build the single-item view of a lecture, including its transcript.

    Args:
        lecture: Table row.

    Returns:
        Metadata plus validated segments.
    """
    return LectureDetail.model_validate(lecture, update={"segment_count": len(lecture.segments)})


@router.get("/courses/{course_id}/lectures", response_model=list[LecturePublic])
def list_lectures(
    course_id: int, session: SessionDep, limit: Limit = 50, offset: Offset = 0
) -> list[LecturePublic]:
    """List a course's lectures ordered by date, undated lectures last."""
    get_or_404(session, Course, course_id)

    # NULL held_on sorts after dated lectures (same pattern as task due_at).
    query = (
        select(Lecture)
        .where(Lecture.course_id == course_id)
        .order_by(col(Lecture.held_on).is_(None), col(Lecture.held_on), col(Lecture.id))
    )

    return [to_public(lec) for lec in session.exec(query.offset(offset).limit(limit))]


@router.post(
    "/courses/{course_id}/lectures/import",
    response_model=LecturePublic,
    status_code=201,
    responses={409: {}, 413: {}, 415: {}, 422: {}},
)
async def import_lecture(course_id: int, file: UploadFile, session: SessionDep) -> LecturePublic:
    """Create a lecture from an uploaded transcript file.

    Accepted: Kitzur ``.transcript.md``, raw Zoom ``.json``, ``.vtt`` and ``.txt``.
    Speakers are anonymized before anything is stored.

    Developer note: the body is read with a cap of MAX_UPLOAD_BYTES + 1 so an
    oversized upload is detected without loading the whole file into memory.

    Raises:
        HTTPException: 404 unknown course, 409 same transcript already in this
            course, 413 file too large, 415 unsupported format, 422 unusable content.
    """
    get_or_404(session, Course, course_id)

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"file is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")

    try:
        lecture = build_lecture(course_id, file.filename or "", data)
    except UnsupportedFormatError as exc:
        raise HTTPException(415, str(exc)) from None
    except TranscriptError as exc:
        raise HTTPException(422, str(exc)) from None

    # Per-course sha256: same normalized transcript must not become a second row.
    duplicate = session.exec(
        select(Lecture.id).where(Lecture.course_id == course_id, Lecture.sha256 == lecture.sha256)
    ).first()
    if duplicate is not None:
        raise HTTPException(
            409, {"message": "this transcript is already imported", "lecture_id": duplicate}
        )

    session.add(lecture)
    session.commit()
    session.refresh(lecture)

    return to_public(lecture)


@router.get("/lectures/{lecture_id}", response_model=LectureDetail)
def read_lecture(lecture_id: int, session: SessionDep) -> LectureDetail:
    """Return one lecture with its transcript."""
    return to_detail(get_or_404(session, Lecture, lecture_id))


@router.patch("/lectures/{lecture_id}", response_model=LecturePublic)
def update_lecture(lecture_id: int, body: LectureUpdate, session: SessionDep) -> LecturePublic:
    """Rename or re-date a lecture. The transcript cannot be edited."""
    lecture = get_or_404(session, Lecture, lecture_id)

    lecture.sqlmodel_update(body.model_dump(exclude_unset=True))

    session.commit()
    session.refresh(lecture)

    return to_public(lecture)


@router.delete("/lectures/{lecture_id}", status_code=204)
def delete_lecture(lecture_id: int, session: SessionDep) -> Response:
    """Delete a lecture."""
    session.delete(get_or_404(session, Lecture, lecture_id))
    session.commit()

    return Response(status_code=204)
