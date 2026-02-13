from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import AppConfig
from ..models import ModbusConfigDTO, SignalGeneratorConfig

if TYPE_CHECKING:
    from ..modbus_core import ModbusSimulatorCore
    from ..signal_generators import SignalGeneratorEngine
    from ..storage import Storage

router = APIRouter(prefix="/profiles", tags=["profiles"])

_storage: "Storage | None" = None
_config: AppConfig | None = None
_core: "ModbusSimulatorCore | None" = None
_engine: "SignalGeneratorEngine | None" = None


def init_profiles_api(
    storage: "Storage",
    config: AppConfig,
    core: "ModbusSimulatorCore",
    engine: "SignalGeneratorEngine",
) -> None:
    global _storage, _config, _core, _engine  # noqa: PLW0603
    _storage = storage
    _config = config
    _core = core
    _engine = engine


def _get_deps() -> tuple["Storage", AppConfig, "ModbusSimulatorCore", "SignalGeneratorEngine | None"]:
    if _storage is None or _config is None or _core is None:
        raise RuntimeError("Profiles API not initialized")
    # _engine может быть None только в теории, но для надёжности возвращаем его как опциональный.
    return _storage, _config, _core, _engine


class ProfileSaveRequest(BaseModel):
    name: str
    comment: str = ""


class ProfileUpdateRequest(BaseModel):
    """Опционально позволяет изменить комментарий при обновлении профиля."""

    comment: str | None = None

@router.get("", response_model=list)
def list_profiles() -> list:
    storage, _, _, _ = _get_deps()
    return storage.profiles.list_profiles()


@router.post("", response_model=dict)
def save_profile(body: ProfileSaveRequest) -> dict:
    storage, _, core, engine = _get_deps()
    # При сохранении профиля сохраняем текущий набор генераторов (если движок инициализирован).
    generators_data: list[dict] = []
    if engine is not None:
        generators_data = [g.model_dump() for g in engine.get_generators()]
    slug = storage.profiles.save_profile(body.name, core, body.comment, generators=generators_data)
    return {"slug": slug, "name": body.name.strip() or slug}


@router.post("/{slug}/update", response_model=dict)
def update_profile(slug: str, body: ProfileUpdateRequest | None = None) -> dict:
    """Обновить существующий профиль из текущей конфигурации и состояния.

    Перезаписывает:
    - config/state из текущего ядра
    - generators из текущего движка генераторов
    Имя профиля и (по умолчанию) комментарий сохраняются.
    """
    storage, _, core, engine = _get_deps()
    generators_data: list[dict] = []
    if engine is not None:
        generators_data = [g.model_dump() for g in engine.get_generators()]
    comment = body.comment if body is not None else None
    try:
        storage.profiles.update_profile(slug, core, comment=comment, generators=generators_data)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {"slug": slug, "updated": True}


@router.delete("/{slug}")
def delete_profile(slug: str) -> None:
    storage, _, _, _ = _get_deps()
    if slug == "default":
        raise HTTPException(status_code=400, detail="Default profile cannot be deleted")
    try:
        storage.profiles.delete_profile(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{slug}/load", response_model=dict)
def load_profile(slug: str) -> dict:
    storage, config, core, engine = _get_deps()
    try:
        data = storage.profiles.load_profile(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    cfg = data.get("config")
    state = data.get("state")
    generators_raw = data.get("generators") or []
    if cfg:
        config.modbus = ModbusConfigDTO(**cfg).to_config()
        storage.config.save_config()
    if state and isinstance(state, dict):
        storage.state._apply_state(core, state)
        storage.state.save_state(core)
    # Восстанавливаем генераторы, если есть движок и конфигурация в профиле
    if engine is not None and isinstance(generators_raw, list):
        try:
            generators = [
                SignalGeneratorConfig(**item)
                for item in generators_raw
                if isinstance(item, dict)
            ]
            engine.set_generators(generators)
        except Exception:
            # Не валим загрузку профиля, если generators повреждены – просто игнорируем.
            pass
    return {"slug": slug, "loaded": True}
