from __future__ import annotations

import json
import logging
from typing import Any, Dict

from ..config import AppConfig
from ..modbus_core import ModbusSimulatorCore
from .base import BaseStorage

logger = logging.getLogger(__name__)


class StateStorage(BaseStorage):
    """Управление состоянием регистров (state.json)."""

    def load_state(self, core: ModbusSimulatorCore) -> None:
        """Загрузить состояние регистров из файла."""
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
        """Сохранить состояние регистров в файл."""
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

    @staticmethod
    def _apply_state(core: ModbusSimulatorCore, data: Dict[str, Any]) -> None:
        """Применить загруженное состояние к core."""
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
