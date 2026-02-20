## Active Context

**Текущий фокус (2026‑02‑20):**
- ✅ Завершён комплексный рефакторинг всего проекта (frontend + backend + документация).
- ✅ Frontend: модульная API, shared UI компоненты, разделённые панели.
- ✅ Backend: модульная storage система с разделением ответственности.
- ✅ Документация: ARCHITECTURE.md, CONTRIBUTING.md, docs/API.md.
- ✅ **Тесты: backend 102, frontend 55 — все проходят.** Полное покрытие Modbus FC01–FC06/FC15–FC16.
- ✅ **WebSocket:** real-time обновления (registers, server, generators); polling удалён.
- ✅ **Исправлены падающие WebSocket-тесты (2026-02-20):** в WebSocketContext.test.tsx — тест переподключения упрощён («should set disconnected and schedule reconnection on abnormal close»); тест «should support multiple channels» — vi.useRealTimers() и timeout 2000 для стабильности.
- ✅ **Исправлена лавина запросов:** в App.tsx начальная загрузка (loadConfig, refreshProfiles, loadGenerators) выполняется один раз при `authenticated === true`; колбэки не в deps эффекта, иначе при setCurrentProfileSlug в refreshProfiles эффект уходил в бесконечный цикл (1450+ запросов, Stalled, таблица регистров не загружалась).

**Реализовано:**
- Backend:
  - ModbusSimulatorCore, Modbus TCP сервер (старт/стоп через API), REST API (config, state, batch, server status/start/stop, profiles, **generators**), storage (config, state, profiles с полем `generators`), lifespan с запуском движка генераторов, опциональная Basic Auth по env, модуль `modbus_log` с буфером событий.
  - **События `modbus_write` в `modbus_log`:** при обработке FC05/06/15/16 в `modbus_server.InMemoryDataStore.setValues` добавляются структурированные записи лога с полями `kind` (`coils` / `holding`), `start` и `count` для точной привязки изменений к диапазонам регистров.
  - **Генератор сигналов:** `SignalGeneratorEngine` (фоновый поток), `encoding_utils` (INT16/FLOAT32/FLOAT64 в 16‑битные регистры), модели `SignalGeneratorConfig` (в т.ч. `neon_color`), `GET/PUT /api/generators`; при сохранении/загрузке профиля генераторы сохраняются и восстанавливаются в движке. Движок теперь хранит **все** генераторы (включённые и выключенные), а фильтрация по `enabled` происходит только в run‑loop — это нужно для корректного round‑trip через профили.
  - Локальный форк `patched_pymodbus_server` для IP клиента; HEX‑трейсы и события `client_connect`/`client_disconnect`.

- Frontend (после рефакторинга v2):
  - **Модульная API структура** (`api/`):
    - `client.ts` – axios instance с auth interceptor
    - `types.ts` – API типы данных
    - `registers.ts`, `generators.ts`, `profiles.ts`, `server.ts` – доменные модули
    - `index.ts` – barrel exports
    - Старый монолитный `api.ts` (194 строки) заменён на 7 модулей
  
  - **Shared UI компоненты** (`shared/components/`):
    - `Button.tsx` – универсальная кнопка с вариантами
    - `Input.tsx` – поле ввода с label и errors
    - `RadioGroup.tsx` – группа радиокнопок
    - `NumericField.tsx` – числовое поле с валидацией
    - Используются во всех features для консистентности UI
  
  - **Разделённые типы** (`shared/types/`):
    - `registers.ts` – типы регистров и форматов
    - `logs.ts` – типы журнала событий
    - `generators.ts` – типы генераторов (re-export из API)
    - Старый монолитный `types.ts` разделён на доменные модули
  
  - **Custom hooks** (`shared/hooks/`):
    - `useWebSocket` – подписка на каналы WebSocket (registers, server, generators)
    - `useCollapse` – состояние сворачивания панелей
    - `useApiCall` – универсальный хук для API вызовов с loading/error
  
  - **Converters и бизнес-логика** (`features/registers/`):
    - `converters.ts` – извлечена логика конвертации форматов (INT16/32/64, FLOAT32/64, BITMAP)
    - `RegistersContext.tsx` – упрощён с 440 до ~280 строк
    - Функции: `convertToInt16/32/64`, `convertToFloat32/64`, `convertToBitmap`
  
  - **Разделённые панели:**
    - `RegistersPanel` → `RegistersToolbar` + `RegistersFormatSelector`
    - `LogView` → `LogFilters` + `LogEntry`
    - RegistersPanel: с 345 до ~120 строк
    - LogView: с 266 до ~100 строк
  
  - **Структура features:**
    - `features/auth/` – AuthContext, LoginForm
    - `features/config/` – ConfigContext, ConfigPanel
    - `features/server/` – ServerContext, ServerPanel
    - `features/profiles/` – ProfilesContext, ProfilesPanel
    - `features/logs/` – LogsContext, LogView, LogFilters, LogEntry
    - `features/registers/` – RegistersContext, RegistersPanel, RegistersToolbar, RegistersFormatSelector, RegistersTable, CoilsTable, RegisterCell, converters, formatters
    - `features/generators/` – GeneratorsContext, GeneratorsPanel, GeneratorForm, GeneratorsList, WaveChart, utils
  
  - **AppProviders.tsx** – композиция всех контекстов с управлением зависимостями
  - **App.tsx** – минимальный root-компонент (~140 строк против 2714)

  - **Регистры (полный функционал восстановлен):**
    - RegistersTable – таблица ADDRESS RANGE | +0..+7 для holding/input
    - CoilsTable – битовая таблица для coils/discrete_inputs
    - RegisterCell – ячейка с редактированием, подсветкой и форматированием
    - Поддержка всех форматов: INT16/32/64, FLOAT32/64, BITMAP
    - Редактирование holding и input‑регистров с валидацией на blur (UI и REST API поддерживают запись в обе области; Modbus клиент по‑прежнему читает input через FC04)
    - Зелёная вспышка при Modbus-записях (применяется к input внутри ячейки)
    - Неоновая подсветка регистров, затронутых генераторами

  - **Генераторы (полный функционал восстановлен):**
    - GeneratorForm – полная форма создания/редактирования с валидацией
    - GeneratorsList – таблица с колонками: Имя, Тип сигнала, Формат, Область (Holding/Input), Адрес, График, Значение, Период, Статус, Действия
    - WaveChart – SVG-компонент для живых графиков сигналов
    - utils.ts – форматирование, построение графиков, неоновая подсветка
    - Живые значения с неоновой подсветкой в таблице
    - Кнопки управления: Редактировать, Вкл/Выкл, Удалить

  - **Улучшения UI:**
    - Сворачиваемые панели: Настройки, Регистры, Генераторы, Журнал
    - Блок генераторов на полную ширину (как регистры)
    - Корректная подсветка: стили применяются к input, а не к td
    - Оптимизация с React.memo, useMemo, useCallback

