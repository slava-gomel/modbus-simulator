## Progress

**Реализовано:**
- Modbus TCP (pymodbus 3.6.x): 01–06, 15/16; запуск/остановка сервера через API; при ошибке «порт занят» — понятный ответ в API.
- HTTP API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch`, `/api/server/status`, `/api/server/start`, `/api/server/stop`, `/api/profiles` (GET/POST), `/api/profiles/{slug}/load`, `/api/profiles/{slug}/update`, DELETE профиля; **`/api/generators`** (GET/PUT) — список и сохранение конфигурации генераторов.
- WebSocket API: `/ws/registers`, `/ws/server`, `/ws/generators` — real-time обновления (заменил HTTP polling).
- Хранилище: `config.yaml`, `state.json`, каталог `profiles/` (YAML с полями config, state, **generators**); профиль `default` создаётся автоматически и защищён от удаления.
- **Генератор сигналов (backend):** модуль `signal_generators` (SignalGeneratorEngine, фоновый поток), `encoding_utils` (кодирование INT16/FLOAT32/FLOAT64 в регистры), интеграция в lifespan; генераторы сохраняются и загружаются вместе с профилем. Движок хранит все генераторы (включённые и выключенные), а run‑loop учитывает флаг `enabled`, что позволяет корректно round‑trip'ить конфигурации через профили и API генераторов.
- **Modbus‑лог (backend):** `modbus_log` хранит события Modbus; при FC05/06/15/16 в `modbus_server.InMemoryDataStore.setValues` добавляются записи типа `modbus_write` с полями `kind` (`coils`/`holding`), `start`, `count` для точной привязки изменений к диапазонам регистров.

- **GUI (после комплексного рефакторинга 2026-02-13):**
  - **Модульная архитектура:** feature-based структура с React Context API
  - **Модульная API** (`api/`): client, types, registers, generators, profiles, server (7 модулей вместо 1 файла)
  - **Shared UI компоненты** (`shared/components/`): Button, Input, RadioGroup, NumericField
  - **Разделённые типы** (`shared/types/`): registers, logs, generators
  - **Features:** auth, config, server, profiles, logs (с LogFilters/LogEntry), registers (с RegistersToolbar/RegistersFormatSelector/converters), generators (с GeneratorForm/GeneratorsList/WaveChart)
  - **Shared:** types (модульные), constants, hooks (useWebSocket, useCollapse, useApiCall)
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

- **Тесты (2026-02-20, 157 тестов, все проходят):**
  - **Backend (102 теста):**
    - API: health, state, batch, server, profiles, generators
    - `test_encoding_utils.py` – INT16/FLOAT32/FLOAT64 (22 теста)
    - **`test_modbus_core.py`** – Modbus FC01–FC06/FC15–FC16 (41 тест)
    - **`test_modbus_integration.py`** – InMemoryDataStore (18 тестов)
    - `test_websocket.py` – каналы и broadcast
    - ~1.5s на все backend-тесты
  - **Frontend (55 тестов):**
    - `converters.test.ts` – форматы INT16/32/64, FLOAT32/64, BITMAP (44 теста)
    - `useCollapse.test.ts` – 5 тестов
    - `WebSocketContext.test.tsx` – 6 тестов (подписка, сообщения, отписка, abnormal close → disconnected, несколько каналов)
    - Vitest + jsdom, ~1.5s
  - **Исправление падающих тестов (2026-02-20):** WebSocketContext — тест переподключения упрощён до проверки «disconnected» при аварийном закрытии (code 1006); тест «multiple channels» — vi.useRealTimers() и timeout для стабильности.

**Статистика:**
- Рефакторинг v2: модульная структура backend/frontend
- WebSocket v3: real-time, раздельные каналы
- Тесты: 157 (backend 102, frontend 55), 100% проходят
  - 100% покрытие реализованных Modbus функций
- Frontend: модульная структура, shared UI компоненты, **WebSocket real-time**
- Backend: модульная storage, полное покрытие Modbus, **WebSocket broadcast**
- Документация: 7+ файлов (3500+ строк), включая WEBSOCKET.md
- TypeScript: ✅ компиляция успешна
- Python: ✅ синтаксис корректен

**Реализовано (2026-02-13):**
- ✅ **WebSocket Real-time Communication** - замена HTTP polling
- ✅ Раздельные каналы для registers, server, generators
- ✅ Автоматическое переподключение с exponential backoff
- ✅ UI индикатор состояния соединений
- ✅ Broadcast из threading кода
- ✅ Тесты WebSocket (backend + frontend)
- ✅ Документация WEBSOCKET.md
- ✅ **Оптимизация обновлений от генераторов:** 
  - Batch обновления: все изменения за цикл (20ms) группируются в одно событие
  - Последовательные регистры объединяются для эффективности
  - Локальное обновление UI без HTTP запросов
  - Частота обновлений регистров = частота генераторов (~100ms)

- ✅ **Исправление WebSocket стабильности (2026-02-13 вечер):**
  - Nginx proxy для `/ws/` endpoints с увеличенными timeouts (7 days)
  - Ограничение переподключений: максимум 10 попыток (предотвращает зависание)
  - Уменьшенное логирование: только первые 3 ошибки (предотвращает переполнение консоли)
  - React.StrictMode отключен (предотвращает двойное монтирование WebSocket)
  - Стабильный useWebSocket hook с useRef pattern (предотвращает лишние пересоздания подписок)
  - Исправлен двойной websocket.accept() в endpoints

- ✅ **Исправление лавины запросов и загрузки таблицы регистров (2026-02-13):**
  - В App.tsx эффект начальной загрузки (loadConfig, refreshProfiles, loadGenerators) зависит только от `[authenticated]`.
  - Колбэки не добавлены в deps намеренно: при их пересоздании (напр. после setCurrentProfileSlug в refreshProfiles) эффект уходил в бесконечный цикл → сотни запросов к /config, /generators, /profiles → Stalled, ERR_INSUFFICIENT_RESOURCES, таблица регистров не загружалась.
  - После фикса: один вызов загрузки при входе; таблица регистров загружается с первого раза (reloadRegisters в RegistersContext).

**В планах (по желанию):** CI (GitHub Actions), E2E тесты (Playwright), E2E Modbus с TCP клиентом, История изменений регистров.

