from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class RegisterBlock:
    """Простая in-memory область регистров/дискретных значений."""

    size: int
    is_bool: bool
    values: List[int] = field(init=False)

    def __post_init__(self) -> None:
        default = 0
        self.values = [default] * self.size

    def _check_range(self, address: int, count: int) -> None:
        if address < 0 or address + count > self.size:
            raise IndexError("Address out of range")

    def read(self, address: int, count: int) -> List[int]:
        self._check_range(address, count)
        return self.values[address : address + count]

    def write_single(self, address: int, value: int) -> None:
        self._check_range(address, 1)
        if self.is_bool:
            self.values[address] = 1 if bool(value) else 0
        else:
            # 16-битное значение
            self.values[address] = value & 0xFFFF


class ModbusSimulatorCore:
    """
    Ядро симулятора Modbus.

    Хранит состояние coils, discrete inputs, holding и input registers и
    предоставляет методы, которые будет вызывать Modbus TCP сервер.
    """

    def __init__(
        self,
        coils_size: int,
        discrete_inputs_size: int,
        holding_registers_size: int,
        input_registers_size: int,
    ) -> None:
        self.coils = RegisterBlock(coils_size, is_bool=True)
        self.discrete_inputs = RegisterBlock(discrete_inputs_size, is_bool=True)
        self.holding_registers = RegisterBlock(holding_registers_size, is_bool=False)
        self.input_registers = RegisterBlock(input_registers_size, is_bool=False)

    # Coils (01, 05)
    def read_coils(self, address: int, count: int) -> list[int]:
        return self.coils.read(address, count)

    def write_single_coil(self, address: int, value: int) -> None:
        self.coils.write_single(address, value)

    # Discrete Inputs (02)
    def read_discrete_inputs(self, address: int, count: int) -> list[int]:
        return self.discrete_inputs.read(address, count)

    # Holding Registers (03, 06)
    def read_holding_registers(self, address: int, count: int) -> list[int]:
        return self.holding_registers.read(address, count)

    def write_single_holding_register(self, address: int, value: int) -> None:
        self.holding_registers.write_single(address, value)

    # Input Registers (04)
    def read_input_registers(self, address: int, count: int) -> list[int]:
        return self.input_registers.read(address, count)

