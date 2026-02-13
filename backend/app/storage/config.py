from __future__ import annotations

import logging

import yaml

from ..config import AppConfig
from .base import BaseStorage

logger = logging.getLogger(__name__)


class ConfigStorage(BaseStorage):
    """Управление конфигурацией Modbus (config.yaml)."""

    def load_config(self) -> None:
        """Загрузить конфигурацию из файла."""
        path = self._cfg.storage.config_path
        if not path.exists():
            logger.info("Config file %s not found, using defaults", path)
            return
        try:
            with path.open("r", encoding="utf-8") as f:
                raw = yaml.safe_load(f) or {}
            from ..models import ModbusConfigDTO

            dto = ModbusConfigDTO(**raw)
            self._cfg.modbus = dto.to_config()
            logger.info("Loaded config from %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to load config from %s, using defaults", path)

    def save_config(self) -> None:
        """Сохранить конфигурацию в файл."""
        path = self._cfg.storage.config_path
        from ..models import ModbusConfigDTO

        dto = ModbusConfigDTO.from_config(self._cfg.modbus)
        try:
            with path.open("w", encoding="utf-8") as f:
                yaml.safe_dump(dto.model_dump(), f, sort_keys=True, allow_unicode=True)
            logger.info("Saved config to %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to save config to %s", path)
