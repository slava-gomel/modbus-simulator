from __future__ import annotations

import logging
from typing import Optional

from pymodbus.datastore import ModbusServerContext, ModbusSlaveContext
from pymodbus.device import ModbusDeviceIdentification
from pymodbus.server import StartTcpServer, ServerStop
from pymodbus.transaction import ModbusRtuFramer

from .config import ModbusConfig
from .modbus_core import ModbusSimulatorCore

logger = logging.getLogger(__name__)


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
        # fx: function code
        if fx == 1:
            return self.core.read_coils(address, count)
        if fx == 2:
            return self.core.read_discrete_inputs(address, count)
        if fx == 3:
            return self.core.read_holding_registers(address, count)
        if fx == 4:
            return self.core.read_input_registers(address, count)
        logger.warning("Unsupported read function code: %s", fx)
        return [0] * count

    def setValues(self, fx: int, address: int, values: list[int]) -> None:  # type: ignore[override]
        if fx == 5:
            # Write Single Coil – ожидаем один бит
            self.core.write_single_coil(address, values[0])
            return
        if fx == 6:
            # Write Single Register – один регистр
            self.core.write_single_holding_register(address, values[0])
            return
        if fx == 15:
            # Write Multiple Coils
            self.core.write_multiple_coils(address, values)
            return
        if fx == 16:
            # Write Multiple Holding Registers
            self.core.write_multiple_holding_registers(address, values)
            return
        logger.warning("Unsupported write function code: %s", fx)


def start_modbus_tcp_server(config: ModbusConfig, core: ModbusSimulatorCore) -> None:
    """
    Блокирующий запуск Modbus TCP сервера.

    Рекомендуется вызывать в отдельном потоке/процессе.
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

    logger.info("Starting Modbus TCP server on %s:%s", config.host, config.port)
    StartTcpServer(
        context,
        identity=identity,
        address=(config.host, config.port),
        framer=ModbusRtuFramer,  # стандартный framer
    )


def stop_modbus_tcp_server() -> None:
    """
    Остановить Modbus TCP сервер, запущенный через StartTcpServer.

    Использует глобальную функцию ServerStop из pymodbus.
    """
    logger.info("Stopping Modbus TCP server")
    ServerStop()

