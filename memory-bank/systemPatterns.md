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
  - `/api/generators` – конфигурация генераторов сигналов.
  - `/api/profiles/{slug}/update` – обновление профиля.
- `/api/server/modbus_log` – кольцевой буфер событий Modbus.
- Фоновый движок генераторов: `SignalGeneratorEngine` в отдельном потоке; хранит полный список генераторов, run-loop учитывает только `enabled`.

**Паттерны Frontend (v4 с GUI Improvements):**
- **Feature-based модульная архитектура:**
  - Каждая feature изолирована: Context (state + logic) + UI компоненты
  - `features/auth/`, `features/config/`, `features/server/`, `features/profiles/`, `features/logs/`, `features/registers/`, `features/generators/`, `features/websocket/`
  
- **Модульная API структура** (`api/`):
  - `client.ts` – axios instance с auth interceptor (обработка 401)
  - `types.ts` – все API типы данных
  - Доменные модули: `registers.ts`, `generators.ts`, `profiles.ts`, `server.ts`
  - `index.ts` – barrel exports
  
- **Shared UI компоненты** (`shared/components/`):
  - `Button.tsx` – универсальная кнопка (variant: default/ghost/outline/danger)
  - `Input.tsx` – поле ввода с label и error
  - `RadioGroup.tsx` – группа радиокнопок
  - `NumericField.tsx` – числовое поле с валидацией
  - **`ToggleSwitch.tsx`** – переключатель on/off (v4)
  - **`ConfirmDialog.tsx`** – модальный диалог подтверждения с backdrop-blur (v4)
  - **`Skeleton.tsx`** – анимированные плейсхолдеры при загрузке (v4)
  - **`ShortcutsHelp.tsx`** – модальная шпаргалка горячих клавиш (v4)
  - `ConnectionStatus.tsx` – индикатор WebSocket соединения
  - `index.ts` – barrel export
  
- **Custom hooks** (`shared/hooks/`):
  - `useWebSocket` – подписка на каналы WebSocket
  - `useCollapse` – состояние сворачивания панелей
  - `useApiCall` – универсальный хук для API
  - **`useKeyboardShortcuts`** – глобальные горячие клавиши (v4)

- **Toast-уведомления (Sonner, v4):**
  - `<Toaster />` в App.tsx (position: bottom-right, theme: dark)
  - `toast.success()` / `toast.error()` во всех Context-ах
  - Уведомления при: сохранении конфигурации, запуске/остановке сервера, операциях с профилями, создании/удалении генераторов

- **ConfirmDialog (v4):**
  - Заменяет `window.confirm` для удаления профилей и генераторов
  - Поддержка варианта `danger` (красная кнопка)
  - Закрытие по Escape и клику по overlay
  - **Рендер через `createPortal(dialog, document.body)`** — обязательно, иначе stacking context родительских панелей (box-shadow, border-radius и т.д.) перекрывает overlay. То же для `ShortcutsHelp`.

- **AppHeader со статусом (v4):**
  - Пульсирующая точка: зелёная (запущен) / оранжевая (остановлен) + адрес сервера
  - Badge текущего профиля

- **Heroicons (v4):**
  - `@heroicons/react/20/solid` на всех кнопках
  - ChevronDown/Right для collapse toggles

- **Цветные badge-и логов (v4):**
  - `LOG_TYPE_CATEGORIES` в constants.ts маппит тип события → категорию
  - CSS: `badge-log-type[data-category="error|server|modbus|generator|profile"]`

- **Пагинация логов (v4):**
  - Показ последних 100 записей (PAGE_SIZE)
  - Подгрузка при scroll вверх (intersection с верхней границей)
  - Сброс при смене фильтров

- **Auto-scroll лога (v4):**
  - Отслеживание позиции scroll → автоматическое включение/выключение
  - Кнопка-индикатор для ручного scroll к последним записям
  - Контейнер с `resize: vertical` (min 160px, max 600px)

- **React Context API для state management:**
  - AppProviders.tsx композирует все контексты
  - **Порядок providers важен:** RegistersProvider выше ServerProviderWrapper
  
- **Converters** (`features/registers/converters.ts`):
  - Вся логика конвертации форматов вынесена из Context
  - `ConversionResult { registers: number[], error?: string }`

- **App.tsx как тонкий orchestration layer:**
  - ~165 строк (вместо 2714)
  - **Начальная загрузка:** эффект при `authenticated` — deps только `[authenticated]`
  - ShortcutsHelp интегрирован

- **WebSocket Real-time Communication:**
  - Замена HTTP polling — мгновенные обновления
  - Раздельные каналы: `/ws/registers`, `/ws/server`, `/ws/generators`
  - Автоматическое переподключение (exponential backoff)
  - ConnectionStatus banner при разрыве соединения

- **UI организация (тёмный dashboard):**
  - Общий layout: flexbox column (`display: flex; flex-direction: column`) — верхний блок «Настройки», ниже «Регистры» (полная ширина), «Генераторы», внизу — «Журнал»
  - **Важно:** НЕ использовать CSS grid с grid-template-areas для основного layout — stacking context и порядок панелей ломаются на узких экранах. Flexbox column обеспечивает DOM-порядок на всех ширинах.
  - Все панели сворачиваемые (ChevronDown/Right иконки)
  - Responsive: одна колонка настроек на узких экранах
  - Регистры: таблица с неоновой подсветкой от генераторов и зелёной вспышкой от Modbus-записей
  - Генераторы: таблица с ToggleSwitch и icon-кнопками; форма с 2-колоночным layout
  - Журнал: фильтры, цветные badge-и, auto-scroll, пагинация, resizable
