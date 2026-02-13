## System Patterns

**Архитектура:**
- Backend: FastAPI + Modbus TCP (pymodbus) + файловый storage.
- Frontend: SPA на React + TypeScript (Vite) с модульной feature-based архитектурой + React Context API.
- Оркестрация: docker-compose с отдельными сервисами `backend` и `frontend` (nginx).

**Ключевые паттерны Backend:**
- Чёткое разделение:
  - `ModbusSimulatorCore` – чистое доменное ядро без привязки к сетевому слою.
  - `modbus_server` – адаптер между `pymodbus` и ядром.
  - `api/*` – HTTP API поверх ядра (REST).
  - **`storage/` – модульная система хранения:**
    - `base.py` – BaseStorage с общими методами
    - `config.py` – ConfigStorage для config.yaml
    - `state.py` – StateStorage для state.json с методом `_apply_state`
    - `profiles.py` – ProfilesStorage для профилей с генераторами
    - `__init__.py` – Storage фасад (композиция ConfigStorage + StateStorage + ProfilesStorage)
    - **Single Responsibility Principle**: каждый класс отвечает за свою область данных
- Идиоматичный REST:
  - `/api/config` – конфигурация.
  - `/api/state/{kind}` – работа с регистрами.
  - `/api/generators` – конфигурация генераторов сигналов (привязана к профилям при save/load).
  - `/api/profiles/{slug}/update` – обновление существующего профиля из текущей конфигурации, состояния регистров и набора генераторов.
- `/api/server/modbus_log` – отдаёт кольцевой буфер событий Modbus (`ModbusLogEntry`) с поддержкой поля `since` и типом `modbus_write` для записей FC05/06/15/16, содержащих `kind` (`coils`/`holding`), `start`, `count`.
- Фоновый движок генераторов: `SignalGeneratorEngine` в отдельном потоке обновляет holding‑регистры по таймеру; конфигурация задаётся через API и восстанавливается из профиля при load. Движок хранит полный список генераторов и в run‑loop учитывает только включённые (`enabled`), чтобы профили и `/api/generators` всегда работали с полной конфигурацией.

**Паттерны Frontend (после комплексного рефакторинга v2 + WebSocket v3):**
- **Feature-based модульная архитектура:**
  - Каждая feature изолирована в своей папке: Context (state + logic) + UI компоненты
  - `features/auth/`, `features/config/`, `features/server/`, `features/profiles/`, `features/logs/`, `features/registers/`, `features/generators/`, `features/websocket/`
  
- **Модульная API структура** (`api/`):
  - `client.ts` – axios instance с auth interceptor (обработка 401)
  - `types.ts` – все API типы данных (Response/Request DTO)
  - Доменные модули:
    - `registers.ts` – fetchRegisters, writeSingle, writeBatch
    - `generators.ts` – fetchSignalGenerators, saveSignalGenerators
    - `profiles.ts` – listProfiles, saveProfile, loadProfile, deleteProfile, updateProfile
    - `server.ts` – fetchConfig, updateConfig, fetchServerStatus, startServer, stopServer, fetchModbusLog, authRequired
  - `index.ts` – barrel exports для удобного импорта
  - **Преимущества:** чёткое разделение по доменам, легко тестировать, удобно расширять
  
- **Shared UI компоненты** (`shared/components/`):
  - `Button.tsx` – универсальная кнопка (variant: default/ghost/outline/danger, size: sm/md)
  - `Input.tsx` – поле ввода с label, error, readOnly поддержкой
  - `RadioGroup.tsx` – группа радиокнопок с массивом options
  - `NumericField.tsx` – числовое поле с валидацией на blur (min/max/defaultValue)
  - `index.ts` – barrel export
  - **Используются везде для консистентности UI**
  
- **React Context API для state management:**
  - Каждая feature имеет свой Context Provider
  - AppProviders.tsx композирует все контексты с управлением зависимостями
  - Inter-context communication через prop-based callbacks
  - **Порядок providers важен:** RegistersProvider должен быть выше ServerProviderWrapper для передачи `markRegistersChanged`
  
