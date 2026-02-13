# Changelog

Все значимые изменения в проекте документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено
- WebSocket Real-time Communication (заменил HTTP polling)
  - Раздельные каналы: `/ws/registers`, `/ws/server`, `/ws/generators`
  - Автоматическое переподключение с exponential backoff
  - Keep-alive ping/pong механизм
  - UI индикатор статуса соединений
  - Batch обновления регистров от генераторов
- Документация PERFORMANCE.md - руководство по оптимизации
- Документация WEBSOCKET.md - полное описание WebSocket API
- WebSocket тесты: backend (5 тестов) + frontend (6 тестов)

### Изменено
- **Backend:** Оптимизация генераторов сигналов
  - Цикл проверки: 50ms → 20ms (более быстрые обновления)
  - Batch broadcast: все изменения за цикл группируются в одно событие
  - Последовательные регистры объединяются для эффективности
  - Broadcast интервал: 120ms → 100ms (синхронно с генераторами)
- **Frontend:** Миграция с polling на WebSocket
  - RegistersContext: локальное обновление из WebSocket событий
  - GeneratorsContext: real-time обновления значений и графиков
  - ServerContext: мгновенные обновления статуса и логов
  - Удалён usePolling hook и все polling константы
- **Тесты:** Исправлены все integration тесты
  - TestClient теперь использует context manager для правильного lifecycle
  - Все тесты используют fixture вместо глобального client
  - 99 backend тестов ✅, 76+ frontend тестов ✅

### Удалено
- HTTP polling endpoints для Modbus log
- usePolling hook и связанные константы (POLL_MS)
- Глобальные TestClient instances в тестах

### Исправлено
- Частота обновлений регистров теперь равна частоте генераторов (~100ms)
- TestClient lifecycle в тестах (lifespan теперь корректно запускается)
- Конфликты между тестами из-за shared state
- **WebSocket стабильность:**
  - Nginx proxy для `/ws/` endpoints (код 101 Switching Protocols)
  - Увеличены timeouts до 7 дней, отключена буферизация
  - Исправлен двойной `websocket.accept()` в endpoints
  - Ограничение переподключений (макс 10 попыток)
  - Уменьшенное логирование (первые 3 ошибки)
  - React.StrictMode отключен
  - useWebSocket hook стабилизирован через useRef pattern

---

## [0.1.0] - 2026-02-13

### Добавлено
- Начальная реализация Modbus TCP Simulator
- Web GUI на React + TypeScript
- FastAPI backend с REST API
- SignalGeneratorEngine для динамической генерации сигналов
- Поддержка форматов: INT16, INT32, INT64, FLOAT32, FLOAT64, BITMAP
- Профили для сохранения/загрузки состояния
- Modbus Log с подсветкой записей
- Docker Compose для deployment
- Комплексная документация: ARCHITECTURE.md, CONTRIBUTING.md, API.md
- 170+ тестов (backend + frontend)

[Unreleased]: https://github.com/yourusername/modbud_simulator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/modbud_simulator/releases/tag/v0.1.0
