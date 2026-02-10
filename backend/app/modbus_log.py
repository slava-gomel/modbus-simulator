"""Буфер событий Modbus (запросы/ответы) для отображения в GUI."""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import TypedDict


class ModbusLogEntry(TypedDict):
    id: int
    type: str
    message: str
    time: str


_MAX_ENTRIES = 300
_lock = threading.Lock()
_entries: list[ModbusLogEntry] = []
_next_id = 0


def append(entry_type: str, message: str) -> None:
    """Добавить запись в лог с временем в миллисекундах (UTC)."""
    global _next_id
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    with _lock:
        _entries.append(
            {
                "id": _next_id,
                "type": entry_type,
                "message": message,
                "time": now,
            }
        )
        _next_id += 1
        while len(_entries) > _MAX_ENTRIES:
            _entries.pop(0)


def get_events(since_id: int) -> tuple[list[ModbusLogEntry], int]:
    """Возвращает события с id > since_id и следующий next_id."""
    with _lock:
        out = [e for e in _entries if e["id"] > since_id]
        return out, _next_id
