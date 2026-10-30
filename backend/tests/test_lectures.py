"""Lecture read, update and delete tests.

Lectures are created through the import endpoint (stage 1.4); here they are
inserted directly so these tests only cover the CRUD routes.
"""

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Lecture, SourceFormat

SEGMENTS = [
    {"start_sec": 0, "end_sec": 30, "speaker": "מרצה", "text": "שלום לכולם"},
    {"start_sec": 31, "end_sec": 40, "speaker": "סטודנט/ית", "text": "שאלה"},
]


def insert_lecture(client: TestClient, course_id: int, title: str = "שיעור 1") -> int:
    """Insert a lecture row straight into the test database.

    Args:
        client: Test client whose app owns the engine.
        course_id: Parent course.
        title: Lecture title.

    Returns:
        The new lecture id.
    """
    lecture = Lecture(
        course_id=course_id,
        title=title,
        source_format=SourceFormat.TEXT,
        segments=SEGMENTS,
        duration_sec=40,
        sha256=title.encode().hex().ljust(64, "0")[:64],
        created_at=datetime.now(UTC),
    )
    with Session(client.app.state.engine) as session:
        session.add(lecture)
        session.commit()
        return lecture.id


def test_list_returns_metadata_without_transcript(client: TestClient, course_id: int) -> None:
    """The list view carries segment_count but not the segments."""
    insert_lecture(client, course_id)
    [item] = client.get(f"/courses/{course_id}/lectures").json()
    assert item["segment_count"] == 2
    assert "segments" not in item


def test_read_returns_transcript(client: TestClient, course_id: int) -> None:
    """The single-item view includes validated segments."""
    lecture_id = insert_lecture(client, course_id)
    body = client.get(f"/lectures/{lecture_id}").json()
    assert body["segments"][0]["speaker"] == "מרצה"


def test_patch_title_and_date_only(client: TestClient, course_id: int) -> None:
    """Title and date are editable, the transcript is not."""
    lecture_id = insert_lecture(client, course_id)
    url = f"/lectures/{lecture_id}"
    body = client.patch(url, json={"title": "מבוא", "held_on": "2026-10-19"}).json()
    assert (body["title"], body["held_on"]) == ("מבוא", "2026-10-19")
    assert client.patch(url, json={"segments": []}).status_code == 422


def test_missing_lecture_and_course_are_404(client: TestClient) -> None:
    """Unknown lecture ids and unknown parent courses are 404."""
    assert client.get("/lectures/999").status_code == 404
    assert client.get("/courses/999/lectures").status_code == 404


def test_delete(client: TestClient, course_id: int) -> None:
    """Deleting a lecture removes it from the course list."""
    lecture_id = insert_lecture(client, course_id)
    assert client.delete(f"/lectures/{lecture_id}").status_code == 204
    assert client.get(f"/courses/{course_id}/lectures").json() == []
