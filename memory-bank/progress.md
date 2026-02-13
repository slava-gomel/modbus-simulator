## Progress

**Реализовано:**
- Modbus TCP (pymodbus 3.6.x): 01–06, 15/16; запуск/остановка сервера через API; при ошибке «порт занят» — понятный ответ в API.
- API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch`, `/api/server/status`, `/api/server/start`, `/api/server/stop`, `/api/profiles` (GET/POST), `/api/profiles/{slug}/load`, `/api/profiles/{slug}/update`, DELETE профиля; **`/api/generators`** (GET/PUT) — список и сохранение конфигурации генераторов.
- Хранилище: `config.yaml`, `state.json`, каталог `profiles/` (YAML с полями config, state, **generators**); профиль `default` создаётся автоматически и защищён от удаления.
- **Генератор сигналов (backend):** модуль `signal_generators` (SignalGeneratorEngine, фоновый поток), `encoding_utils` (кодирование INT16/FLOAT32/FLOAT64 в регистры), интеграция в lifespan; генераторы сохраняются и загружаются вместе с профилем. Движок хранит все генераторы (включённые и выключенные), а run‑loop учитывает флаг `enabled`, что позволяет корректно round‑trip'ить конфигурации через профили и API генераторов.
- **Modbus‑лог (backend):** `modbus_log` хранит события Modbus; при FC05/06/15/16 в `modbus_server.InMemoryDataStore.setValues` добавляются записи типа `modbus_write` с полями `kind` (`coils`/`holding`), `start`, `count` для точной привязки изменений к диапазонам регистров.

- **GUI (после рефакторинга 2026-02-13):**
  - **Модульная архитектура:** feature-based структура с React Context API
  - **Features:** auth, config, server, profiles, logs, registers (с RegistersTable/CoilsTable/RegisterCell), generators (с GeneratorForm/GeneratorsList/WaveChart)
  - **Shared:** types, constants, hooks (usePolling, useCollapse)
  - **App.tsx:** ~140 строк (вместо 2714), композиция через AppProviders
  
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

- Авторизация: опциональная Basic Auth по env.
- Тесты: health, state, batch, server, profiles, **generators API**, round‑trip генераторов через профили; `pytest` с временным DATA_DIR.
- README: запуск, порты, профили, пресеты, **генератор сигналов**, тесты.
- **REFACTORING.md:** документация процесса рефакторинга, новой архитектуры и улучшений.

**В планах (по желанию):** CI (GitHub Actions), e2e‑тесты.

