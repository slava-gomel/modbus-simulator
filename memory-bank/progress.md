## Progress

**Что уже работает:**
- FastAPI + Modbus TCP (pymodbus 3.6.x): функции 01/02/03/04/05/06 и 15/16 (множественная запись).
- HTTP API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch` (PUT), `/api/server/status`, `/api/server/start`, `/api/server/stop`.
- Файловое хранилище: `config.yaml`, `state.json` (автозагрузка и сохранение при записи).
- React SPA: конфигурация, регистры (одиночная и пакетная запись), блок «Modbus сервер» — отображение статуса (запущен/остановлен), кнопки Запустить/Остановить/Обновить статус.
- Docker Compose (backend, frontend, volume `sim_data`), локальный запуск тестов: `pip install -e .[dev]`, `pytest`.

**Что можно доработать:**
- Профили конфигурации (несколько YAML), расширенные тесты и e2e, при необходимости — простая авторизация для GUI.

