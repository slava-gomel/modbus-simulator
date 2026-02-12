from __future__ import annotations

from typing import TYPE_CHECKING, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models import SignalGeneratorConfig

if TYPE_CHECKING:
    from ..signal_generators import SignalGeneratorEngine
    from ..storage import Storage


router = APIRouter(prefix="/generators", tags=["generators"])

_storage: "Storage | None" = None
_engine: "SignalGeneratorEngine | None" = None


def init_generators_api(storage: "Storage", engine: "SignalGeneratorEngine") -> None:
    global _storage, _engine  # noqa: PLW0603
    _storage = storage
    _engine = engine


def _get_deps() -> tuple["Storage", "SignalGeneratorEngine"]:
    if _storage is None or _engine is None:
        raise RuntimeError("Generators API not initialized")
    return _storage, _engine


class GeneratorsSaveRequest(BaseModel):
    generators: List[SignalGeneratorConfig]


@router.get("", response_model=GeneratorsSaveRequest)
def list_generators() -> GeneratorsSaveRequest:
    _, engine = _get_deps()
    gens = engine.get_generators()
    return GeneratorsSaveRequest(generators=gens)


@router.put("", response_model=GeneratorsSaveRequest)
def save_generators(body: GeneratorsSaveRequest) -> GeneratorsSaveRequest:
    storage, engine = _get_deps()

    # Простая валидация: уникальные id
    ids = [g.id for g in body.generators]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=400, detail="Generator IDs must be unique")

    # Обновляем движок
    engine.set_generators(body.generators)

    # Сохраняем в последнем профиле недетерминированно нельзя, поэтому
    # генераторы живут только в файлах профилей; профиль API при сохранении
    # прочитает текущий набор через engine.get_generators().
    # Здесь же можно сохранить глобальный snapshot, если потребуется.
    # Пока просто возвращаем актуальное состояние.
    return GeneratorsSaveRequest(generators=engine.get_generators())

