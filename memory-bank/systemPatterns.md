## System Patterns

**Архитектура:**
- Backend: FastAPI + Modbus TCP (pymodbus) + файловый storage.
- Frontend: SPA на React + TypeScript (Vite) поверх REST API.
- Оркестрация: docker-compose с отдельными сервисами `backend` и `frontend` (nginx).

**Ключевые паттерны:**
- Чёткое разделение:
  - `ModbusSimulatorCore` – чистое доменное ядро без привязки к сетевому слою.
  - `modbus_server` – адаптер между `pymodbus` и ядром.
  - `api/*` – HTTP API поверх ядра (REST).
  - `storage` – изолированный слой работы с файловым хранилищем (config/state).
- Идиоматичный REST:
  - `/api/config` – конфигурация.
  - `/api/state/{kind}` – работа с регистрами.
- SPA работает только через HTTP API, без прямого доступа к Modbus TCP.

