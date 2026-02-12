from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_generators_empty_list() -> None:
    resp = client.get("/api/generators")
    assert resp.status_code == 200
    data = resp.json()
    assert "generators" in data
    assert isinstance(data["generators"], list)


def test_create_simple_generator_and_updates_ok() -> None:
    # создаём один простой генератор INT16 на адресе 0
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

    # читаем holding‑регистр 0 и убеждаемся, что там близко к 123
    resp_state = client.get("/api/state/holding", params={"start": 0, "count": 1})
    assert resp_state.status_code == 200
    data = resp_state.json()
    assert data["kind"] == "holding"
    assert data["start"] == 0
    assert len(data["values"]) == 1
    assert data["values"][0] == 123

