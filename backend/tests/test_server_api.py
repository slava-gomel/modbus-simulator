"""Integration tests for server start/stop and status API."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_server_status_ok() -> None:
    resp = client.get("/api/server/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "running" in data
    assert "host" in data
    assert "port" in data
    assert isinstance(data["port"], int)


def test_server_start_returns_200() -> None:
    resp = client.post("/api/server/start")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("running") is True
