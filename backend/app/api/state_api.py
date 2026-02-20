from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Query

from ..modbus_core import ModbusSimulatorCore
from ..models import RegisterKind, RegisterRangeRequest, RegisterRangeResponse
from ..storage import Storage

if TYPE_CHECKING:
    from ..websocket_manager import ConnectionManager


router = APIRouter(prefix="/state", tags=["state"])

_core: ModbusSimulatorCore | None = None
_storage: Storage | None = None
_ws_manager: ConnectionManager | None = None


def init_state_api(core: ModbusSimulatorCore, storage: Storage, ws_manager: ConnectionManager | None = None) -> None:
    global _core, _storage, _ws_manager  # noqa: PLW0603
    _core = core
    _storage = storage
    _ws_manager = ws_manager


def _get_core() -> ModbusSimulatorCore:
    if _core is None:
        raise RuntimeError("Modbus core is not initialized")
    return _core


def _get_storage() -> Storage | None:
    return _storage


@router.get("/{kind}", response_model=RegisterRangeResponse)
def read_registers(
    kind: RegisterKind,
    start: int = Query(0, ge=0),
    count: int = Query(1, gt=0),
) -> RegisterRangeResponse:
    core = _get_core()
    try:
        if kind == "coils":
            values = core.read_coils(start, count)
        elif kind == "discrete_inputs":
            values = core.read_discrete_inputs(start, count)
        elif kind == "holding":
            values = core.read_holding_registers(start, count)
        elif kind == "input":
            values = core.read_input_registers(start, count)
        else:  # pragma: no cover - защита от приведения типов
            raise HTTPException(status_code=400, detail="Unknown register kind")
    except IndexError:
        raise HTTPException(status_code=400, detail="Address range out of bounds") from None

    return RegisterRangeResponse(kind=kind, start=start, values=values)


@router.put("/{kind}", response_model=RegisterRangeResponse)
async def write_single(
    kind: RegisterKind,
    start: int = Query(0, ge=0),
    value: int = Query(...),
) -> RegisterRangeResponse:
    """Одиночная запись (05/06) поверх REST API.

    Для целей симулятора поддерживаем также запись в input‑регистры, хотя
    в самом протоколе Modbus FC04 является только read‑функцией. Это позволяет
    управлять значениями input‑регистров из GUI и генераторов.
    """
    core = _get_core()
    try:
        if kind == "coils":
            core.write_single_coil(start, value)
        elif kind == "holding":
            core.write_single_holding_register(start, value)
        elif kind == "input":
            core.write_single_input_register(start, value)
        else:
            raise HTTPException(
                status_code=400,
                detail="Write supported only for 'coils', 'holding' and 'input'",
            )
    except IndexError:
        raise HTTPException(status_code=400, detail="Address out of bounds") from None

    storage = _get_storage()
    if storage is not None:
        storage.state.save_state(core)

    # Вернём одно значение как диапазон длиной 1
    if kind == "coils":
        values = core.read_coils(start, 1)
    elif kind == "holding":
        values = core.read_holding_registers(start, 1)
    else:
        values = core.read_input_registers(start, 1)
    
    # WebSocket broadcast изменений
    if _ws_manager:
        await _ws_manager.broadcast("registers", {
            "event": "registers_changed",
            "data": {"kind": kind, "start": start, "count": 1, "values": values}
        })

    return RegisterRangeResponse(kind=kind, start=start, values=values)


@router.put("/{kind}/batch", response_model=RegisterRangeResponse)
async def write_multiple(
    kind: RegisterKind,
    body: RegisterRangeRequest,
) -> RegisterRangeResponse:
    """Множественная запись (15/16) поверх REST API."""
    core = _get_core()
    start = body.start
    values = body.values

    if not values:
        raise HTTPException(status_code=400, detail="Values list must not be empty")

    try:
        if kind == "coils":
            core.write_multiple_coils(start, values)
        elif kind == "holding":
            core.write_multiple_holding_registers(start, values)
        elif kind == "input":
            core.write_multiple_input_registers(start, values)
        else:
            raise HTTPException(status_code=400, detail="Batch write supported for coils/holding/input only")
    except IndexError:
        raise HTTPException(status_code=400, detail="Address range out of bounds") from None

    storage = _get_storage()
    if storage is not None:
        storage.state.save_state(core)

    # Вернём записанное значение как подтверждение
    read_count = len(values)
    if kind == "coils":
        read_back = core.read_coils(start, read_count)
    elif kind == "holding":
        read_back = core.read_holding_registers(start, read_count)
    else:
        read_back = core.read_input_registers(start, read_count)
    
    # WebSocket broadcast изменений
    if _ws_manager:
        await _ws_manager.broadcast("registers", {
            "event": "registers_changed",
            "data": {"kind": kind, "start": start, "count": read_count, "values": read_back}
        })

    return RegisterRangeResponse(kind=kind, start=start, values=read_back)

