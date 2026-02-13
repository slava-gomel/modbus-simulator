"""Тесты для WebSocket функциональности."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Fixture для TestClient с lifespan."""
    with TestClient(app) as c:
        yield c


def test_websocket_registers_connect(client: TestClient):
    """Тест подключения к WebSocket endpoint /ws/registers."""
    with client.websocket_connect("/ws/registers") as websocket:
        # Отправляем ping
        websocket.send_text("ping")
        # Ожидаем pong
        data = websocket.receive_text()
        assert data == "pong"


def test_websocket_server_connect(client: TestClient):
    """Тест подключения к WebSocket endpoint /ws/server."""
    with client.websocket_connect("/ws/server") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


def test_websocket_generators_connect(client: TestClient):
    """Тест подключения к WebSocket endpoint /ws/generators."""
    with client.websocket_connect("/ws/generators") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


def test_websocket_registers_broadcast(client: TestClient):
    """Тест broadcast изменений регистров через WebSocket."""
    with client.websocket_connect("/ws/registers") as websocket:
        # Изменяем регистр через API
        response = client.put("/api/state/holding?start=0&value=999")
        assert response.status_code == 200
        
        # Ожидаем событие через WebSocket
        data = websocket.receive_json()
        assert data["event"] == "registers_changed"
        assert data["data"]["kind"] == "holding"
        assert data["data"]["start"] == 0
        assert data["data"]["count"] == 1
        assert 999 in data["data"]["values"]


def test_websocket_multiple_clients(client: TestClient):
    """Тест поддержки множественных WebSocket клиентов."""
    with client.websocket_connect("/ws/registers") as ws1:
        with client.websocket_connect("/ws/registers") as ws2:
            # Изменяем регистр
            response = client.put("/api/state/holding?start=10&value=555")
            assert response.status_code == 200
            
            # Оба клиента должны получить событие
            data1 = ws1.receive_json()
            data2 = ws2.receive_json()
            
            assert data1["event"] == "registers_changed"
            assert data2["event"] == "registers_changed"
            assert data1["data"]["start"] == 10
            assert data2["data"]["start"] == 10
