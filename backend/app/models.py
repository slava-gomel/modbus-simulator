from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field

from .config import ModbusConfig


class ModbusConfigDTO(BaseModel):
    """DTO для работы с конфигурацией Modbus через API."""

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=1502, ge=1, le=65535)
    unit_id: int = Field(default=1, ge=1, le=247)
    coils_size: int = Field(default=256, ge=1)
    discrete_inputs_size: int = Field(default=256, ge=1)
    holding_registers_size: int = Field(default=256, ge=1)
    input_registers_size: int = Field(default=256, ge=1)

    @classmethod
    def from_config(cls, cfg: ModbusConfig) -> "ModbusConfigDTO":
        return cls(
            host=cfg.host,
            port=cfg.port,
            unit_id=cfg.unit_id,
            coils_size=cfg.coils_size,
            discrete_inputs_size=cfg.discrete_inputs_size,
            holding_registers_size=cfg.holding_registers_size,
            input_registers_size=cfg.input_registers_size,
        )

    def to_config(self) -> ModbusConfig:
        return ModbusConfig(
            host=self.host,
            port=self.port,
            unit_id=self.unit_id,
            coils_size=self.coils_size,
            discrete_inputs_size=self.discrete_inputs_size,
            holding_registers_size=self.holding_registers_size,
            input_registers_size=self.input_registers_size,
        )


RegisterKind = Literal["coils", "discrete_inputs", "holding", "input"]


class RangeQuery(BaseModel):
    start: int = Field(ge=0)
    count: int = Field(gt=0)


class RegisterRangeRequest(RangeQuery):
    values: List[int]


class RegisterRangeResponse(BaseModel):
    kind: RegisterKind
    start: int
    values: List[int]


# ---------- Signal Generators ----------

SignalWaveType = Literal["sine", "saw", "square", "constant"]
SignalDataType = Literal["int16", "float32", "float64"]


class SignalGeneratorConfig(BaseModel):
    """
    Конфигурация одного генератора сигнала, привязанного к диапазону регистров.

    Генератор сам по себе ничего не знает о конкретном устройстве, только о том,
    какие регистры он заполняет и по какой формуле считает значения.
    """

    id: str = Field(description="Уникальный идентификатор генератора в рамках профиля")
    enabled: bool = Field(default=True, description="Флаг включения генератора")
    name: str | None = Field(
        default=None,
        description="Опциональное человеко‑читаемое имя генератора",
    )

    # Где писать значения
    register_kind: Literal["holding", "input"] = Field(
        default="holding",
        description="Тип области регистров: holding или input",
    )
    start_address: int = Field(
        ge=0,
        description="Начальный адрес holding‑регистра, в который будет писаться значение",
    )
    register_count: int = Field(
        default=1,
        ge=1,
        description=(
            "Сколько 16‑битных регистров занимает значение: "
            "1 для INT16, 2 для FLOAT32, 4 для FLOAT64"
        ),
    )

    # Тип данных и сигнала
    data_type: SignalDataType = Field(
        default="int16",
        description="Формат данных, в который кодируется значение (INT16, FLOAT32, FLOAT64)",
    )
    wave_type: SignalWaveType = Field(
        default="sine",
        description="Тип сигнала: синус, пила, меандр или константа",
    )

    # Параметры сигнала
    amplitude: float = Field(
        default=1.0,
        description="Амплитуда сигнала",
    )
    offset: float = Field(
        default=0.0,
        description="Смещение относительно нуля",
    )
    frequency_hz: float = Field(
        default=1.0,
        gt=0.0,
        description="Частота сигнала в герцах",
    )
    update_period_ms: int = Field(
        default=100,
        ge=10,
        description="Период обновления значений в миллисекундах",
    )
    neon_color: str | None = Field(
        default=None,
        description="Цвет неоновой подсветки рамки значения в GUI (hex, например #00ff88)",
    )


class SignalGeneratorsProfileData(BaseModel):
    """
    Набор генераторов, связанный с конкретным профилем.

    Хранится внутри YAML‑профиля рядом с config/state.
    """

    generators: List[SignalGeneratorConfig] = Field(default_factory=list)

