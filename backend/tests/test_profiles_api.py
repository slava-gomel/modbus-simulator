"""Tests for profiles API."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_profiles_empty_or_list() -> None:
    resp = client.get("/api/profiles")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_save_profile() -> None:
    resp = client.post("/api/profiles", json={"name": "test_profile", "comment": "for tests"})
    assert resp.status_code == 200
    data = resp.json()
    assert "slug" in data
    assert data.get("name") == "test_profile"


def test_load_profile() -> None:
    # ensure one exists
    client.post("/api/profiles", json={"name": "load_test", "comment": ""})
    resp = client.post("/api/profiles/load_test/load")
    assert resp.status_code == 200
    assert resp.json().get("loaded") is True


def test_delete_profile() -> None:
    client.post("/api/profiles", json={"name": "to_delete", "comment": ""})
    resp = client.delete("/api/profiles/to_delete")
    assert resp.status_code == 200
    resp2 = client.delete("/api/profiles/to_delete")
    assert resp2.status_code == 404
