"""Тесты для ModbusSimulatorCore - unit тесты всех Modbus функций."""
from __future__ import annotations

import pytest

from app.modbus_core import ModbusSimulatorCore, RegisterBlock


class TestRegisterBlock:
    """Тесты для базового блока регистров."""

    def test_init_creates_zeroed_array(self) -> None:
        """Инициализация создаёт массив нулей."""
        block = RegisterBlock(size=10, is_bool=False)
        assert len(block.values) == 10
        assert all(v == 0 for v in block.values)

    def test_read_within_range(self) -> None:
        """Чтение в пределах диапазона."""
        block = RegisterBlock(size=10, is_bool=False)
        block.values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        
        result = block.read(2, 3)
        assert result == [2, 3, 4]

    def test_read_at_boundary(self) -> None:
        """Чтение на границе диапазона."""
        block = RegisterBlock(size=10, is_bool=False)
        block.values = list(range(10))
        
        # Чтение с начала
        result = block.read(0, 3)
        assert result == [0, 1, 2]
        
        # Чтение до конца
        result = block.read(7, 3)
        assert result == [7, 8, 9]

    def test_read_out_of_range_raises(self) -> None:
        """Чтение за пределами диапазона вызывает ошибку."""
        block = RegisterBlock(size=10, is_bool=False)
        
        with pytest.raises(IndexError, match="Address out of range"):
            block.read(8, 5)  # 8 + 5 = 13 > 10
        
        with pytest.raises(IndexError):
            block.read(-1, 1)  # Отрицательный адрес

    def test_write_single_holding_register(self) -> None:
        """Запись одного holding регистра."""
        block = RegisterBlock(size=10, is_bool=False)
        
        block.write_single(5, 0xABCD)
        assert block.values[5] == 0xABCD

    def test_write_single_masks_to_16bit(self) -> None:
        """Запись в holding регистр маскируется до 16 бит."""
        block = RegisterBlock(size=10, is_bool=False)
        
        block.write_single(0, 0x1ABCD)  # Больше 16 бит
        assert block.values[0] == 0xABCD  # Маскировано & 0xFFFF

    def test_write_single_bool_coil_true(self) -> None:
        """Запись True в coil."""
        block = RegisterBlock(size=10, is_bool=True)
        
        block.write_single(3, 1)
        assert block.values[3] == 1
        
        block.write_single(4, 255)  # Любое ненулевое значение
        assert block.values[4] == 1

    def test_write_single_bool_coil_false(self) -> None:
        """Запись False в coil."""
        block = RegisterBlock(size=10, is_bool=True)
        
        block.write_single(3, 0)
        assert block.values[3] == 0

    def test_write_single_out_of_range_raises(self) -> None:
        """Запись за пределами диапазона вызывает ошибку."""
        block = RegisterBlock(size=10, is_bool=False)
        
        with pytest.raises(IndexError, match="Address out of range"):
            block.write_single(10, 100)  # Адрес 10 >= size 10


