import logging
import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .api import config_api, state_api
from .config import get_default_config
from .modbus_core import ModbusSimulatorCore
from .modbus_server import start_modbus_tcp_server, stop_modbus_tcp_server
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


class ServerStatus(BaseModel):
    running: bool
    host: str
    port: int


_server_thread: threading.Thread | None = None
_server_running: bool = False


def _start_server_thread() -> None:
    global _server_thread, _server_running  # noqa: PLW0603
    # Не запускаем второй экземпляр, если поток уже работает
    if _server_thread is not None and _server_thread.is_alive():
        return
    # Сбрасываем ссылку на завершённый поток, чтобы завести новый
    if _server_thread is not None and not _server_thread.is_alive():
        _server_thread = None

    def run_server() -> None:
        global _server_running  # noqa: PLW0603
        _server_running = True
        try:
            start_modbus_tcp_server(config.modbus, core)
        except Exception:  # noqa: BLE001
            logger.exception("Modbus TCP server crashed")
        finally:
            _server_running = False

    _server_thread = threading.Thread(target=run_server, daemon=True)
    _server_thread.start()
    logger.info("Modbus TCP server thread started")


def _get_server_status() -> ServerStatus:
    running = _server_thread is not None and _server_thread.is_alive()
    return ServerStatus(running=bool(running), host=config.modbus.host, port=config.modbus.port)


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
    # Автоматически запускаем Modbus TCP сервер при старте приложения.
    _start_server_thread()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/server/status", response_model=ServerStatus)
def server_status() -> ServerStatus:
    return _get_server_status()


@app.post("/api/server/start", response_model=ServerStatus)
def server_start() -> ServerStatus:
    # Даём ОС время освободить порт после предыдущего Stop
    if _server_thread is not None and not _server_thread.is_alive():
        time.sleep(1)
    _start_server_thread()
    return _get_server_status()


@app.post("/api/server/stop", response_model=ServerStatus)
def server_stop() -> ServerStatus:
    global _server_thread  # noqa: PLW0603
    if _server_thread is not None and _server_thread.is_alive():
        stop_modbus_tcp_server()
        _server_thread.join(timeout=5)
        if _server_thread is not None and not _server_thread.is_alive():
            _server_thread = None
    return _get_server_status()

