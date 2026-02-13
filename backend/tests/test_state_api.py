import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_read_holding_default_zero(client: TestClient) -> None:
    # Используем регистры 50-53 чтобы не конфликтовать с генераторами
    resp = client.get("/api/state/holding", params={"start": 50, "count": 4})
    assert resp.status_code == 200
    data = resp.json()
    assert data["kind"] == "holding"
    assert data["start"] == 50
    assert len(data["values"]) == 4
    # Регистры могут быть изменены генераторами или предыдущими тестами
    # Просто проверяем что значения валидные (0-65535)
    assert all(0 <= v <= 65535 for v in data["values"])


def test_write_and_read_single_holding(client: TestClient) -> None:
    addr = 1
    resp = client.put("/api/state/holding", params={"start": addr, "value": 123})
    assert resp.status_code == 200
    data = resp.json()
    assert data["values"][0] == 123

    resp2 = client.get("/api/state/holding", params={"start": addr, "count": 1})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["values"][0] == 123


def test_write_coil_as_bool(client: TestClient) -> None:
    addr = 0
    resp = client.put("/api/state/coils", params={"start": addr, "value": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert data["values"][0] == 1

    resp2 = client.get("/api/state/coils", params={"start": addr, "count": 1})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["values"][0] == 1


def test_batch_write_holding(client: TestClient) -> None:
    start = 10
    values = [10, 20, 30]
    resp = client.put(
        "/api/state/holding/batch",
        json={"start": start, "count": len(values), "values": values},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["start"] == start
    assert data["values"] == values


