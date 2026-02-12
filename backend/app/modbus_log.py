"""Буфер событий Modbus (запросы/ответы) для отображения в GUI."""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import TypedDict


class ModbusLogEntry(TypedDict, total=False):
    """Структура одной записи Modbus-лога."""

    id: int
    type: str
    message: str
    time: str
    # Дополнительные структурированные поля (опционально, могут отсутствовать)
    kind: str  # "coils" | "holding" | ...
    start: int
    count: int


_MAX_ENTRIES = 300
_lock = threading.Lock()
_entries: list[ModbusLogEntry] = []
_next_id = 0


def append(entry_type: str, message: str, **fields: object) -> None:
    """Добавить запись в лог с временем в миллисекундах (UTC).

    Дополнительные именованные аргументы пишутся в запись как есть
    (например, kind, start, count для подсветки регистров).
    """
    global _next_id
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    with _lock:
        entry: ModbusLogEntry = {
            "id": _next_id,
            "type": entry_type,
            "message": message,
            "time": now,
        }
        for key, value in fields.items():
            if isinstance(key, str):
                entry[key] = value  # type: ignore[assignment]
        _entries.append(entry)
        _next_id += 1
        while len(_entries) > _MAX_ENTRIES:
            _entries.pop(0)


def get_events(since_id: int) -> tuple[list[ModbusLogEntry], int]:
    """Возвращает события с id > since_id и следующий next_id."""
    with _lock:
        out = [e for e in _entries if e["id"] > since_id]
        return out, _next_id
