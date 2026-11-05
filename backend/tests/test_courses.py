"""Course CRUD tests: status codes and bodies."""

from fastapi.testclient import TestClient

from tests.conftest import COURSE


def test_create_returns_201_with_id(client: TestClient) -> None:
    """POST returns the stored course including its new id."""
    response = client.post("/courses", json={**COURSE, "exam_date": "2027-02-01"})
    assert response.status_code == 201
    assert response.json() == {
        **COURSE,
        "exam_date": "2027-02-01",
        "id": 1,
        "lecture_count": 0,
        "open_task_count": 0,
        "next_due_at": None,
    }


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
    body = response.json()
    assert (body["name"], body["code"], body["exam_date"]) == ("Advanced", COURSE["code"], None)


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


def test_course_counts(client: TestClient, course_id: int) -> None:
    """Cards get lecture count, open tasks, and the earliest future open deadline."""
    url = f"/courses/{course_id}/tasks"
    client.post(url, json={"title": "past", "due_at": "2020-01-01T10:00:00"})
    client.post(url, json={"title": "later", "due_at": "2099-06-01T23:59:00"})
    client.post(url, json={"title": "next", "due_at": "2099-01-01T23:59:00"})
    done = client.post(url, json={"title": "done", "due_at": "2098-01-01T00:00:00"}).json()
    client.patch(f"/tasks/{done['id']}", json={"status": "done"})
    client.post(url, json={"title": "undated"})
    body = client.get(f"/courses/{course_id}").json()
    assert (body["lecture_count"], body["open_task_count"]) == (0, 4)
    assert body["next_due_at"] == "2099-01-01T23:59:00"
    assert client.get("/courses").json()[0]["next_due_at"] == "2099-01-01T23:59:00"
