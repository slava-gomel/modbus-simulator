from __future__ import annotations

from fastapi import APIRouter

from ..config import AppConfig, get_default_config
from ..models import ModbusConfigDTO


router = APIRouter(prefix="/config", tags=["config"])

_app_config: AppConfig = get_default_config()


@router.get("", response_model=ModbusConfigDTO)
def get_config() -> ModbusConfigDTO:
    """Вернуть текущую конфигурацию Modbus."""
    return ModbusConfigDTO.from_config(_app_config.modbus)


@router.put("", response_model=ModbusConfigDTO)
def update_config(dto: ModbusConfigDTO) -> ModbusConfigDTO:
    """
    Обновить конфигурацию Modbus.

    На данном этапе изменение конфигурации не перезапускает сервер автоматически,
    но backend может использовать эти данные для последующих рестартов контейнера
    или будущей динамической реконфигурации.
    """
    global _app_config  # noqa: PLW0603
    _app_config.modbus = dto.to_config()
    return dto

