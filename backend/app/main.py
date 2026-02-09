import logging
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import config_api, state_api
from .config import get_default_config
from .modbus_core import ModbusSimulatorCore
from .modbus_server import start_modbus_tcp_server
from .storage import Storage


logger = logging.getLogger(__name__)

config = get_default_config()
storage = Storage(config)
storage.load_config()

core = ModbusSimulatorCore(
    coils_size=config.modbus.coils_size,
    discrete_inputs_size=config.modbus.discrete_inputs_size,
    holding_registers_size=config.modbus.holding_registers_size,
    input_registers_size=config.modbus.input_registers_size,
)
storage.load_state(core)

app = FastAPI(title="Modbus TCP Simulator Backend")

# CORS для доступа из браузерного SPA (dev/compose)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализируем API модулем ядра
state_api.init_state_api(core, storage)
app.include_router(config_api.router, prefix="/api")
app.include_router(state_api.router, prefix="/api")


@app.on_event("startup")
def startup_event() -> None:
    # Запускаем Modbus TCP сервер в отдельном потоке,
    # чтобы он не блокировал FastAPI.
    def run_server() -> None:
        try:
            start_modbus_tcp_server(config.modbus, core)
        except Exception:  # noqa: BLE001
            logger.exception("Modbus TCP server crashed")

    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()
    logger.info("Modbus TCP server thread started")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


