"""Tests for the course material endpoints."""

from fastapi.testclient import TestClient
from httpx import Response

from app.routers.lectures import MAX_UPLOAD_BYTES
from tests.pdf_factory import make_pdf

PDF = make_pdf([["Week 1: HTTP", "Week 2: Persistence"]])


def upload(
    client: TestClient, course_id: int, name: str, data: bytes, kind: str | None = "syllabus"
) -> Response:
    """Post one file (and optionally its kind) to the materials endpoint."""
    form = {"kind": kind} if kind is not None else {}
    return client.post(f"/courses/{course_id}/materials", files={"file": (name, data)}, data=form)


def test_upload_pdf(client: TestClient, course_id: int) -> None:
    """A text PDF is stored as extracted text with its page count."""
    response = upload(client, course_id, "syllabus.pdf", PDF)
    assert response.status_code == 201
    body = response.json()
    assert (body["kind"], body["filename"], body["page_count"]) == ("syllabus", "syllabus.pdf", 1)
    assert body["char_count"] > 0
    assert "text" not in body
    detail = client.get(f"/materials/{body['id']}").json()
    assert detail["text"] == "Week 1: HTTP\nWeek 2: Persistence"


def test_duplicate_text_is_409_even_with_another_name(client: TestClient, course_id: int) -> None:
    """Deduplication uses the extracted text, not the file name."""
    first = upload(client, course_id, "a.pdf", PDF).json()
    response = upload(client, course_id, "renamed.pdf", PDF, kind="past_exam")
    assert response.status_code == 409
    assert response.json()["detail"]["material_id"] == first["id"]


def test_error_codes(client: TestClient, course_id: int) -> None:
    """413 too large, 415 unsupported, 422 scanned PDF or bad kind, 404 unknown course."""
    assert upload(client, course_id, "big.txt", b"a" * (MAX_UPLOAD_BYTES + 1)).status_code == 413
    assert upload(client, course_id, "s.docx", b"PK").status_code == 415
    scanned = upload(client, course_id, "scan.pdf", make_pdf([[]]))
    assert scanned.status_code == 422
    assert "no text layer" in scanned.json()["detail"]
    assert upload(client, course_id, "s.txt", b"text", kind="homework").status_code == 422
    assert upload(client, course_id, "s.txt", b"text", kind=None).status_code == 422
    assert upload(client, 999, "s.txt", b"text").status_code == 404


def test_list_filters_by_kind_newest_first(client: TestClient, course_id: int) -> None:
    """The kind filter works and the latest upload comes first."""
    upload(client, course_id, "syllabus.txt", b"syllabus")
    upload(client, course_id, "exam-2024.txt", b"exam 2024", kind="past_exam")
    upload(client, course_id, "exam-2025.txt", b"exam 2025", kind="past_exam")
    url = f"/courses/{course_id}/materials"
    assert [m["filename"] for m in client.get(url).json()] == [
        "exam-2025.txt",
        "exam-2024.txt",
        "syllabus.txt",
    ]
    exams = client.get(url, params={"kind": "past_exam"}).json()
    assert [m["filename"] for m in exams] == ["exam-2025.txt", "exam-2024.txt"]


def test_patch_and_delete(client: TestClient, course_id: int) -> None:
    """Kind and name are editable; null name is rejected; delete is final."""
    material_id = upload(client, course_id, "x.txt", b"text").json()["id"]
    url = f"/materials/{material_id}"
    assert client.patch(url, json={"kind": "past_exam"}).json()["kind"] == "past_exam"
    assert client.patch(url, json={"filename": None}).status_code == 422
    assert client.patch(url, json={"text": "edited"}).status_code == 422
    assert client.delete(url).status_code == 204
    assert client.get(url).status_code == 404


def test_deleting_course_deletes_materials(client: TestClient, course_id: int) -> None:
    """Materials belong to their course."""
    material_id = upload(client, course_id, "x.txt", b"text").json()["id"]
    client.delete(f"/courses/{course_id}")
    assert client.get(f"/materials/{material_id}").status_code == 404
