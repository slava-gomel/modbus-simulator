## Project Brief: modbud_simulator

Этот репозиторий предназначен для разработки симулятора Modbus (Modbus Simulator).

**Цели:**
- Создать репозиторий с корректной инициализацией Git и GitHub.
- Вести документацию в `memory-bank` согласно правилам Cursor.

**Текущее состояние (2026-02-09, Europe/Minsk):**
- Реализованы backend (FastAPI + Modbus TCP через pymodbus) и WEB GUI (React + Vite).
- Поддержка Modbus 01–06 и множественной записи 15/16; REST API для конфигурации, состояния регистров и управления сервером (запуск/остановка, статус).
- Docker Compose, файловый storage (config/state), базовые тесты и локальный запуск тестов (`pip install -e .[dev]`, `pytest`).

