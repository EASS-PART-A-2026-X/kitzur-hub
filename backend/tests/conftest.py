"""Shared fixtures: every test gets its own empty SQLite file."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

COURSE = {"name": "EASS", "code": "EASS-X", "semester": "2027A"}


@pytest.fixture
def db_url(tmp_path: Path) -> str:
    """Return a URL to a database file unique to this test."""
    return f"sqlite:///{tmp_path / 'test.db'}"


@pytest.fixture
def client(db_url: str) -> Iterator[TestClient]:
    """Yield a client for an app with an empty, unseeded database.

    The ``with`` block runs the app's lifespan, which creates the tables.
    """
    with TestClient(create_app(db_url, seed_demo=False)) as test_client:
        yield test_client


@pytest.fixture
def course_id(client: TestClient) -> int:
    """Create one course and return its id."""
    return client.post("/courses", json=COURSE).json()["id"]
