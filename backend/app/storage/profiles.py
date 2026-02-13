from __future__ import annotations

import logging
import re
from typing import Any, Dict, List

import yaml

from ..config import AppConfig
from ..modbus_core import ModbusSimulatorCore
from .base import BaseStorage

logger = logging.getLogger(__name__)


class ProfilesStorage(BaseStorage):
    """Управление профилями (profiles/*.yaml)."""

    def _ensure_profiles_dir(self) -> None:
        """Создать директорию для профилей, если её нет."""
        self._cfg.storage.profiles_path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _profile_slug(name: str) -> str:
        """Преобразовать имя профиля в безопасный slug."""
        safe = re.sub(r"[^\w\-]", "_", name.strip()).strip("_") or "profile"
        return safe[:80]

    def ensure_default_profile(self, core: ModbusSimulatorCore) -> None:
        """Создать профиль 'default', если он ещё не существует."""
        from ..models import ModbusConfigDTO

        self._ensure_profiles_dir()
        path = self._cfg.storage.profiles_path / "default.yaml"
        if path.exists():
            return

        config_dto = ModbusConfigDTO.from_config(self._cfg.modbus)
        state = {
            "coils": core.coils.values,
            "discrete_inputs": core.discrete_inputs.values,
            "holding_registers": core.holding_registers.values,
            "input_registers": core.input_registers.values,
        }
        data = {
            "name": "default",
            "comment": "Профиль по умолчанию",
            "config": config_dto.model_dump(),
            "state": state,
            "generators": [],
        }
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
        logger.info("Created default profile at %s", path)

    def list_profiles(self) -> List[Dict[str, Any]]:
        """Получить список всех профилей."""
        self._ensure_profiles_dir()
        profiles_dir = self._cfg.storage.profiles_path
        if not profiles_dir.exists():
            return []
        result = []
        for path in sorted(profiles_dir.glob("*.yaml")):
            try:
                with path.open("r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
                result.append({
                    "name": data.get("name", path.stem),
                    "slug": path.stem,
                    "comment": data.get("comment", ""),
                })
            except Exception:  # noqa: BLE001
                logger.warning("Failed to read profile %s", path)
        return result

    def save_profile(
        self,
        name: str,
        core: ModbusSimulatorCore,
        comment: str = "",
        generators: List[dict] | None = None,
    ) -> str:
        """Сохранить новый профиль."""
        from ..models import ModbusConfigDTO

        self._ensure_profiles_dir()
        slug = self._profile_slug(name)
        path = self._cfg.storage.profiles_path / f"{slug}.yaml"
        config_dto = ModbusConfigDTO.from_config(self._cfg.modbus)
        state = {
            "coils": core.coils.values,
            "discrete_inputs": core.discrete_inputs.values,
            "holding_registers": core.holding_registers.values,
            "input_registers": core.input_registers.values,
        }
        data = {
            "name": name.strip() or slug,
            "comment": comment.strip(),
            "config": config_dto.model_dump(),
            "state": state,
            "generators": generators or [],
        }
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
        logger.info("Saved profile %s to %s", name, path)
        return slug

    def update_profile(
        self,
        slug: str,
        core: ModbusSimulatorCore,
        comment: str | None = None,
        generators: List[dict] | None = None,
    ) -> None:
        """Обновить существующий профиль."""
        from ..models import ModbusConfigDTO

        self._ensure_profiles_dir()
        path = self._cfg.storage.profiles_path / f"{slug}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"Profile not found: {slug}")

        with path.open("r", encoding="utf-8") as f:
            existing = yaml.safe_load(f) or {}

        name = existing.get("name", slug)
        existing_comment = existing.get("comment", "")
        final_comment = comment if comment is not None else existing_comment

        config_dto = ModbusConfigDTO.from_config(self._cfg.modbus)
        state = {
            "coils": core.coils.values,
            "discrete_inputs": core.discrete_inputs.values,
            "holding_registers": core.holding_registers.values,
            "input_registers": core.input_registers.values,
        }
        data = {
            "name": name,
            "comment": (final_comment or "").strip(),
            "config": config_dto.model_dump(),
            "state": state,
            "generators": generators if generators is not None else existing.get("generators", []),
        }
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
        logger.info("Updated profile %s at %s", slug, path)

    def load_profile(self, slug: str) -> Dict[str, Any]:
        """Загрузить профиль по slug."""
        path = self._cfg.storage.profiles_path / f"{slug}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"Profile not found: {slug}")
        with path.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def delete_profile(self, slug: str) -> None:
        """Удалить профиль по slug."""
        if not self._cfg.storage.profiles_path.exists():
            raise FileNotFoundError(f"Profile not found: {slug}")
        path = self._cfg.storage.profiles_path / f"{slug}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"Profile not found: {slug}")
        path.unlink()
        logger.info("Deleted profile %s", slug)
