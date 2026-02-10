from pathlib import Path
from pydantic import BaseModel
import os


class ModbusConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = int(os.getenv("MODBUS_PORT", "1502"))
    unit_id: int = 1
    coils_size: int = 256
    discrete_inputs_size: int = 256
    holding_registers_size: int = 256
    input_registers_size: int = 256


class StorageConfig(BaseModel):
    data_dir: Path = Path(os.getenv("DATA_DIR", "/data"))
    config_file: str = "config.yaml"
    state_file: str = "state.json"
    profiles_dir: str = "profiles"

    @property
    def config_path(self) -> Path:
        return self.data_dir / self.config_file

    @property
    def state_path(self) -> Path:
        return self.data_dir / self.state_file

    @property
    def profiles_path(self) -> Path:
        return self.data_dir / self.profiles_dir


class AppConfig(BaseModel):
    api_host: str = "0.0.0.0"
    api_port: int = int(os.getenv("API_PORT", "8000"))
    modbus: ModbusConfig = ModbusConfig()
    storage: StorageConfig = StorageConfig()


def get_default_config() -> AppConfig:
    return AppConfig()

