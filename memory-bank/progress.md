## Progress

**Реализовано:**
- Modbus TCP (pymodbus 3.6.x): 01–06, 15/16; запуск/остановка сервера через API; при ошибке «порт занят» — понятный ответ в API.
- HTTP API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch`, `/api/server/status`, `/api/server/start`, `/api/server/stop`, `/api/profiles` (GET/POST), `/api/profiles/{slug}/load`, `/api/profiles/{slug}/update`, DELETE профиля; **`/api/generators`** (GET/PUT) — список и сохранение конфигурации генераторов.
- WebSocket API: `/ws/registers`, `/ws/server`, `/ws/generators` — real-time обновления (заменил HTTP polling).
- Хранилище: `config.yaml`, `state.json`, каталог `profiles/` (YAML с полями config, state, **generators**); профиль `default` создаётся автоматически и защищён от удаления.
- **Генератор сигналов (backend):** модуль `signal_generators` (SignalGeneratorEngine, фоновый поток), `encoding_utils` (кодирование INT16/FLOAT32/FLOAT64 в регистры), интеграция в lifespan; генераторы сохраняются и загружаются вместе с профилем.
- **Modbus‑лог (backend):** `modbus_log` хранит события Modbus; при FC05/06/15/16 записи типа `modbus_write` с полями `kind`, `start`, `count`.

- **GUI (v4 — комплексное улучшение 2026-02-20):**
  - **Новые зависимости:** `@heroicons/react`, `sonner`
  - **Toast уведомления (Sonner):** успех/ошибка во всех Context-ах (Config, Server, Profiles, Generators)
  - **Новые shared-компоненты:** ToggleSwitch, ConfirmDialog, Skeleton, ShortcutsHelp
  - **AppHeader:** глобальный статус сервера (пульсирующая точка + адрес) и badge текущего профиля
  - **Heroicons:** иконки на всех кнопках (Play/Stop, Plus, Check, Trash, Pencil, Arrow, ChevronDown/Right)
  - **Компактный layout настроек:** уменьшены padding/gap
  - **Dropdown формата регистров:** select вместо radio (INT16–BITMAP)
  - **Таблица регистров:** компактный заголовок "ADDR", tooltip с номером регистра
  - **Генераторы:** ToggleSwitch, icon-кнопки, 2-колоночная форма с предпросмотром графика
  - **ConfirmDialog:** удаление профилей и генераторов вместо window.confirm
  - **Цветные badge-и логов:** категории error/server/modbus/generator/profile
  - **Skeleton loading:** при загрузке конфигурации, регистров, профилей
  - **Keyboard shortcuts:** `?` — справка, `Ctrl+S`, `Ctrl+Shift+R`, `Escape`
  - **Auto-scroll лога:** кнопка-индикатор, resizable контейнер
  - **Responsive:** адаптивный layout для узких экранов
  - **Пагинация логов:** последние 100 записей, подгрузка при scroll вверх
  
  - **Модульная архитектура (v2 — 2026-02-13):** feature-based структура с React Context API
  - **Модульная API** (`api/`): client, types, registers, generators, profiles, server (7 модулей)
  - **Shared UI компоненты** (`shared/components/`): Button, Input, RadioGroup, NumericField, ToggleSwitch, ConfirmDialog, Skeleton, ShortcutsHelp, ConnectionStatus
  - **Custom hooks** (`shared/hooks/`): useWebSocket, useCollapse, useApiCall, useKeyboardShortcuts
  - **Features:** auth, config, server, profiles, logs, registers, generators, websocket
  - **App.tsx:** ~165 строк (вместо 2714), с ShortcutsHelp и обновлённым AppHeader

- **Backend (после рефакторинга v2):**
  - **Модульная Storage система** (`app/storage/`): BaseStorage, ConfigStorage, StateStorage, ProfilesStorage, Storage фасад
  - **Обновлённые API endpoints:** используют новую модульную структуру storage

- **Документация:**
  - **ARCHITECTURE.md** (287 строк): архитектура проекта
  - **CONTRIBUTING.md** (420 строк): руководство для разработчиков
  - **docs/API.md** (400+ строк): REST API документация
  - **README.md**: обновлён со ссылками

- **Тесты (157 тестов, все проходят):**
  - **Backend (102 теста):** API, encoding_utils, Modbus FC01–FC06/FC15–FC16, WebSocket
  - **Frontend (55 тестов):** converters, useCollapse, WebSocketContext

**Статистика:**
- GUI v4: 18 задач, ~960 строк добавлено, 5 новых файлов
- Тесты: 157 (backend 102, frontend 55), 100% проходят
- TypeScript: ✅ компиляция успешна
- Frontend build: ✅ успешен (287 kB JS, 20 kB CSS)

**В планах (по желанию):** CI (GitHub Actions), E2E тесты (Playwright), E2E Modbus с TCP клиентом.
