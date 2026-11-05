"""Data survives an app restart, and the seed runs exactly once."""

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import COURSE


def test_data_survives_restart(db_url: str) -> None:
    """A course written by one app instance is read back by a new one on the same file."""
    with TestClient(create_app(db_url, seed_demo=False)) as first:
        course_id = first.post("/courses", json=COURSE).json()["id"]
    with TestClient(create_app(db_url, seed_demo=False)) as second:
        assert second.get(f"/courses/{course_id}").json()["name"] == COURSE["name"]


def test_seed_is_idempotent(db_url: str) -> None:
    """Starting twice with seeding on still leaves one demo course and four tasks."""
    for _ in range(2):
        with TestClient(create_app(db_url)) as client:
            courses = client.get("/courses").json()
    assert len(courses) == 1
    with TestClient(create_app(db_url)) as client:
        assert len(client.get(f"/courses/{courses[0]['id']}/tasks").json()) == 4


def test_seed_imports_demo_lectures(db_url: str) -> None:
    """The EASS course ships with its two anonymized lectures, dated from the file header."""
    with TestClient(create_app(db_url)) as client:
        course = client.get("/courses").json()[0]
        lectures = client.get(f"/courses/{course['id']}/lectures").json()
        assert course["code"] == "EASS"
        assert [lec["held_on"] for lec in lectures] == ["2026-10-19", "2026-10-26"]
        detail = client.get(f"/lectures/{lectures[0]['id']}").json()
        assert {seg["speaker"] for seg in detail["segments"]} == {"מרצה", "סטודנט/ית"}
        questions = client.get(f"/courses/{course['id']}/questions").json()
        assert len(questions) == 12
        assert {q["lecture_id"] for q in questions} == {lec["id"] for lec in lectures}
