from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

import yaml

from .config import AppConfig
from .modbus_core import ModbusSimulatorCore

logger = logging.getLogger(__name__)


class Storage:
    """
    Файловое хранилище конфигурации и состояния.

    - `config.yaml` – настройки Modbus (порт, размеры областей и т.п.).
    - `state.json` – текущее состояние регистров.
    """

    def __init__(self, cfg: AppConfig) -> None:
        self._cfg = cfg
        self._ensure_data_dir()

    def _ensure_data_dir(self) -> None:
        data_dir: Path = self._cfg.storage.data_dir
        data_dir.mkdir(parents=True, exist_ok=True)

    # ------------ CONFIG ------------
    def load_config(self) -> None:
        path = self._cfg.storage.config_path
        if not path.exists():
            logger.info("Config file %s not found, using defaults", path)
            return
        try:
            with path.open("r", encoding="utf-8") as f:
                raw = yaml.safe_load(f) or {}
            from .models import ModbusConfigDTO  # локальный импорт, чтобы избежать циклов

            dto = ModbusConfigDTO(**raw)
            self._cfg.modbus = dto.to_config()
            logger.info("Loaded config from %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to load config from %s, using defaults", path)

    def save_config(self) -> None:
        path = self._cfg.storage.config_path
        from .models import ModbusConfigDTO  # локальный импорт

        dto = ModbusConfigDTO.from_config(self._cfg.modbus)
        try:
            with path.open("w", encoding="utf-8") as f:
                yaml.safe_dump(dto.model_dump(), f, sort_keys=True, allow_unicode=True)
            logger.info("Saved config to %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to save config to %s", path)

    # ------------ STATE ------------
    def load_state(self, core: ModbusSimulatorCore) -> None:
        path = self._cfg.storage.state_path
        if not path.exists():
            logger.info("State file %s not found, starting with empty state", path)
            return
        try:
            with path.open("r", encoding="utf-8") as f:
                data: Dict[str, Any] = json.load(f)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to read state file %s, starting empty", path)
            return

        try:
            self._apply_state(core, data)
            logger.info("Loaded state from %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to apply state from %s, starting empty", path)

    def save_state(self, core: ModbusSimulatorCore) -> None:
        path = self._cfg.storage.state_path
        data = {
            "coils": core.coils.values,
            "discrete_inputs": core.discrete_inputs.values,
            "holding_registers": core.holding_registers.values,
            "input_registers": core.input_registers.values,
        }
        try:
            with path.open("w", encoding="utf-8") as f:
                json.dump(data, f)
            logger.info("Saved state to %s", path)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to save state to %s", path)

    # ------------ INTERNAL ------------
    @staticmethod
    def _apply_state(core: ModbusSimulatorCore, data: Dict[str, Any]) -> None:
        def _apply_block(name: str, target: Any) -> None:
            src = data.get(name)
            if not isinstance(src, list):
                return
            limit = min(len(src), target.size)
            for i in range(limit):
                target.values[i] = int(src[i])

        _apply_block("coils", core.coils)
        _apply_block("discrete_inputs", core.discrete_inputs)
        _apply_block("holding_registers", core.holding_registers)
        _apply_block("input_registers", core.input_registers)

