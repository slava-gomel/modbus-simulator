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