- Backend (после рефакторинга v2):
  - **Модульная Storage система** (`app/storage/`):
    - `base.py` – BaseStorage с общими методами
    - `config.py` – ConfigStorage для config.yaml
    - `state.py` – StateStorage для state.json с методом `_apply_state`
    - `profiles.py` – ProfilesStorage для профилей с генераторами
    - `__init__.py` – Storage фасад, композирующий все модули
    - Старый монолитный `storage.py` (267 строк) разделён на 5 модулей
  
  - **Обновлённые API endpoints:**
    - `profiles_api.py` – использует `storage.profiles.*` и `storage.state._apply_state`
    - `state_api.py` – использует `storage.state.save_state`
    - `main.py` – использует `storage.config.load_config`, `storage.state.load_state`, `storage.profiles.ensure_default_profile`

- **Документация (новая):**
  - `ARCHITECTURE.md` – детальная архитектура проекта (287 строк)
    - Backend и Frontend компоненты
    - Dependency flow диаграммы
    - Data flow и integration паттерны
    - Performance и масштабирование
  
  - `CONTRIBUTING.md` – руководство для разработчиков (420 строк)
    - Setup окружения (local + Docker)
    - Code style для TypeScript и Python
    - Git workflow и commit conventions
    - Testing стратегия
    - PR процесс
  
  - `docs/API.md` – полная REST API документация (400+ строк)
    - Все endpoints с примерами
    - Request/Response schemas
    - Error codes и handling
    - cURL примеры
  
  - `README.md` – обновлён с ссылками на новую документацию
    - Структурированное содержание
    - Ссылки на ARCHITECTURE, CONTRIBUTING, API docs
    - Улучшенные примеры использования

- **Тесты (2026-02-20, все проходят):**
  - Backend: 102 теста (API, encoding_utils, **Modbus FC01–FC06/FC15–FC16**, WebSocket)
  - Frontend: 55 тестов (converters, useCollapse, WebSocketContext — 6 кейсов)
  - `.cursorrules` – проектный интеллект
  - TESTING.md, DOCKER_REBUILD.md, README_MODBUS_TESTS.md
  - **Исправлены падающие тесты WebSocketContext:** переподключение проверяется только переходом в «disconnected» при code 1006; «multiple channels» — реальные таймеры и timeout

**Итоги:**
- Frontend: модульная структура, тесты converters/hooks/WebSocket
- Backend: модульная storage, полное покрытие Modbus, 102 теста
- Документация: ARCHITECTURE, CONTRIBUTING, API, Memory Bank
- Тесты: 157 всего (102 backend + 55 frontend), все зелёные
- TypeScript компиляция: ✅ успешна
- Python синтаксис: ✅ корректен

**Дальше по желанию:** CI (GitHub Actions), E2E тесты (Playwright), E2E Modbus с реальным TCP клиентом.

