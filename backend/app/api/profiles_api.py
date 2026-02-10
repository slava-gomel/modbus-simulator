from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..config import AppConfig
from ..models import ModbusConfigDTO

if TYPE_CHECKING:
    from ..modbus_core import ModbusSimulatorCore
    from ..storage import Storage

router = APIRouter(prefix="/profiles", tags=["profiles"])

_storage: "Storage | None" = None
_config: AppConfig | None = None
_core: "ModbusSimulatorCore | None" = None


def init_profiles_api(storage: "Storage", config: AppConfig, core: "ModbusSimulatorCore") -> None:
    global _storage, _config, _core  # noqa: PLW0603
    _storage = storage
    _config = config
    _core = core


def _get_deps() -> tuple["Storage", AppConfig, "ModbusSimulatorCore"]:
    if _storage is None or _config is None or _core is None:
        raise RuntimeError("Profiles API not initialized")
    return _storage, _config, _core


class ProfileSaveRequest(BaseModel):
    name: str
    comment: str = ""


@router.get("", response_model=list)
def list_profiles() -> list:
    storage, _, _ = _get_deps()
    return storage.list_profiles()


@router.post("", response_model=dict)
def save_profile(body: ProfileSaveRequest) -> dict:
    storage, _, core = _get_deps()
    slug = storage.save_profile(body.name, core, body.comment)
    return {"slug": slug, "name": body.name.strip() or slug}


@router.delete("/{slug}")
def delete_profile(slug: str) -> None:
    storage, _, _ = _get_deps()
    try:
        storage.delete_profile(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{slug}/load", response_model=dict)
def load_profile(slug: str) -> dict:
    storage, config, core = _get_deps()
    try:
        data = storage.load_profile(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    cfg = data.get("config")
    state = data.get("state")
    if cfg:
        config.modbus = ModbusConfigDTO(**cfg).to_config()
        storage.save_config()
    if state and isinstance(state, dict):
        storage._apply_state(core, state)
        storage.save_state(core)
    return {"slug": slug, "loaded": True}
