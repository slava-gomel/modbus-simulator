## Progress

**Реализовано:**
- Modbus TCP (pymodbus 3.6.x): 01–06, 15/16; запуск/остановка сервера через API; при ошибке «порт занят» — понятный ответ в API.
- API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch`, `/api/server/status`, `/api/server/start`, `/api/server/stop`, `/api/profiles` (GET/POST), `/api/profiles/{slug}/load`, `/api/profiles/{slug}/update`, DELETE профиля; **`/api/generators`** (GET/PUT) — список и сохранение конфигурации генераторов.
- Хранилище: `config.yaml`, `state.json`, каталог `profiles/` (YAML с полями config, state, **generators**); профиль `default` создаётся автоматически и защищён от удаления.
- **Генератор сигналов (backend):** модуль `signal_generators` (SignalGeneratorEngine, фоновый поток), `encoding_utils` (кодирование INT16/FLOAT32/FLOAT64 в регистры), интеграция в lifespan; генераторы сохраняются и загружаются вместе с профилем. Движок хранит все генераторы (включённые и выключенные), а run‑loop учитывает флаг `enabled`, что позволяет корректно round‑trip'ить конфигурации через профили и API генераторов.
- **Modbus‑лог (backend):** `modbus_log` хранит события Modbus; при FC05/06/15/16 в `modbus_server.InMemoryDataStore.setValues` добавляются записи типа `modbus_write` с полями `kind` (`coils`/`holding`), `start`, `count` для точной привязки изменений к диапазонам регистров.

- **GUI (после комплексного рефакторинга 2026-02-13):**
  - **Модульная архитектура:** feature-based структура с React Context API
  - **Модульная API** (`api/`): client, types, registers, generators, profiles, server (7 модулей вместо 1 файла)
  - **Shared UI компоненты** (`shared/components/`): Button, Input, RadioGroup, NumericField
  - **Разделённые типы** (`shared/types/`): registers, logs, generators
  - **Features:** auth, config, server, profiles, logs (с LogFilters/LogEntry), registers (с RegistersToolbar/RegistersFormatSelector/converters), generators (с GeneratorForm/GeneratorsList/WaveChart)
  - **Shared:** types (модульные), constants, hooks (usePolling, useCollapse, useApiCall)
  - **App.tsx:** ~140 строк (вместо 2714), композиция через AppProviders
  - **Converters:** логика конвертации форматов вынесена в отдельный модуль
  - **RegistersContext:** упрощён с 440 до ~280 строк
  - **RegistersPanel:** разделён на подкомпоненты, упрощён с 345 до ~120 строк
  - **LogView:** разделён на подкомпоненты, упрощён с 266 до ~100 строк
  
  - **Регистры (полный функционал):**
    - Таблица ADDRESS RANGE | +0..+7 для holding/input регистров
    - Битовая таблица для coils/discrete_inputs
    - Все форматы: INT16/32/64, FLOAT32/64, BITMAP
    - Редактирование holding с валидацией на blur
    - Зелёная вспышка при Modbus-записях (на input внутри ячейки)
    - Неоновая подсветка регистров от генераторов
  
  - **Генераторы (полный функционал):**
    - Форма создания/редактирования со всеми параметрами
    - Таблица: Имя, Тип, Формат, Адрес, График, Значение, Период, Статус, Действия
    - Живые SVG-графики сигналов в реальном времени
    - Неоновая подсветка активных значений
    - Автообновление значений (~120 мс для графиков)
  
  - **UI:**
    - Сворачиваемые панели: Настройки, Регистры, Генераторы, Журнал
    - Генераторы на полную ширину (как регистры)
    - Журнал событий с фильтрами (Modbus/сервер/генераторы/профили/ошибки)
    - Тёмный dashboard-стиль
    - Оптимизация: React.memo, useMemo, useCallback

- **Backend (после комплексного рефакторинга 2026-02-13):**
  - **Модульная Storage система** (`app/storage/`): 
    - BaseStorage, ConfigStorage, StateStorage, ProfilesStorage
    - Storage фасад для композиции модулей
    - Разделение ответственности по Single Responsibility Principle
    - Старый монолитный `storage.py` (267 строк) → 5 модулей
  - **Обновлённые API endpoints:** используют новую модульную структуру storage

- **Документация (новая, 2026-02-13):**
  - **ARCHITECTURE.md** (287 строк): полная архитектура проекта, компоненты, data flow, deployment
  - **CONTRIBUTING.md** (420 строк): руководство для разработчиков, code style, git workflow, testing
  - **docs/API.md** (400+ строк): REST API документация со всеми endpoints и примерами
  - **README.md**: обновлён со ссылками на новую документацию, структурированное содержание

- Авторизация: опциональная Basic Auth по env.

- **Тесты (2026-02-13, 164+ теста):**
  - **Backend (94 теста):**
    - API: health, state, batch, server, profiles, generators (13 тестов)
    - `test_encoding_utils.py` – INT16/FLOAT32/FLOAT64 конвертация (22 теста)
    - **`test_modbus_core.py` – unit тесты всех Modbus функций (41 тест)**
      - RegisterBlock, FC01-FC06, FC15-FC16, integration scenarios
    - **`test_modbus_integration.py` – InMemoryDataStore adapter (18 тестов)**
      - Все function codes через datastore, комплексные сценарии
    - Производительность: 94 теста за ~0.8s
  - **Frontend (70+ тестов):**
    - `converters.test.ts` – все форматы INT16/32/64, FLOAT32/64, BITMAP (60+ тестов)
    - `usePolling.test.ts`, `useCollapse.test.ts` – hooks (12 тестов)
    - Vitest + jsdom, производительность: ~1-2s
  - **Документация:** `.cursorrules`, TESTING.md, DOCKER_REBUILD.md, README_MODBUS_TESTS.md

**Статистика:**
- Рефакторинг: 40 файлов изменено (+3015/-1020 строк)
- Тесты: 164+ теста, 100% покрытие Modbus функций
- Frontend: модульная структура, shared UI компоненты
- Backend: модульная storage, полное покрытие Modbus
- Документация: 5+ файлов (2000+ строк)
- TypeScript: ✅ компиляция успешна
- Python: ✅ синтаксис корректен

**В планах (по желанию):** CI (GitHub Actions), e2e‑тесты, WebSocket для real-time, E2E Modbus с TCP клиентом.

