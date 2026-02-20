## Project Brief: modbud_simulator

Этот репозиторий предназначен для разработки симулятора Modbus (Modbus Simulator).

**Цели:**
- Создать репозиторий с корректной инициализацией Git и GitHub.
- Вести документацию в `memory-bank` согласно правилам Cursor.

**Текущее состояние (2026-02-20, Europe/Minsk):**
- Реализованы backend (FastAPI + Modbus TCP через pymodbus) и WEB GUI (React + Vite).
- Поддержка Modbus 01–06 и множественной записи 15/16; REST API для конфигурации, состояния регистров и управления сервером.
- **WebSocket Real-time:** мгновенные обновления через WebSocket; раздельные каналы для registers/server/generators; автоматическое переподключение.
- **Генератор сигналов:** фоновое обновление holding‑регистров по заданному сигналу (синус, пила, меандр, константа) в форматах INT16/FLOAT32/FLOAT64; конфигурация привязана к профилям; живые данные через WebSocket; неоновая подсветка.
- **GUI Improvements v4 (2026-02-20):** toast-уведомления (Sonner), иконки (Heroicons), ToggleSwitch, ConfirmDialog, Skeleton-loading, keyboard shortcuts, цветные badge-и логов, auto-scroll, responsive layout, пагинация логов, 2-колоночная форма генераторов, глобальный статус сервера в шапке.
- Docker Compose, файловый storage (config/state, profiles с полем generators).
- **Тесты (157 тестов, все проходят):**
  - Backend: 102 теста (API, encoding_utils, Modbus FC01–FC06/FC15–FC16, WebSocket)
  - Frontend: 55 тестов (converters, hooks, WebSocketContext)