class TestModbusSimulatorCore:
    """Тесты для ModbusSimulatorCore."""

    @pytest.fixture
    def core(self) -> ModbusSimulatorCore:
        """Создать экземпляр core с типичными размерами."""
        return ModbusSimulatorCore(
            coils_size=100,
            discrete_inputs_size=100,
            holding_registers_size=100,
            input_registers_size=100,
        )

    # ========== FC01: Read Coils ==========

    def test_fc01_read_coils_default_zero(self, core: ModbusSimulatorCore) -> None:
        """FC01: чтение coils, по умолчанию все нули."""
        result = core.read_coils(0, 10)
        assert len(result) == 10
        assert all(v == 0 for v in result)

    def test_fc01_read_coils_after_write(self, core: ModbusSimulatorCore) -> None:
        """FC01: чтение coils после записи."""
        core.write_single_coil(5, 1)
        core.write_single_coil(7, 1)
        
        result = core.read_coils(0, 10)
        expected = [0, 0, 0, 0, 0, 1, 0, 1, 0, 0]
        assert result == expected

    def test_fc01_read_coils_range(self, core: ModbusSimulatorCore) -> None:
        """FC01: чтение диапазона coils."""
        for i in range(10, 20):
            core.write_single_coil(i, i % 2)  # 0, 1, 0, 1, ...
        
        result = core.read_coils(10, 10)
        expected = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
        assert result == expected

    # ========== FC02: Read Discrete Inputs ==========

    def test_fc02_read_discrete_inputs_default_zero(self, core: ModbusSimulatorCore) -> None:
        """FC02: чтение discrete inputs, по умолчанию все нули."""
        result = core.read_discrete_inputs(0, 10)
        assert len(result) == 10
        assert all(v == 0 for v in result)

    def test_fc02_read_discrete_inputs_after_manual_set(self, core: ModbusSimulatorCore) -> None:
        """FC02: чтение discrete inputs после ручной установки значений."""
        # Discrete inputs обычно только для чтения, но для тестирования установим напрямую
        core.discrete_inputs.values[5] = 1
        core.discrete_inputs.values[7] = 1
        
        result = core.read_discrete_inputs(0, 10)
        expected = [0, 0, 0, 0, 0, 1, 0, 1, 0, 0]
        assert result == expected

    # ========== FC03: Read Holding Registers ==========

    def test_fc03_read_holding_default_zero(self, core: ModbusSimulatorCore) -> None:
        """FC03: чтение holding регистров, по умолчанию все нули."""
        result = core.read_holding_registers(0, 10)
        assert len(result) == 10
        assert all(v == 0 for v in result)

    def test_fc03_read_holding_after_write(self, core: ModbusSimulatorCore) -> None:
        """FC03: чтение holding регистров после записи."""
        core.write_single_holding_register(0, 100)
        core.write_single_holding_register(1, 200)
        core.write_single_holding_register(2, 300)
        
        result = core.read_holding_registers(0, 5)
        expected = [100, 200, 300, 0, 0]
        assert result == expected

    def test_fc03_read_holding_16bit_values(self, core: ModbusSimulatorCore) -> None:
        """FC03: чтение 16-битных значений."""
        core.write_single_holding_register(0, 0xFFFF)
        core.write_single_holding_register(1, 0xABCD)
        core.write_single_holding_register(2, 0x1234)
        
        result = core.read_holding_registers(0, 3)
        assert result == [0xFFFF, 0xABCD, 0x1234]

    # ========== FC04: Read Input Registers ==========

    def test_fc04_read_input_registers_default_zero(self, core: ModbusSimulatorCore) -> None:
        """FC04: чтение input регистров, по умолчанию все нули."""
        result = core.read_input_registers(0, 10)
        assert len(result) == 10
        assert all(v == 0 for v in result)

    def test_fc04_read_input_registers_after_manual_set(self, core: ModbusSimulatorCore) -> None:
        """FC04: чтение input регистров после ручной установки."""
        # Input registers обычно только для чтения, но для тестирования установим напрямую
        core.input_registers.values[0] = 111
        core.input_registers.values[1] = 222
        core.input_registers.values[2] = 333
        
        result = core.read_input_registers(0, 5)
        expected = [111, 222, 333, 0, 0]
        assert result == expected

    # ========== FC05: Write Single Coil ==========

    def test_fc05_write_single_coil_true(self, core: ModbusSimulatorCore) -> None:
        """FC05: запись True в один coil."""
        core.write_single_coil(10, 1)
        
        result = core.read_coils(10, 1)
        assert result == [1]

    def test_fc05_write_single_coil_false(self, core: ModbusSimulatorCore) -> None:
        """FC05: запись False в один coil."""
        core.write_single_coil(10, 1)  # Сначала установим в 1
        core.write_single_coil(10, 0)  # Потом сбросим в 0
        
        result = core.read_coils(10, 1)
        assert result == [0]

    def test_fc05_write_single_coil_nonzero_is_true(self, core: ModbusSimulatorCore) -> None:
        """FC05: любое ненулевое значение интерпретируется как True."""
        core.write_single_coil(5, 255)
        result = core.read_coils(5, 1)
        assert result == [1]
        
        core.write_single_coil(6, 0xFF00)
        result = core.read_coils(6, 1)
        assert result == [1]

    # ========== FC06: Write Single Holding Register ==========

    def test_fc06_write_single_holding_register(self, core: ModbusSimulatorCore) -> None:
        """FC06: запись одного holding регистра."""
        core.write_single_holding_register(5, 12345)
        
        result = core.read_holding_registers(5, 1)
        assert result == [12345]

    def test_fc06_write_single_holding_max_value(self, core: ModbusSimulatorCore) -> None:
        """FC06: запись максимального 16-битного значения."""
        core.write_single_holding_register(0, 0xFFFF)
        
        result = core.read_holding_registers(0, 1)
        assert result == [0xFFFF]

    def test_fc06_write_single_holding_overwrites_previous(self, core: ModbusSimulatorCore) -> None:
        """FC06: перезапись существующего значения."""
        core.write_single_holding_register(10, 100)
        core.write_single_holding_register(10, 200)
        
        result = core.read_holding_registers(10, 1)
        assert result == [200]

    # ========== FC15: Write Multiple Coils ==========

    def test_fc15_write_multiple_coils(self, core: ModbusSimulatorCore) -> None:
        """FC15: запись нескольких coils."""
        core.write_multiple_coils(10, [1, 0, 1, 1, 0])
        
        result = core.read_coils(10, 5)
        assert result == [1, 0, 1, 1, 0]

    def test_fc15_write_multiple_coils_all_true(self, core: ModbusSimulatorCore) -> None:
        """FC15: запись всех coils как True."""
        core.write_multiple_coils(0, [1] * 10)
        
        result = core.read_coils(0, 10)
        assert result == [1] * 10

    def test_fc15_write_multiple_coils_all_false(self, core: ModbusSimulatorCore) -> None:
        """FC15: запись всех coils как False."""
        # Сначала установим в 1
        core.write_multiple_coils(0, [1] * 10)
        # Потом сбросим в 0
        core.write_multiple_coils(0, [0] * 10)
        
        result = core.read_coils(0, 10)
        assert result == [0] * 10

    def test_fc15_write_multiple_coils_empty_list(self, core: ModbusSimulatorCore) -> None:
        """FC15: запись пустого списка (граничный случай)."""
        core.write_multiple_coils(10, [])
        
        # Не должно быть изменений
        result = core.read_coils(10, 5)
        assert result == [0, 0, 0, 0, 0]

    def test_fc15_write_multiple_coils_out_of_range_raises(self, core: ModbusSimulatorCore) -> None:
        """FC15: запись за пределами диапазона вызывает ошибку."""
        with pytest.raises(IndexError, match="Address out of range"):
            core.write_multiple_coils(95, [1] * 10)  # 95 + 10 = 105 > 100

    # ========== FC16: Write Multiple Holding Registers ==========

    def test_fc16_write_multiple_holding_registers(self, core: ModbusSimulatorCore) -> None:
        """FC16: запись нескольких holding регистров."""
        core.write_multiple_holding_registers(20, [100, 200, 300, 400, 500])
        
        result = core.read_holding_registers(20, 5)
        assert result == [100, 200, 300, 400, 500]

    def test_fc16_write_multiple_holding_16bit_values(self, core: ModbusSimulatorCore) -> None:
        """FC16: запись 16-битных значений."""
        values = [0xFFFF, 0x0000, 0xABCD, 0x1234, 0x5678]
        core.write_multiple_holding_registers(0, values)
        
        result = core.read_holding_registers(0, 5)
        assert result == values

    def test_fc16_write_multiple_holding_overwrites(self, core: ModbusSimulatorCore) -> None:
        """FC16: перезапись существующих значений."""
        core.write_multiple_holding_registers(10, [1, 2, 3, 4, 5])
        core.write_multiple_holding_registers(10, [10, 20, 30, 40, 50])
        
        result = core.read_holding_registers(10, 5)
        assert result == [10, 20, 30, 40, 50]

    def test_fc16_write_multiple_holding_partial_overwrite(self, core: ModbusSimulatorCore) -> None:
        """FC16: частичная перезапись диапазона."""
        core.write_multiple_holding_registers(10, [1, 2, 3, 4, 5])
        core.write_multiple_holding_registers(12, [99, 88])  # Перезапишем только 12-13
        
        result = core.read_holding_registers(10, 5)
        assert result == [1, 2, 99, 88, 5]

    def test_fc16_write_multiple_holding_empty_list(self, core: ModbusSimulatorCore) -> None:
        """FC16: запись пустого списка (граничный случай)."""
        core.write_multiple_holding_registers(10, [])
        
        # Не должно быть изменений
        result = core.read_holding_registers(10, 5)
        assert result == [0, 0, 0, 0, 0]

    def test_fc16_write_multiple_holding_out_of_range_raises(self, core: ModbusSimulatorCore) -> None:
        """FC16: запись за пределами диапазона вызывает ошибку."""
        with pytest.raises(IndexError, match="Address out of range"):
            core.write_multiple_holding_registers(95, [1, 2, 3, 4, 5, 6])  # 95 + 6 = 101 > 100

    # ========== Integration Scenarios ==========

    def test_scenario_multiple_operations_on_same_registers(self, core: ModbusSimulatorCore) -> None:
        """Сценарий: множественные операции на одних регистрах."""
        # Запишем batch
        core.write_multiple_holding_registers(0, [10, 20, 30, 40, 50])
        
        # Прочитаем
        result1 = core.read_holding_registers(0, 5)
        assert result1 == [10, 20, 30, 40, 50]
        
        # Перезапишем один
        core.write_single_holding_register(2, 999)
        
        # Прочитаем снова
        result2 = core.read_holding_registers(0, 5)
        assert result2 == [10, 20, 999, 40, 50]
        
        # Batch перезапись
        core.write_multiple_holding_registers(1, [111, 222])
        
        result3 = core.read_holding_registers(0, 5)
        assert result3 == [10, 111, 222, 40, 50]

    def test_scenario_independent_register_types(self, core: ModbusSimulatorCore) -> None:
        """Сценарий: независимость разных типов регистров."""
        # Запишем coils
        core.write_multiple_coils(0, [1, 1, 1])
        
        # Запишем holding
        core.write_multiple_holding_registers(0, [100, 200, 300])
        
        # Установим discrete inputs и input registers вручную
        core.discrete_inputs.values[0] = 1
        core.input_registers.values[0] = 500
        
        # Проверим независимость
        assert core.read_coils(0, 3) == [1, 1, 1]
        assert core.read_discrete_inputs(0, 3) == [1, 0, 0]
        assert core.read_holding_registers(0, 3) == [100, 200, 300]
        assert core.read_input_registers(0, 3) == [500, 0, 0]

    def test_scenario_boundary_addresses(self, core: ModbusSimulatorCore) -> None:
        """Сценарий: работа с граничными адресами."""
        # Запись в последний адрес
        core.write_single_holding_register(99, 65535)
        result = core.read_holding_registers(99, 1)
        assert result == [65535]
        
        # Запись в первый адрес
        core.write_single_holding_register(0, 12345)
        result = core.read_holding_registers(0, 1)
        assert result == [12345]
        
        # Batch до конца
        core.write_multiple_holding_registers(97, [1, 2, 3])
        result = core.read_holding_registers(97, 3)
        assert result == [1, 2, 3]

    def test_scenario_coils_pattern(self, core: ModbusSimulatorCore) -> None:
        """Сценарий: работа с паттернами coils."""
        # Шахматный паттерн
        pattern = [i % 2 for i in range(16)]
        core.write_multiple_coils(0, pattern)
        
        result = core.read_coils(0, 16)
        assert result == pattern
        
        # Все единицы
        core.write_multiple_coils(20, [1] * 8)
        result = core.read_coils(20, 8)
        assert result == [1] * 8

    def test_scenario_holding_registers_sequence(self, core: ModbusSimulatorCore) -> None:
        """Сценарий: последовательная запись holding регистров."""
        # Запишем последовательность 0, 1, 2, ..., 9
        sequence = list(range(10))
        core.write_multiple_holding_registers(50, sequence)
        
        # Прочитаем по частям
        part1 = core.read_holding_registers(50, 5)
        part2 = core.read_holding_registers(55, 5)
        
        assert part1 == [0, 1, 2, 3, 4]
        assert part2 == [5, 6, 7, 8, 9]
        
        # Прочитаем всё сразу
        full = core.read_holding_registers(50, 10)
        assert full == sequence
