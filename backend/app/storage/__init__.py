"""
Модульное файловое хранилище для конфигурации, состояния и профилей.
"""

from __future__ import annotations

from ..config import AppConfig
from .config import ConfigStorage
from .profiles import ProfilesStorage
from .state import StateStorage

__all__ = ["Storage", "ConfigStorage", "StateStorage", "ProfilesStorage"]


class Storage:
    """Фасад для всех storage операций."""

    def __init__(self, cfg: AppConfig) -> None:
        self.config = ConfigStorage(cfg)
        self.state = StateStorage(cfg)
        self.profiles = ProfilesStorage(cfg)