- **Shared модули:**
  - **`shared/types/`** – модульная структура типов:
    - `registers.ts` – RegisterKind, RegisterFormatKind, RegisterSign, RegisterOrder
    - `logs.ts` – AppLogEntry, LogFilterKey
    - `generators.ts` – re-export из API types
    - `index.ts` – barrel exports
  - `shared/constants.ts` – константы (polling intervals, colors, limits)
  - **`shared/hooks/`** – переиспользуемые хуки:
    - `useWebSocket` – подписка на каналы WebSocket (registers, server, generators)
    - `useCollapse` – состояние сворачивания панелей
    - `useApiCall` – универсальный хук для API с loading/error/data состоянием
  
- **Converters и бизнес-логика** (`features/registers/converters.ts`):
  - Вся логика конвертации форматов вынесена из Context
  - Функции: `convertToInt16`, `convertToInt32`, `convertToInt64`, `convertToFloat32`, `convertToFloat64`, `convertToBitmap`
  - Валидация: `isEmptyInput`, `normalizeNumericString`
  - Результат: `ConversionResult { registers: number[], error?: string }`
  - **RegistersContext упрощён с 440 до ~280 строк**
  
- **Разделённые панели:**
  - **RegistersPanel** (с 345 до ~120 строк):
    - `RegistersToolbar.tsx` – тип, start, count, кнопки управления
    - `RegistersFormatSelector.tsx` – выбор формата/знака/порядка с RadioGroup
  - **LogView** (с 266 до ~100 строк):
    - `LogFilters.tsx` – фильтры, search, IP, кнопки Export/Clear
    - `LogEntry.tsx` – одна запись лога (время + сообщение)
  - **Преимущества:** читаемость, тестируемость, переиспользование
- **Компонентная композиция:**
  - Крупные панели разбиты на под-компоненты (RegistersTable, CoilsTable, RegisterCell)
  - Каждый компонент обёрнут в React.memo для оптимизации
  - useMemo/useCallback для предотвращения лишних рендеров
- **App.tsx как тонкий orchestration layer:**
  - ~140 строк (вместо 2714)
  - Только композиция UI, без бизнес-логики
  - Вся логика вынесена в Context-провайдеры
  - **Начальная загрузка:** эффект при `authenticated` вызывает loadConfig/refreshProfiles/loadGenerators один раз; в deps только `[authenticated]` — колбэки не добавлять, иначе при пересоздании refreshProfiles (напр. после setCurrentProfileSlug) возникает бесконечный цикл запросов и таблица регистров не загружается

- **WebSocket Real-time Communication (новое v3):**
  - **Замена HTTP polling** - мгновенные обновления вместо периодических запросов
  - **WebSocketContext** с автоматическим переподключением (exponential backoff)
  - **Раздельные каналы:** `/ws/registers`, `/ws/server`, `/ws/generators`
  - **useWebSocket hook** для удобной подписки на события
  - **ConnectionStatus UI** - индикатор состояния соединений (показывается только при проблемах)
  - **Broadcast из threading:** через `asyncio.run_coroutine_threadsafe()` для интеграции с существующими модулями
  
- **UI организация (тёмный дешборд):**
  - Общий layout: верхний блок «Настройки» (Modbus-сервер, конфигурация, профили), ниже — «Регистры» и «Генераторы» на всю ширину, внизу — журнал
  - Все ключевые панели сворачиваемые
  - Регистры: таблица диапазонов с неоновой подсветкой от генераторов и зелёной вспышкой от Modbus-записей (применяется к input, не к td)
  - Переиспользуемые CSS-классы (`panel`, `field-*`, `btn`, `registers-table*`, `log-*`, `generator-value-display`)
  - ConnectionStatus banner при разрыве WebSocket соединения

- SPA работает через REST API и WebSocket, без прямого доступа к Modbus TCP.

