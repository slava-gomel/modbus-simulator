"""WebSocket API endpoints для real-time обновлений."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

if TYPE_CHECKING:
    from ..websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)

router = APIRouter()
_ws_manager: ConnectionManager | None = None


def init_websocket_api(ws_manager: ConnectionManager) -> None:
    """Инициализация WebSocket API с менеджером соединений."""
    global _ws_manager
    _ws_manager = ws_manager
    logger.info("WebSocket API initialized")


@router.websocket("/ws/registers")
async def websocket_registers_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint для обновлений регистров.
    
    События:
    - registers_changed: изменение значений регистров (kind, start, count, values)
    """
    if _ws_manager is None:
        logger.error("WebSocket manager not initialized")
        await websocket.close(code=1011, reason="WebSocket manager not initialized")
        return

    await _ws_manager.connect(websocket, "registers")
    logger.info(f"WebSocket /ws/registers: client connected from {websocket.client}")
    
    try:
        # Держать соединение открытым, ждать сообщений от клиента
        while True:
            # Клиент может отправлять ping для keep-alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                logger.debug("WebSocket /ws/registers: ping/pong")
    except WebSocketDisconnect:
        logger.info("WebSocket /ws/registers: client disconnected")
    except Exception as e:
        logger.error(f"WebSocket /ws/registers error: {e}", exc_info=True)
    finally:
        await _ws_manager.disconnect(websocket, "registers")
        logger.info("WebSocket /ws/registers: connection closed")


@router.websocket("/ws/server")
async def websocket_server_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint для статуса сервера и Modbus лога.
    
    События:
    - server_status: изменение статуса Modbus сервера (running, host, port, error)
    - modbus_log: новые записи в логе Modbus (массив событий)
    """
    if _ws_manager is None:
        logger.error("WebSocket manager not initialized")
        await websocket.close(code=1011, reason="WebSocket manager not initialized")
        return

    await _ws_manager.connect(websocket, "server")
    logger.info(f"WebSocket /ws/server: client connected from {websocket.client}")
    
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                logger.debug("WebSocket /ws/server: ping/pong")
    except WebSocketDisconnect:
        logger.info("WebSocket /ws/server: client disconnected")
    except Exception as e:
        logger.error(f"WebSocket /ws/server error: {e}", exc_info=True)
    finally:
        await _ws_manager.disconnect(websocket, "server")
        logger.info("WebSocket /ws/server: connection closed")


@router.websocket("/ws/generators")
async def websocket_generators_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint для обновлений генераторов сигналов.
    
    События:
    - generator_values: текущие значения всех активных генераторов
    """
    if _ws_manager is None:
        logger.error("WebSocket manager not initialized")
        await websocket.close(code=1011, reason="WebSocket manager not initialized")
        return

    await _ws_manager.connect(websocket, "generators")
    logger.info(f"WebSocket /ws/generators: client connected from {websocket.client}")
    
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                logger.debug("WebSocket /ws/generators: ping/pong")
    except WebSocketDisconnect:
        logger.info("WebSocket /ws/generators: client disconnected")
    except Exception as e:
        logger.error(f"WebSocket /ws/generators error: {e}", exc_info=True)
    finally:
        await _ws_manager.disconnect(websocket, "generators")
        logger.info("WebSocket /ws/generators: connection closed")