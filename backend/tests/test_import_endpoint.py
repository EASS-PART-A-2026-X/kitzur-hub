"""Tests for POST /courses/{id}/lectures/import."""

from fastapi.testclient import TestClient
from httpx import Response

from app.routers.lectures import MAX_UPLOAD_BYTES
from tests.test_importers import load


def upload(client: TestClient, course_id: int, name: str, data: bytes) -> Response:
    """Post one file to the import endpoint and return the response."""
    return client.post(f"/courses/{course_id}/lectures/import", files={"file": (name, data)})


def test_import_creates_lecture(client: TestClient, course_id: int) -> None:
    """A valid file gives 201 and the lecture shows up with its transcript."""
    response = upload(client, course_id, "l2.transcript.md", load("kitzur.transcript.md"))
    assert response.status_code == 201
    body = response.json()
    assert (body["source_format"], body["segment_count"], body["held_on"]) == (
        "md",
        3,
        "2026-10-26",
    )
    detail = client.get(f"/lectures/{body['id']}").json()
    assert detail["segments"][0]["speaker"] == "מרצה"


def test_same_transcript_twice_is_409(client: TestClient, course_id: int) -> None:
    """Re-uploading identical content points to the existing lecture."""
    first = upload(client, course_id, "a.md", load("kitzur.transcript.md")).json()
    response = upload(client, course_id, "renamed.md", load("kitzur.transcript.md"))
    assert response.status_code == 409
    assert response.json()["detail"]["lecture_id"] == first["id"]


def test_same_transcript_in_another_course_is_allowed(client: TestClient, course_id: int) -> None:
    """Deduplication is per course."""
    other = client.post("/courses", json={"name": "B", "code": "B", "semester": "S"}).json()["id"]
    upload(client, course_id, "a.md", load("kitzur.transcript.md"))
    assert upload(client, other, "a.md", load("kitzur.transcript.md")).status_code == 201


def test_error_codes(client: TestClient, course_id: int) -> None:
    """413 too large, 415 unknown type, 422 unusable content, 404 unknown course."""
    assert upload(client, course_id, "big.txt", b"a" * (MAX_UPLOAD_BYTES + 1)).status_code == 413
    assert upload(client, course_id, "deck.pdf", b"%PDF").status_code == 415
    bad = upload(client, course_id, "x.json", b'{"result": {}}')
    assert bad.status_code == 422
    assert "transcriptList" in bad.json()["detail"]
    assert upload(client, 999, "a.md", load("kitzur.transcript.md")).status_code == 404


def test_missing_file_field_is_422(client: TestClient, course_id: int) -> None:
    """The multipart body must contain a ``file`` field."""
    assert client.post(f"/courses/{course_id}/lectures/import").status_code == 422
