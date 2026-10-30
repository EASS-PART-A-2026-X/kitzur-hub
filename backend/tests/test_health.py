"""Tests for the health endpoint."""

from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    """GET /health answers 200 with the fixed status body."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
