from __future__ import annotations

import logging
from typing import Optional

from pymodbus.datastore import ModbusServerContext, ModbusSlaveContext
from pymodbus.device import ModbusDeviceIdentification
from pymodbus.framer import Framer
from pymodbus.server import StartTcpServer, ServerStop

from .config import ModbusConfig
from .modbus_core import ModbusSimulatorCore
from .modbus_log import append as modbus_log_append

logger = logging.getLogger(__name__)

_FX_NAMES = {
    1: "FC01 Read Coils",
    2: "FC02 Read DI",
    3: "FC03 Read Holding",
    4: "FC04 Read Input",
    5: "FC05 Write Coil",
    6: "FC06 Write Reg",
    15: "FC15 Write Coils",
    16: "FC16 Write Regs",
}


def _modbus_request_tracer(request, *addr) -> None:
    """Трейсер для сырых Modbus-запросов (HEX + IP клиента)."""
    try:
        peer = addr[0] if addr else None
        client_ip = peer[0] if isinstance(peer, tuple) and peer else "?"
    except Exception:  # noqa: BLE001
        client_ip = "?"

    try:
        pdu = request.encode()
        hex_str = pdu.hex(" ")
    except Exception:  # noqa: BLE001
        hex_str = "<no hex>"

    fc = getattr(request, "function_code", "?")
    unit = getattr(request, "slave_id", "?")
    msg = f"{client_ip} REQ unit={unit} func={fc} hex={hex_str}"
    modbus_log_append("modbus_req_hex", msg)


def _modbus_response_tracer(response):
    """Трейсер для сырых Modbus-ответов (HEX)."""
    try:
        pdu = response.encode()
        hex_str = pdu.hex(" ")
    except Exception:  # noqa: BLE001
        hex_str = "<no hex>"

    fc = getattr(response, "function_code", "?")
    unit = getattr(response, "slave_id", "?")
    msg = f"RSP unit={unit} func={fc} hex={hex_str}"
    modbus_log_append("modbus_rsp_hex", msg)
    # Ничего не меняем в ответе, просто пробрасываем дальше
    return response, False


class InMemoryDataStore(ModbusSlaveContext):
    """
    Адаптер между pymodbus и ModbusSimulatorCore.

    Мы не используем встроенные хранилища pymodbus, а перенаправляем
    операции чтения/записи в наше ядро.
    """

    def __init__(self, core: ModbusSimulatorCore) -> None:
        # Создаём пустой контекст, но переопределяем методы
        super().__init__(zero_mode=True)
        self.core = core

    def getValues(self, fx: int, address: int, count: int = 1) -> list[int]:  # type: ignore[override]
        fx_name = _FX_NAMES.get(fx, f"FC{fx}")
        modbus_log_append("modbus_request", f"{fx_name} addr={address} count={count}")
        if fx == 1:
            vals = self.core.read_coils(address, count)
        elif fx == 2:
            vals = self.core.read_discrete_inputs(address, count)
        elif fx == 3:
            vals = self.core.read_holding_registers(address, count)
        elif fx == 4:
            vals = self.core.read_input_registers(address, count)
        else:
            logger.warning("Unsupported read function code: %s", fx)
            vals = [0] * count
        preview = vals[:8]
        suffix = "..." if len(vals) > 8 else ""
        modbus_log_append("modbus_response", f"{fx_name} → {preview}{suffix}")
        return vals

    def setValues(self, fx: int, address: int, values: list[int]) -> None:  # type: ignore[override]
        fx_name = _FX_NAMES.get(fx, f"FC{fx}")
        modbus_log_append("modbus_request", f"{fx_name} addr={address} values={values[:8]}{'...' if len(values) > 8 else ''}")
        if fx == 5:
            self.core.write_single_coil(address, values[0])
        elif fx == 6:
            self.core.write_single_holding_register(address, values[0])
        elif fx == 15:
            self.core.write_multiple_coils(address, values)
        elif fx == 16:
            self.core.write_multiple_holding_registers(address, values)
        else:
            logger.warning("Unsupported write function code: %s", fx)
            return
        modbus_log_append("modbus_response", f"{fx_name} OK")


def start_modbus_tcp_server(config: ModbusConfig, core: ModbusSimulatorCore) -> None:
    """
    Блокирующий запуск Modbus TCP сервера.

    Рекомендуется вызывать в отдельном потоке/процессе.
    Для TCP используется фреймер SOCKET (MBAP).
    """
    logging.basicConfig(level=logging.INFO)

    store = InMemoryDataStore(core)
    context = ModbusServerContext(slaves=store, single=True)

    identity = ModbusDeviceIdentification()
    identity.VendorName = "modbud_simulator"
    identity.ProductCode = "MB"
    identity.VendorUrl = "https://example.com"
    identity.ProductName = "Modbus TCP Simulator"
    identity.ModelName = "Modbus TCP Simulator"
    identity.MajorMinorRevision = "1.0"

    logger.info("Modbus TCP: запуск на %s:%s (framer=SOCKET)", config.host, config.port)
    try:
        StartTcpServer(
            context=context,
            identity=identity,
            address=(config.host, config.port),
            framer=Framer.SOCKET,
            request_tracer=_modbus_request_tracer,
            response_manipulator=_modbus_response_tracer,
        )
    finally:
        logger.info("Modbus TCP: цикл сервера завершён (address=%s:%s)", config.host, config.port)


def stop_modbus_tcp_server() -> None:
    """
    Остановить Modbus TCP сервер, запущенный через StartTcpServer.

    Использует глобальную функцию ServerStop из pymodbus.
    """
    logger.info("Stopping Modbus TCP server")
    ServerStop()

