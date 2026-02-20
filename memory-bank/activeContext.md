## Active Context

**Текущий фокус (2026‑02‑20):**
- ✅ Завершён комплексный рефакторинг всего проекта (frontend + backend + документация).
- ✅ Frontend: модульная API, shared UI компоненты, разделённые панели.
- ✅ Backend: модульная storage система с разделением ответственности.
- ✅ Документация: ARCHITECTURE.md, CONTRIBUTING.md, docs/API.md.
- ✅ **Тесты: backend 102, frontend 55 — все проходят.** Полное покрытие Modbus FC01–FC06/FC15–FC16.
- ✅ **WebSocket:** real-time обновления (registers, server, generators); polling удалён.
- ✅ **GUI Improvements v4 (2026-02-20):** Комплексное улучшение интерфейса (14 фаз, 18 задач).

**GUI Improvements v4 — реализовано (2026-02-20):**

1. **Sonner (toast-уведомления):** интегрирован во все Context-ы (Config, Server, Profiles, Generators). Toast при успешных и ошибочных операциях.

2. **Новые shared-компоненты:**
   - `ToggleSwitch` — переключатель on/off для генераторов
   - `ConfirmDialog` — модальный диалог подтверждения (backdrop-blur, Escape, **createPortal в body**)
   - `Skeleton` — анимированные плейсхолдеры при загрузке (text/rect/table варианты)
   - `ShortcutsHelp` — модальная шпаргалка горячих клавиш (**createPortal в body**)

3. **AppHeader:** глобальный статус сервера (зелёная пульсирующая/оранжевая точка + адрес) и badge текущего профиля.

4. **Heroicons на всех кнопках:** Play/Stop, Plus, Check, Trash, Pencil, Arrow, ChevronDown/Right — во всех панелях (Server, Config, Profiles, Registers, Generators, Logs, collapse toggles).

5. **Компактный layout настроек:** уменьшены padding/gap, убраны лишние subtitles.

6. **Dropdown формата регистров:** radio заменён на select (INT16, INT32, INT64, FLOAT32, FLOAT64, BITMAP).

7. **Таблица регистров:** компактный заголовок "ADDR", tooltip с номером регистра на ячейках.

8. **Генераторы:**
   - Таблица: ToggleSwitch вместо текстового статуса, icon-кнопки (Pencil/Trash)
   - Форма: 2-колоночный layout (параметры слева, предпросмотр графика справа), секции "Основные параметры"/"Параметры сигнала", увеличенный SVG-график

9. **ConfirmDialog:** удаление профилей и генераторов через красивый модальный диалог вместо `window.confirm`; обновление профилей тоже через подтверждение.

10. **Цветные badge-и логов:** error→красный, server→зелёный, modbus→синий, generator→циан, profile→серый.

11. **Skeleton loading:** при загрузке конфигурации, регистров и профилей.

12. **Keyboard shortcuts:** `?` — справка, `Ctrl+S` — сохранить, `Ctrl+Shift+R` — перезагрузить регистры, `Escape` — закрыть диалог.

13. **Auto-scroll лога:** кнопка-индикатор, контейнер с `resize: vertical`.

14. **Responsive:** адаптивный layout для узких экранов (одна колонка настроек, перенос toolbar). Исправлен порядок панелей на узких экранах: Настройки → Регистры (полная ширина) → Генераторы → Журнал. Layout заменён с grid на flexbox (flex-direction: column) для корректного порядка на всех размерах экрана.

15. **Пагинация логов:** показ последних 100 записей с подгрузкой при скролле вверх.

**Новые зависимости:**
- `@heroicons/react` — SVG иконки
- `sonner` — toast уведомления

**Дальше по желанию:** CI (GitHub Actions), E2E тесты (Playwright), E2E Modbus с реальным TCP клиентом.
