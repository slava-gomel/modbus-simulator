from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Fixture для TestClient с правильным lifecycle."""
    with TestClient(app) as c:
        yield c


def test_generators_empty_list(client: TestClient) -> None:
    resp = client.get("/api/generators")
    assert resp.status_code == 200
    data = resp.json()
    assert "generators" in data
    assert isinstance(data["generators"], list)


def test_create_simple_generator_and_updates_ok(client: TestClient) -> None:
    # создаём один простой генератор INT16 на адресе 0 (holding)
    payload = {
        "generators": [
            {
                "id": "test-gen-1",
                "enabled": True,
                "name": "test",
                "register_kind": "holding",
                "start_address": 0,
                "register_count": 1,
                "data_type": "int16",
                "wave_type": "constant",
                "amplitude": 0.0,
                "offset": 123.0,
                "frequency_hz": 1.0,
                "update_period_ms": 50,
            }
        ]
    }
    resp = client.put("/api/generators", json=payload)
    assert resp.status_code == 200

    # немного ждём, чтобы фоновый движок успел записать значение
    # (реальный sleep здесь допустим для простого e2e‑проверочного теста)
    import time

    time.sleep(0.2)

    # читаем holding‑регистр 0 и убеждаемся, что там записано 123
    resp_state = client.get("/api/state/holding", params={"start": 0, "count": 1})
    assert resp_state.status_code == 200
    data = resp_state.json()
    assert data["kind"] == "holding"
    assert data["start"] == 0
    assert len(data["values"]) == 1
    assert data["values"][0] == 123


def test_generator_can_target_input_registers(client: TestClient) -> None:
    # создаём генератор, пишущий в input‑регистр
    payload = {
        "generators": [
            {
                "id": "test-gen-input",
                "enabled": True,
                "name": "test-input",
                "register_kind": "input",
                "start_address": 7,
                "register_count": 1,
                "data_type": "int16",
                "wave_type": "constant",
                "amplitude": 0.0,
                "offset": 77.0,
                "frequency_hz": 1.0,
                "update_period_ms": 50,
            }
        ]
    }
    resp = client.put("/api/generators", json=payload)
    assert resp.status_code == 200

    # ждём, чтобы движок успел применить генератор
    import time

    time.sleep(0.2)

    # читаем input‑регистр 7 и убеждаемся, что там записано 77
    resp_state = client.get("/api/state/input", params={"start": 7, "count": 1})
    assert resp_state.status_code == 200
    data = resp_state.json()
    assert data["kind"] == "input"
    assert data["start"] == 7
    assert len(data["values"]) == 1
    assert data["values"][0] == 77

