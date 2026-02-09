## Tech Context

**Языки и платформы:**
- Python 3.10+ для backend.
- TypeScript + React 18 для frontend.

**Backend:**
- FastAPI – HTTP API и lifecycle-обработчики.
- uvicorn – ASGI-сервер.
- pymodbus – реализация Modbus TCP сервера.
- pydantic v2 – валидация и схемы DTO.
- pytest, httpx, ruff – тесты и статический анализ.

**Frontend:**
- Vite – сборка и dev-server.
- React 18 + ReactDOM.
- axios – HTTP-клиент.
- Nginx – отдача статики и reverse proxy `/api` -> backend.

**Инфраструктура:**
- Dockerfile для backend (python:3.12-slim).
- Dockerfile для frontend (node:20-alpine + nginx:1.27-alpine).
- docker-compose:
  - Сеть между `backend` и `frontend`.
  - Volume `sim_data` для `/data` backend-а (config/state).

