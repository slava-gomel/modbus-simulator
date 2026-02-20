## Tech Context

**Языки и платформы:**
- Python 3.10+ для backend.
- TypeScript + React 18 для frontend.

**Backend:**
- FastAPI – HTTP API и lifecycle-обработчики (lifespan с запуском SignalGeneratorEngine).
- uvicorn – ASGI-сервер.
- pymodbus – реализация Modbus TCP сервера.
- pydantic v2 – валидация и схемы DTO (в т.ч. SignalGeneratorConfig с neon_color).
- Модули: `signal_generators` (движок генераторов), `encoding_utils` (INT16/FLOAT32/FLOAT64 в регистры).
- pytest, httpx, ruff – тесты и статический анализ.

**Frontend:**
- Vite – сборка и dev-server.
- React 18 + ReactDOM.
- axios – HTTP-клиент.
- **@heroicons/react** – SVG иконки (20/solid).
- **sonner** – toast-уведомления.
- WebSocket API – real-time коммуникация (нативный браузерный API).
- Nginx – отдача статики и reverse proxy `/api` + `/ws` -> backend.

**Инфраструктура:**
- Dockerfile для backend (python:3.12-slim).
- Dockerfile для frontend (node:20-alpine + nginx:1.27-alpine).
- docker-compose:
  - Сеть между `backend` и `frontend`.
  - Volume `sim_data` для `/data` backend-а (config/state).
