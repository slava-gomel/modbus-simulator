"""Integration tests for server start/stop and status API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_server_status_ok(client: TestClient) -> None:
    resp = client.get("/api/server/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "running" in data
    assert "host" in data
    assert "port" in data
    assert isinstance(data["port"], int)


def test_server_start_returns_200(client: TestClient) -> None:
    resp = client.post("/api/server/start")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("running") is True
