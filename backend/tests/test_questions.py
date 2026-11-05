"""Tests for practice questions, practice sessions and graded attempts."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.models import QuestionCreate
from tests.test_lectures import insert_lecture

MCQ = {
    "type": "mcq",
    "prompt": "Which status code does a successful DELETE return?",
    "options": ["200", "201", "204", "404"],
    "correct_index": 2,
    "explanation": "204 No Content: nothing to return.",
}
CARD = {
    "type": "flashcard",
    "prompt": "What is PARD?",
    "answer": "Problem, Actions, Result, Desired",
}


def create(client: TestClient, course_id: int, body: dict) -> dict:
    """Create a question and return the response body."""
    response = client.post(f"/courses/{course_id}/questions", json=body)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.parametrize(
    "override",
    [
        {"options": ["a", "b", "c"]},
        {"options": ["a", "b", "c", "c"]},
        {"options": ["a", "b", "c", " "]},
        {"correct_index": None},
        {"correct_index": 4},
    ],
)
def test_mcq_shape_is_enforced(override: dict) -> None:
    """Multiple choice needs 4 distinct non-empty options and a valid correct index."""
    with pytest.raises(ValidationError):
        QuestionCreate(**{**MCQ, **override})


def test_flashcard_shape_is_enforced() -> None:
    """A flashcard needs an answer and must not carry options."""
    with pytest.raises(ValidationError):
        QuestionCreate(type="flashcard", prompt="x")
    with pytest.raises(ValidationError):
        QuestionCreate(**{**CARD, "options": ["a", "b", "c", "d"]})


def test_create_and_read(client: TestClient, course_id: int) -> None:
    """Creating returns the full question; reading it back includes the answer."""
    body = create(client, course_id, MCQ)
    assert (body["correct_index"], body["attempt_count"]) == (2, 0)
    assert client.get(f"/questions/{body['id']}").json()["explanation"] == MCQ["explanation"]


def test_lecture_must_belong_to_course(client: TestClient, course_id: int) -> None:
    """A question cannot point at another course's lecture."""
    other = client.post("/courses", json={"name": "B", "code": "B", "semester": "S"}).json()["id"]
    foreign_lecture = insert_lecture(client, other)
    response = client.post(
        f"/courses/{course_id}/questions", json={**CARD, "lecture_id": foreign_lecture}
    )
    assert response.status_code == 422


def test_practice_hides_mcq_solution(client: TestClient, course_id: int) -> None:
    """Practice shows the options but not the correct index or explanation."""
    create(client, course_id, MCQ)
    [question] = client.get(f"/courses/{course_id}/practice").json()
    assert question["options"] == MCQ["options"]
    assert "correct_index" not in question
    assert "explanation" not in question


def test_mcq_attempt_is_graded_by_server(client: TestClient, course_id: int) -> None:
    """The server decides correctness and reveals the solution afterwards."""
    question_id = create(client, course_id, MCQ)["id"]
    url = f"/questions/{question_id}/attempts"
    wrong = client.post(url, json={"chosen_index": 0}).json()
    assert (wrong["correct"], wrong["correct_index"]) == (False, 2)
    assert wrong["explanation"] == MCQ["explanation"]
    assert client.post(url, json={"chosen_index": 2}).json()["correct"] is True


def test_attempt_body_must_match_type(client: TestClient, course_id: int) -> None:
    """Multiple choice wants chosen_index; a flashcard wants knew."""
    mcq_id = create(client, course_id, MCQ)["id"]
    card_id = create(client, course_id, CARD)["id"]
    assert client.post(f"/questions/{mcq_id}/attempts", json={"knew": True}).status_code == 422
    assert (
        client.post(f"/questions/{card_id}/attempts", json={"chosen_index": 1}).status_code == 422
    )
    assert client.post(f"/questions/{mcq_id}/attempts", json={"chosen_index": 4}).status_code == 422
    result = client.post(f"/questions/{card_id}/attempts", json={"knew": False}).json()
    assert (result["correct"], result["answer"]) == (False, CARD["answer"])


def test_practice_serves_least_practiced_first(client: TestClient, course_id: int) -> None:
    """Questions with fewer attempts come first."""
    practiced = create(client, course_id, MCQ)["id"]
    fresh = create(client, course_id, CARD)["id"]
    client.post(f"/questions/{practiced}/attempts", json={"chosen_index": 2})
    for _ in range(5):  # random tie-breaking must never beat the attempt count
        ids = [q["id"] for q in client.get(f"/courses/{course_id}/practice").json()]
        assert ids == [fresh, practiced]


def test_practice_filters_and_count(client: TestClient, course_id: int) -> None:
    """The count parameter limits the session; lecture and type filters narrow it."""
    lecture_id = insert_lecture(client, course_id)
    create(client, course_id, {**MCQ, "lecture_id": lecture_id})
    create(client, course_id, CARD)
    url = f"/courses/{course_id}/practice"
    assert len(client.get(url, params={"count": 1}).json()) == 1
    assert [q["type"] for q in client.get(url, params={"lecture_id": lecture_id}).json()] == ["mcq"]
    assert [q["type"] for q in client.get(url, params={"type": "flashcard"}).json()] == [
        "flashcard"
    ]
    assert client.get(url, params={"count": 51}).status_code == 422
    assert client.get(url, params={"lecture_id": 999}).status_code == 422


def test_summary(client: TestClient, course_id: int) -> None:
    """Totals count questions, distinct attempted questions and accuracy."""
    url = f"/courses/{course_id}/practice/summary"
    assert client.get(url).json()["accuracy"] is None
    mcq_id = create(client, course_id, MCQ)["id"]
    create(client, course_id, CARD)
    client.post(f"/questions/{mcq_id}/attempts", json={"chosen_index": 2})
    client.post(f"/questions/{mcq_id}/attempts", json={"chosen_index": 0})
    assert client.get(url).json() == {
        "questions": 2,
        "attempted_questions": 1,
        "attempts": 2,
        "correct_attempts": 1,
        "accuracy": 0.5,
    }


def test_deletes_cascade(client: TestClient, course_id: int) -> None:
    """Deleting a lecture removes its questions; deleting a question removes its attempts."""
    lecture_id = insert_lecture(client, course_id)
    linked = create(client, course_id, {**CARD, "lecture_id": lecture_id})["id"]
    loose = create(client, course_id, MCQ)["id"]
    client.post(f"/questions/{loose}/attempts", json={"chosen_index": 1})
    client.delete(f"/lectures/{lecture_id}")
    assert client.get(f"/questions/{linked}").status_code == 404
    assert client.delete(f"/questions/{loose}").status_code == 204
    assert client.get(f"/courses/{course_id}/practice/summary").json()["attempts"] == 0
