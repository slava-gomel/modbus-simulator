from fastapi.testclient import TestClient

from app.main import app, core


client = TestClient(app)


def test_read_holding_default_zero() -> None:
    resp = client.get("/api/state/holding", params={"start": 0, "count": 4})
    assert resp.status_code == 200
    data = resp.json()
    assert data["kind"] == "holding"
    assert data["start"] == 0
    assert len(data["values"]) == 4
    assert all(v == 0 for v in data["values"])


def test_write_and_read_single_holding() -> None:
    addr = 1
    resp = client.put("/api/state/holding", params={"start": addr, "value": 123})
    assert resp.status_code == 200
    data = resp.json()
    assert data["values"][0] == 123

    resp2 = client.get("/api/state/holding", params={"start": addr, "count": 1})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["values"][0] == 123


def test_write_coil_as_bool() -> None:
    addr = 0
    resp = client.put("/api/state/coils", params={"start": addr, "value": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert data["values"][0] == 1

    resp2 = client.get("/api/state/coils", params={"start": addr, "count": 1})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["values"][0] == 1

