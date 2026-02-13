"""Integration тесты для Modbus InMemoryDataStore (адаптер между pymodbus и core)."""
from __future__ import annotations

import pytest

from app.modbus_core import ModbusSimulatorCore
from app.modbus_server import InMemoryDataStore


@pytest.fixture
def core() -> ModbusSimulatorCore:
    """Создать ModbusSimulatorCore для тестирования."""
    return ModbusSimulatorCore(
        coils_size=100,
        discrete_inputs_size=100,
        holding_registers_size=100,
        input_registers_size=100,
    )


@pytest.fixture
def datastore(core: ModbusSimulatorCore) -> InMemoryDataStore:
    """Создать InMemoryDataStore (адаптер между pymodbus и core)."""
    return InMemoryDataStore(core)


class TestModbusDataStoreIntegration:
    """Integration тесты для InMemoryDataStore (адаптер pymodbus ↔ core)."""

    # ========== FC01: Read Coils ==========

    def test_fc01_read_coils_default(self, datastore: InMemoryDataStore) -> None:
        """FC01 (fx=1): чтение coils по умолчанию (все 0)."""
        values = datastore.getValues(fx=1, address=0, count=10)
        
        assert len(values) == 10
        assert all(v == 0 for v in values)

    def test_fc01_read_coils_after_write(
        self, 
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC01 (fx=1): чтение coils после записи."""
        # Запишем через core
        core.write_single_coil(5, 1)
        core.write_single_coil(7, 1)
        
        # Прочитаем через datastore
        values = datastore.getValues(fx=1, address=0, count=10)
        
        assert values[5] == 1
        assert values[7] == 1
        assert values[0] == 0

    # ========== FC02: Read Discrete Inputs ==========

    def test_fc02_read_discrete_inputs(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC02 (fx=2): чтение discrete inputs."""
        # Установим значения в core
        core.discrete_inputs.values[3] = 1
        core.discrete_inputs.values[8] = 1
        
        # Прочитаем через datastore
        values = datastore.getValues(fx=2, address=0, count=10)
        
        assert values[3] == 1
        assert values[8] == 1

    # ========== FC03: Read Holding Registers ==========

    def test_fc03_read_holding_registers_default(self, datastore: InMemoryDataStore) -> None:
        """FC03 (fx=3): чтение holding регистров по умолчанию (все 0)."""
        values = datastore.getValues(fx=3, address=0, count=10)
        
        assert len(values) == 10
        assert all(v == 0 for v in values)

    def test_fc03_read_holding_registers_after_write(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC03 (fx=3): чтение holding регистров после записи."""
        # Запишем через core
        core.write_single_holding_register(0, 100)
        core.write_single_holding_register(1, 200)
        core.write_single_holding_register(2, 300)
        
        # Прочитаем через datastore
        values = datastore.getValues(fx=3, address=0, count=5)
        
        assert values[0] == 100
        assert values[1] == 200
        assert values[2] == 300

    # ========== FC04: Read Input Registers ==========

    def test_fc04_read_input_registers(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC04 (fx=4): чтение input регистров."""
        # Установим значения
        core.input_registers.values[0] = 111
        core.input_registers.values[1] = 222
        core.input_registers.values[2] = 333
        
        # Прочитаем через datastore
        values = datastore.getValues(fx=4, address=0, count=5)
        
        assert values[0] == 111
        assert values[1] == 222
        assert values[2] == 333

    # ========== FC05: Write Single Coil ==========

    def test_fc05_write_single_coil_true(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC05 (fx=5): запись одного coil (True)."""
        # Запишем через datastore
        datastore.setValues(fx=5, address=10, values=[1])
        
        # Проверим через core
        assert core.read_coils(10, 1) == [1]
        
        # Проверим через datastore (FC01)
        read_values = datastore.getValues(fx=1, address=10, count=1)
        assert read_values[0] == 1

    def test_fc05_write_single_coil_false(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC05 (fx=5): запись одного coil (False)."""
        # Сначала установим в True
        core.write_single_coil(10, 1)
        
        # Запишем False через datastore
        datastore.setValues(fx=5, address=10, values=[0])
        
        # Проверим
        assert core.read_coils(10, 1) == [0]

    # ========== FC06: Write Single Register ==========

    def test_fc06_write_single_register(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC06 (fx=6): запись одного holding регистра."""
        # Запишем через datastore
        datastore.setValues(fx=6, address=5, values=[12345])
        
        # Проверим через core
        assert core.read_holding_registers(5, 1) == [12345]
        
        # Проверим через datastore (FC03)
        read_values = datastore.getValues(fx=3, address=5, count=1)
        assert read_values[0] == 12345

    def test_fc06_write_single_register_16bit_max(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC06 (fx=6): запись максимального 16-битного значения."""
        datastore.setValues(fx=6, address=0, values=[0xFFFF])
        assert core.read_holding_registers(0, 1) == [0xFFFF]

    # ========== FC15: Write Multiple Coils ==========

    def test_fc15_write_multiple_coils(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC15 (fx=15): запись нескольких coils."""
        values = [1, 0, 1, 1, 0, 1, 0, 0]
        
        # Запишем через datastore
        datastore.setValues(fx=15, address=10, values=values)
        
        # Проверим через core
        result = core.read_coils(10, 8)
        assert result == values
        
        # Проверим через datastore (FC01)
        read_values = datastore.getValues(fx=1, address=10, count=8)
        assert read_values == values

    def test_fc15_write_multiple_coils_all_true(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC15 (fx=15): запись всех coils как True."""
        values = [1] * 16
        datastore.setValues(fx=15, address=0, values=values)
        
        result = core.read_coils(0, 16)
        assert result == values

    # ========== FC16: Write Multiple Registers ==========

    def test_fc16_write_multiple_registers(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC16 (fx=16): запись нескольких holding регистров."""
        values = [100, 200, 300, 400, 500]
        
        # Запишем через datastore
        datastore.setValues(fx=16, address=20, values=values)
        
        # Проверим через core
        result = core.read_holding_registers(20, 5)
        assert result == values
        
        # Проверим через datastore (FC03)
        read_values = datastore.getValues(fx=3, address=20, count=5)
        assert read_values == values

    def test_fc16_write_multiple_registers_16bit_values(
        self,
        datastore: InMemoryDataStore,
        core: ModbusSimulatorCore
    ) -> None:
        """FC16 (fx=16): запись 16-битных значений."""
        values = [0xFFFF, 0x0000, 0xABCD, 0x1234, 0x5678]
        datastore.setValues(fx=16, address=0, values=values)
        
        result = core.read_holding_registers(0, 5)
        assert result == values

    # ========== Complex Scenarios ==========

    def test_scenario_read_write_sequence(
        self,
        datastore: InMemoryDataStore
    ) -> None:
        """Сценарий: последовательность чтение-запись-чтение."""
        # 1. Прочитаем начальное состояние
        read1 = datastore.getValues(fx=3, address=10, count=3)
        assert all(v == 0 for v in read1)
        
        # 2. Запишем новые значения (FC16)
        datastore.setValues(fx=16, address=10, values=[111, 222, 333])
        
        # 3. Прочитаем снова
        read2 = datastore.getValues(fx=3, address=10, count=3)
        assert read2 == [111, 222, 333]
        
        # 4. Перезапишем одно значение (FC06)
        datastore.setValues(fx=6, address=11, values=[999])
        
        # 5. Прочитаем финальное состояние
        read3 = datastore.getValues(fx=3, address=10, count=3)
        assert read3 == [111, 999, 333]

    def test_scenario_mixed_operations(
        self,
        datastore: InMemoryDataStore
    ) -> None:
        """Сценарий: смешанные операции с coils и регистрами."""
        # Запишем coils (FC15)
        datastore.setValues(fx=15, address=0, values=[1, 0, 1])
        
        # Запишем holding регистры (FC16)
        datastore.setValues(fx=16, address=0, values=[100, 200, 300])
        
        # Прочитаем coils (FC01)
        coils = datastore.getValues(fx=1, address=0, count=3)
        assert coils == [1, 0, 1]
        
        # Прочитаем holding (FC03)
        regs = datastore.getValues(fx=3, address=0, count=3)
        assert regs == [100, 200, 300]

    def test_scenario_boundary_addresses(
        self,
        datastore: InMemoryDataStore
    ) -> None:
        """Сценарий: работа с граничными адресами."""
        # Запись в последний адрес (99 для size=100)
        datastore.setValues(fx=6, address=99, values=[65535])
        
        # Чтение с последнего адреса
        read_values = datastore.getValues(fx=3, address=99, count=1)
        assert read_values[0] == 65535
        
        # Запись в первый адрес
        datastore.setValues(fx=6, address=0, values=[12345])
        read_values = datastore.getValues(fx=3, address=0, count=1)
        assert read_values[0] == 12345

    def test_scenario_large_batch_operations(
        self,
        datastore: InMemoryDataStore
    ) -> None:
        """Сценарий: большие batch операции."""
        # Запишем 50 регистров
        values = list(range(1000, 1050))
        datastore.setValues(fx=16, address=0, values=values)
        
        # Прочитаем их обратно
        read_values = datastore.getValues(fx=3, address=0, count=50)
        assert read_values == values
        
        # Прочитаем по частям
        part1 = datastore.getValues(fx=3, address=0, count=25)
        part2 = datastore.getValues(fx=3, address=25, count=25)
        
        combined = part1 + part2
        assert combined == values
