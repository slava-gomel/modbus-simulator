from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..modbus_core import ModbusSimulatorCore
from ..models import RegisterKind, RegisterRangeRequest, RegisterRangeResponse
from ..storage import Storage


router = APIRouter(prefix="/state", tags=["state"])

_core: ModbusSimulatorCore | None = None
_storage: Storage | None = None


def init_state_api(core: ModbusSimulatorCore, storage: Storage) -> None:
    global _core, _storage  # noqa: PLW0603
    _core = core
    _storage = storage


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
def write_single(
    kind: RegisterKind,
    start: int = Query(0, ge=0),
    value: int = Query(...),
) -> RegisterRangeResponse:
    """
    На первом этапе реализуем только одиночную запись (05/06),
    выравниваясь по возможностям Modbus.
    """
    core = _get_core()
    try:
        if kind == "coils":
            core.write_single_coil(start, value)
        elif kind == "holding":
            core.write_single_holding_register(start, value)
        else:
            raise HTTPException(
                status_code=400,
                detail="Write supported only for 'coils' and 'holding' at this stage",
            )
    except IndexError:
        raise HTTPException(status_code=400, detail="Address out of bounds") from None

    storage = _get_storage()
    if storage is not None:
        storage.save_state(core)

    # Вернём одно значение как диапазон длиной 1
    if kind == "coils":
        values = core.read_coils(start, 1)
    else:
        values = core.read_holding_registers(start, 1)

    return RegisterRangeResponse(kind=kind, start=start, values=values)


@router.put("/{kind}/batch", response_model=RegisterRangeResponse)
def write_multiple(
    kind: RegisterKind,
    body: RegisterRangeRequest,
) -> RegisterRangeResponse:
    """
    Множественная запись (15/16) поверх REST API.
    """
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
        else:
            raise HTTPException(
                status_code=400,
                detail="Batch write supported only for 'coils' and 'holding'",
            )
    except IndexError:
        raise HTTPException(status_code=400, detail="Address range out of bounds") from None

    storage = _get_storage()
    if storage is not None:
        storage.save_state(core)

    # Вернём записанное значение как подтверждение
    read_count = len(values)
    if kind == "coils":
        read_back = core.read_coils(start, read_count)
    else:
        read_back = core.read_holding_registers(start, read_count)

    return RegisterRangeResponse(kind=kind, start=start, values=read_back)

