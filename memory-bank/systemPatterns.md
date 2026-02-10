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
 - WEB‑GUI организован как тёмный «дешборд»:
   - общий layout: панели сервера/конфигурации/профилей, регистры по центру на всю ширину, журнал снизу;
   - регистры отображаются таблицей диапазонов (`baseAddr…baseAddr+9`, колонки `+0…+9`), что повторяет UX классических Modbus‑симуляторов;
   - переиспользуемые CSS‑классы (`panel`, `field-*`, `btn`, `registers-table*`, `log-*`) вместо inline‑стилей.

