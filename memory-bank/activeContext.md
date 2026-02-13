## Active Context

**Текущий фокус (2026‑02‑13):**
- Завершён масштабный рефакторинг frontend: модульная архитектура с feature-based структурой.
- Восстановлен полный функционал UI регистров и генераторов после рефакторинга.

**Реализовано:**
- Backend:
  - ModbusSimulatorCore, Modbus TCP сервер (старт/стоп через API), REST API (config, state, batch, server status/start/stop, profiles, **generators**), storage (config, state, profiles с полем `generators`), lifespan с запуском движка генераторов, опциональная Basic Auth по env, модуль `modbus_log` с буфером событий.
  - **События `modbus_write` в `modbus_log`:** при обработке FC05/06/15/16 в `modbus_server.InMemoryDataStore.setValues` добавляются структурированные записи лога с полями `kind` (`coils` / `holding`), `start` и `count` для точной привязки изменений к диапазонам регистров.
  - **Генератор сигналов:** `SignalGeneratorEngine` (фоновый поток), `encoding_utils` (INT16/FLOAT32/FLOAT64 в 16‑битные регистры), модели `SignalGeneratorConfig` (в т.ч. `neon_color`), `GET/PUT /api/generators`; при сохранении/загрузке профиля генераторы сохраняются и восстанавливаются в движке. Движок теперь хранит **все** генераторы (включённые и выключенные), а фильтрация по `enabled` происходит только в run‑loop — это нужно для корректного round‑trip через профили.
  - Локальный форк `patched_pymodbus_server` для IP клиента; HEX‑трейсы и события `client_connect`/`client_disconnect`.

- Frontend (после рефакторинга):
  - **Новая архитектура:** feature-based модульная структура с React Context API для управления состоянием.
  - **Структура features:**
    - `features/auth/` – AuthContext, LoginForm
    - `features/config/` – ConfigContext, ConfigPanel
    - `features/server/` – ServerContext, ServerPanel
    - `features/profiles/` – ProfilesContext, ProfilesPanel
    - `features/logs/` – LogsContext, LogView
    - `features/registers/` – RegistersContext, RegistersPanel, RegistersTable, CoilsTable, RegisterCell, formatters
    - `features/generators/` – GeneratorsContext, GeneratorsPanel, GeneratorForm, GeneratorsList, WaveChart, utils
  - **Shared модули:**
    - `shared/types.ts` – общие типы (RegisterKind, RegisterFormatKind, etc.)
    - `shared/constants.ts` – константы приложения
    - `shared/hooks/` – usePolling, useCollapse
  - **AppProviders.tsx** – композиция всех контекстов с управлением зависимостями
  - **App.tsx** – минимальный root-компонент (~140 строк против 2714)

  - **Регистры (полный функционал восстановлен):**
    - RegistersTable – таблица ADDRESS RANGE | +0..+7 для holding/input
    - CoilsTable – битовая таблица для coils/discrete_inputs
    - RegisterCell – ячейка с редактированием, подсветкой и форматированием
    - Поддержка всех форматов: INT16/32/64, FLOAT32/64, BITMAP
    - Редактирование holding-регистров с валидацией на blur
    - Зелёная вспышка при Modbus-записях (применяется к input внутри ячейки)
    - Неоновая подсветка регистров, затронутых генераторами

  - **Генераторы (полный функционал восстановлен):**
    - GeneratorForm – полная форма создания/редактирования с валидацией
    - GeneratorsList – таблица с колонками: Имя, Тип, Формат, Адрес, График, Значение, Период, Статус, Действия
    - WaveChart – SVG-компонент для живых графиков сигналов
    - utils.ts – форматирование, построение графиков, неоновая подсветка
    - Живые значения с неоновой подсветкой в таблице
    - Кнопки управления: Редактировать, Вкл/Выкл, Удалить

  - **Улучшения UI:**
    - Сворачиваемые панели: Настройки, Регистры, Генераторы, Журнал
    - Блок генераторов на полную ширину (как регистры)
    - Корректная подсветка: стили применяются к input, а не к td
    - Оптимизация с React.memo, useMemo, useCallback

- Тесты: health, state, batch, server, profiles, **generators API**, round‑trip генераторов через профили.

**Дальше по желанию:** CI (GitHub Actions), e2e‑тесты, доработка UX.

