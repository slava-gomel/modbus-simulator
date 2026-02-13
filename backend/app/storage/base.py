from __future__ import annotations

import logging
from pathlib import Path

from ..config import AppConfig

logger = logging.getLogger(__name__)


class BaseStorage:
    """Базовый класс для всех storage модулей."""

    def __init__(self, cfg: AppConfig) -> None:
        self._cfg = cfg
        self._ensure_data_dir()

    def _ensure_data_dir(self) -> None:
        """Создать директорию для данных, если её нет."""
        data_dir: Path = self._cfg.storage.data_dir
        data_dir.mkdir(parents=True, exist_ok=True)
