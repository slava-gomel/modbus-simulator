"""WebSocket Connection Manager для управления подключениями и broadcast сообщений."""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Set

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Централизованный менеджер WebSocket соединений с раздельными каналами."""

    def __init__(self):
        # Раздельные пулы соединений для каждого канала
        self.registers_connections: Set[WebSocket] = set()
        self.server_connections: Set[WebSocket] = set()
        self.generators_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    def _get_pool(self, channel: str) -> Set[WebSocket]:
        """Получить пул соединений для указанного канала."""
        if channel == "registers":
            return self.registers_connections
        elif channel == "server":
            return self.server_connections
        elif channel == "generators":
            return self.generators_connections
        else:
            raise ValueError(f"Unknown channel: {channel}")

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        """Принять новое WebSocket соединение и добавить в соответствующий пул."""
        await websocket.accept()
        async with self._lock:
            pool = self._get_pool(channel)
            pool.add(websocket)
        logger.info(f"WebSocket connected to channel '{channel}' (total: {len(pool)})")

    async def disconnect(self, websocket: WebSocket, channel: str) -> None:
        """Удалить WebSocket соединение из пула."""
        async with self._lock:
            pool = self._get_pool(channel)
            pool.discard(websocket)
        logger.info(f"WebSocket disconnected from channel '{channel}' (total: {len(pool)})")

    async def broadcast(self, channel: str, message: Dict[str, Any]) -> None:
        """Отправить сообщение всем подключенным клиентам канала.
        
        Автоматически удаляет отключенные соединения из пула.
        """
        pool = self._get_pool(channel)
        if not pool:
            return

        disconnected: Set[WebSocket] = set()
        
        for websocket in pool:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket on channel '{channel}': {e}")
                disconnected.add(websocket)

        # Очистка отключенных соединений
        if disconnected:
            async with self._lock:
                pool -= disconnected
            logger.info(f"Removed {len(disconnected)} disconnected WebSocket(s) from channel '{channel}'")

    def get_connection_count(self, channel: str) -> int:
        """Получить количество активных соединений в канале."""
        pool = self._get_pool(channel)
        return len(pool)
