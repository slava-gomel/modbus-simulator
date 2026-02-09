## modbud_simulator – Modbus TCP Simulator с WEB GUI

Этот проект реализует симулятор Modbus TCP slave-устройства с WEB-интерфейсом для конфигурирования и наблюдения за регистрами.

### Основные особенности

- Python backend на FastAPI:
  - Modbus TCP slave (через `pymodbus` или совместимый стек).
  - API для управления конфигурацией и состоянием регистров.
- WEB GUI как SPA (React + TypeScript):
  - Просмотр и редактирование регистров (coils, discrete inputs, holding, input registers).
  - Управление профилями конфигурации.
- Docker Compose:
  - Отдельные сервисы `backend` и `frontend`.
  - Volume для хранения конфигурации и состояния.

### Структура проекта (планируемая)

- `backend/` – Python-приложение (FastAPI, Modbus-ядро, storage, API).
- `frontend/` – SPA на React + TypeScript.
- `memory-bank/` – документация по правилам Cursor (projectbrief, productContext и др.).
- `docker-compose.yml` – оркестрация сервисов.

### Запуск через Docker Compose

```bash
docker compose up --build
```

- Backend:
  - HTTP API: `http://localhost:8000/api/...`
  - Health-check: `http://localhost:8000/health`
  - Modbus TCP: `localhost:1502`
- WEB GUI:
  - `http://localhost:8080`

### Локальная разработка backend

```bash
cd backend
pip install -e .[dev]
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Локальная разработка фронтенда

```bash
cd frontend
npm install
npm run dev
```

Фронтенд будет доступен по адресу `http://localhost:5173` и будет проксировать `/api` на `http://localhost:8000`.

