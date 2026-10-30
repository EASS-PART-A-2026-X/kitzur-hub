"""Course CRUD tests: status codes and bodies."""

from fastapi.testclient import TestClient

from tests.conftest import COURSE


def test_create_returns_201_with_id(client: TestClient) -> None:
    """POST returns the stored course including its new id."""
    response = client.post("/courses", json={**COURSE, "exam_date": "2027-02-01"})
    assert response.status_code == 201
    assert response.json() == {**COURSE, "exam_date": "2027-02-01", "id": 1}


def test_create_rejects_invalid_body(client: TestClient) -> None:
    """Missing or unknown fields give 422 and name the field."""
    response = client.post("/courses", json={"name": "x"})
    assert response.status_code == 422
    assert {err["loc"][-1] for err in response.json()["detail"]} == {"code", "semester"}
    assert client.post("/courses", json={**COURSE, "extra": 1}).status_code == 422


def test_list_and_read(client: TestClient, course_id: int) -> None:
    """The created course appears in the list and by id."""
    assert [c["id"] for c in client.get("/courses").json()] == [course_id]
    assert client.get(f"/courses/{course_id}").json()["code"] == COURSE["code"]


def test_list_limit_is_bounded(client: TestClient) -> None:
    """Limit above 100 is rejected before the handler runs."""
    response = client.get("/courses", params={"limit": 101})
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "limit"]


def test_missing_course_is_404(client: TestClient) -> None:
    """Read, update and delete of an unknown id all return 404."""
    assert client.get("/courses/999").status_code == 404
    assert client.patch("/courses/999", json={"name": "x"}).status_code == 404
    assert client.delete("/courses/999").status_code == 404


def test_patch_changes_only_sent_fields(client: TestClient, course_id: int) -> None:
    """PATCH updates the sent field and leaves the rest untouched."""
    response = client.patch(f"/courses/{course_id}", json={"name": "Advanced"})
    assert response.status_code == 200
    assert response.json() == {**COURSE, "name": "Advanced", "exam_date": None, "id": course_id}


def test_patch_rejects_null_and_typos(client: TestClient, course_id: int) -> None:
    """Null on a required field and misspelled fields are 422, not silent no-ops."""
    assert client.patch(f"/courses/{course_id}", json={"name": None}).status_code == 422
    assert client.patch(f"/courses/{course_id}", json={"nmae": "x"}).status_code == 422


def test_delete_cascades_to_tasks(client: TestClient, course_id: int) -> None:
    """Deleting a course removes it and its tasks."""
    task_id = client.post(f"/courses/{course_id}/tasks", json={"title": "EX1"}).json()["id"]
    response = client.delete(f"/courses/{course_id}")
    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/courses/{course_id}").status_code == 404
    assert client.get(f"/tasks/{task_id}").status_code == 404
