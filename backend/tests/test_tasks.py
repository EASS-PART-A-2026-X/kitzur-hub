"""Task CRUD tests."""

from fastapi.testclient import TestClient


def test_create_sets_defaults_and_manual_origin(client: TestClient, course_id: int) -> None:
    """A new task is todo, kind other and origin manual unless told otherwise."""
    response = client.post(f"/courses/{course_id}/tasks", json={"title": "EX1"})
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "todo"
    assert body["kind"] == "other"
    assert body["origin"] == "manual"
    assert body["course_id"] == course_id


def test_client_cannot_set_origin(client: TestClient, course_id: int) -> None:
    """Origin is server-owned, so sending it is rejected."""
    response = client.post(f"/courses/{course_id}/tasks", json={"title": "x", "origin": "syllabus"})
    assert response.status_code == 422


def test_create_in_missing_course_is_404(client: TestClient) -> None:
    """Tasks need an existing course."""
    assert client.post("/courses/999/tasks", json={"title": "x"}).status_code == 404


def test_list_orders_by_deadline_with_undated_last(client: TestClient, course_id: int) -> None:
    """Earliest deadline first, tasks without a deadline at the end."""
    url = f"/courses/{course_id}/tasks"
    client.post(url, json={"title": "undated"})
    client.post(url, json={"title": "late", "due_at": "2026-12-01T23:59:00"})
    client.post(url, json={"title": "early", "due_at": "2026-11-09T23:59:00"})
    assert [t["title"] for t in client.get(url).json()] == ["early", "late", "undated"]


def test_status_filter_and_patch(client: TestClient, course_id: int) -> None:
    """PATCH moves a task to done and the status filter reflects it."""
    url = f"/courses/{course_id}/tasks"
    task_id = client.post(url, json={"title": "EX1"}).json()["id"]
    client.post(url, json={"title": "EX2"})
    assert client.patch(f"/tasks/{task_id}", json={"status": "done"}).json()["status"] == "done"
    assert [t["title"] for t in client.get(url, params={"status": "done"}).json()] == ["EX1"]


def test_patch_can_clear_nullable_field(client: TestClient, course_id: int) -> None:
    """Explicit null clears due_at, absent fields stay."""
    url = f"/courses/{course_id}/tasks"
    task = client.post(url, json={"title": "x", "due_at": "2026-11-09T23:59:00"}).json()
    body = client.patch(f"/tasks/{task['id']}", json={"due_at": None}).json()
    assert body["due_at"] is None
    assert body["title"] == "x"


def test_delete_then_404(client: TestClient, course_id: int) -> None:
    """A deleted task is gone, and deleting it again is 404."""
    task_id = client.post(f"/courses/{course_id}/tasks", json={"title": "x"}).json()["id"]
    assert client.delete(f"/tasks/{task_id}").status_code == 204
    assert client.delete(f"/tasks/{task_id}").status_code == 404
