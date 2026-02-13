import base64
import logging
import os
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .api import config_api, generators_api, profiles_api, state_api
from .config import get_default_config
from .modbus_core import ModbusSimulatorCore
from .modbus_log import get_events as get_modbus_log_events
from .modbus_server import start_modbus_tcp_server, stop_modbus_tcp_server
from .signal_generators import SignalGeneratorEngine
from .storage import Storage


logger = logging.getLogger(__name__)

config = get_default_config()
storage = Storage(config)
storage.config.load_config()

core = ModbusSimulatorCore(
    coils_size=config.modbus.coils_size,
    discrete_inputs_size=config.modbus.discrete_inputs_size,
    holding_registers_size=config.modbus.holding_registers_size,
    input_registers_size=config.modbus.input_registers_size,
)
storage.state.load_state(core)

signal_generators_engine = SignalGeneratorEngine(core)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Запускаем фоновые генераторы сигналов
    signal_generators_engine.start()
    try:
        # Modbus‑сервер запускается по кнопке "Запустить" в GUI, не при старте бэкенда
        yield
    finally:
        # Останавливаем поток генераторов при завершении приложения
        signal_generators_engine.stop()


app = FastAPI(title="Modbus TCP Simulator Backend", lifespan=lifespan)


class ServerStatus(BaseModel):
    running: bool
    host: str
    port: int
    error: str | None = None


_server_thread: threading.Thread | None = None
_server_running: bool = False
_server_start_error: str | None = None


def _start_server_thread() -> None:
    global _server_thread, _server_running, _server_start_error  # noqa: PLW0603
    if _server_thread is not None and _server_thread.is_alive():
        logger.info("Modbus: запрос на запуск проигнорирован — поток уже запущен")
        return
    if _server_thread is not None and not _server_thread.is_alive():
        logger.info("Modbus: старый поток завершён, очистка и новый запуск")
        _server_thread = None
    _server_start_error = None

    def run_server() -> None:
        global _server_running, _server_start_error  # noqa: PLW0603
        _server_running = True
        _server_start_error = None
        logger.info("Modbus: поток сервера стартовал, вызов start_modbus_tcp_server")
        try:
            start_modbus_tcp_server(config.modbus, core)
            logger.info("Modbus: start_modbus_tcp_server вернулся без исключения")
        except OSError as e:
            _server_start_error = f"Порт занят или недоступен: {e}"
            logger.exception("Modbus TCP server failed to bind")
        except Exception as e:  # noqa: BLE001
            _server_start_error = f"Ошибка запуска Modbus-сервера: {e!s}"
            logger.exception("Modbus TCP server crashed")
        finally:
            _server_running = False
            logger.info("Modbus: поток сервера завершён (error=%s)", _server_start_error)

    _server_thread = threading.Thread(target=run_server, daemon=True)
    _server_thread.start()
    logger.info("Modbus: поток создан и запущен (thread id=%s)", _server_thread.ident)


def _get_server_status() -> ServerStatus:
    running = _server_thread is not None and _server_thread.is_alive()
    return ServerStatus(
        running=bool(running),
        host=config.modbus.host,
        port=config.modbus.port,
        error=_server_start_error,
    )


# Опциональная авторизация по env (GUI_USER + GUI_PASSWORD)
_GUI_USER = os.environ.get("GUI_USER", "").strip()
_GUI_PASSWORD = os.environ.get("GUI_PASSWORD", "")
_AUTH_REQUIRED = bool(_GUI_USER and _GUI_PASSWORD)


class BasicAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _AUTH_REQUIRED or not request.url.path.startswith("/api") or request.url.path == "/api/auth/required":
            return await call_next(request)
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Basic "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Auth required"},
                headers={"WWW-Authenticate": "Basic realm=\"Modbus Simulator\""},
            )
        try:
            raw = base64.b64decode(auth[6:]).decode("utf-8")
            user, _, password = raw.partition(":")
            if user != _GUI_USER or password != _GUI_PASSWORD:
                return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
        except Exception:  # noqa: BLE001
            return JSONResponse(status_code=401, content={"detail": "Invalid auth header"})
        return await call_next(request)


app.add_middleware(BasicAuthMiddleware)
# CORS для доступа из браузерного SPA (dev/compose)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализируем API и гарантируем наличие профиля по умолчанию
state_api.init_state_api(core, storage)
# Создаём профиль 'default', если он ещё не существует.
storage.profiles.ensure_default_profile(core)
profiles_api.init_profiles_api(storage, config, core, signal_generators_engine)
generators_api.init_generators_api(storage, signal_generators_engine)
app.include_router(config_api.router, prefix="/api")
app.include_router(state_api.router, prefix="/api")
app.include_router(profiles_api.router, prefix="/api")
app.include_router(generators_api.router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/required")
def auth_required() -> dict[str, bool]:
    return {"required": _AUTH_REQUIRED}


@app.get("/api/server/status", response_model=ServerStatus)
def server_status() -> ServerStatus:
    return _get_server_status()


@app.get("/api/server/modbus_log")
def server_modbus_log(since: int = 0) -> dict:
    """События Modbus (запросы/ответы) для журнала GUI. Параметр since — последний известный id."""
    events, next_id = get_modbus_log_events(since)
    return {"events": events, "next_id": next_id}


@app.post("/api/server/start", response_model=ServerStatus)
def server_start() -> ServerStatus:
    logger.info("Modbus: POST /api/server/start — текущий поток: %s, is_alive=%s",
                _server_thread, _server_thread.is_alive() if _server_thread else None)
    if _server_thread is not None and not _server_thread.is_alive():
        logger.info("Modbus: ожидание 1 с перед перезапуском после остановки")
        time.sleep(1)
    _start_server_thread()
    status = _get_server_status()
    logger.info("Modbus: статус после start: running=%s, error=%s", status.running, status.error)
    return status


@app.post("/api/server/stop", response_model=ServerStatus)
def server_stop() -> ServerStatus:
    global _server_thread  # noqa: PLW0603
    logger.info("Modbus: POST /api/server/stop — поток: %s, is_alive=%s",
                _server_thread, _server_thread.is_alive() if _server_thread else None)
    if _server_thread is not None and _server_thread.is_alive():
        stop_modbus_tcp_server()
        _server_thread.join(timeout=5)
        if _server_thread is not None and not _server_thread.is_alive():
            _server_thread = None
            logger.info("Modbus: поток остановлен и очищен")
        else:
            logger.warning("Modbus: поток не завершился за 5 с")
    status = _get_server_status()
    logger.info("Modbus: статус после stop: running=%s", status.running)
    return status

