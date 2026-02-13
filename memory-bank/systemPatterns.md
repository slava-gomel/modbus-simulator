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
  - `storage` – изолированный слой работы с файловым хранилищем (config/state).
- Идиоматичный REST:
  - `/api/config` – конфигурация.
  - `/api/state/{kind}` – работа с регистрами.
  - `/api/generators` – конфигурация генераторов сигналов (привязана к профилям при save/load).
  - `/api/profiles/{slug}/update` – обновление существующего профиля из текущей конфигурации, состояния регистров и набора генераторов.
- `/api/server/modbus_log` – отдаёт кольцевой буфер событий Modbus (`ModbusLogEntry`) с поддержкой поля `since` и типом `modbus_write` для записей FC05/06/15/16, содержащих `kind` (`coils`/`holding`), `start`, `count`.
- Фоновый движок генераторов: `SignalGeneratorEngine` в отдельном потоке обновляет holding‑регистры по таймеру; конфигурация задаётся через API и восстанавливается из профиля при load. Движок хранит полный список генераторов и в run‑loop учитывает только включённые (`enabled`), чтобы профили и `/api/generators` всегда работали с полной конфигурацией.

**Паттерны Frontend (после рефакторинга):**
- **Feature-based модульная архитектура:**
  - Каждая feature изолирована в своей папке: Context (state + logic) + UI компоненты
  - `features/auth/`, `features/config/`, `features/server/`, `features/profiles/`, `features/logs/`, `features/registers/`, `features/generators/`
- **React Context API для state management:**
  - Каждая feature имеет свой Context Provider
  - AppProviders.tsx композирует все контексты с управлением зависимостями
  - Inter-context communication через prop-based callbacks
- **Shared модули:**
  - `shared/types.ts` – общие типы приложения
  - `shared/constants.ts` – константы (polling intervals, colors, limits)
  - `shared/hooks/` – переиспользуемые хуки (usePolling, useCollapse)
- **Компонентная композиция:**
  - Крупные панели разбиты на под-компоненты (RegistersTable, CoilsTable, RegisterCell)
  - Каждый компонент обёрнут в React.memo для оптимизации
  - useMemo/useCallback для предотвращения лишних рендеров
- **App.tsx как тонкий orchestration layer:**
  - ~140 строк (вместо 2714)
  - Только композиция UI, без бизнес-логики
  - Вся логика вынесена в Context-провайдеры

- **UI организация (тёмный дешборд):**
  - Общий layout: верхний блок «Настройки» (Modbus-сервер, конфигурация, профили), ниже — «Регистры» и «Генераторы» на всю ширину, внизу — журнал
  - Все ключевые панели сворачиваемые
  - Регистры: таблица диапазонов с неоновой подсветкой от генераторов и зелёной вспышкой от Modbus-записей (применяется к input, не к td)
  - Переиспользуемые CSS-классы (`panel`, `field-*`, `btn`, `registers-table*`, `log-*`, `generator-value-display`)

- SPA работает только через HTTP API, без прямого доступа к Modbus TCP.

