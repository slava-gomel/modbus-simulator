## Progress

**Реализовано:**
- Modbus TCP (pymodbus 3.6.x): 01–06, 15/16; запуск/остановка сервера через API; при ошибке «порт занят» — понятный ответ в API.
- API: `/health`, `/api/config`, `/api/state/{kind}` (GET/PUT), `/api/state/{kind}/batch`, `/api/server/status`, `/api/server/start`, `/api/server/stop`, `/api/profiles` (GET/POST), `/api/profiles/{slug}/load`, DELETE профиля.
- Хранилище: `config.yaml`, `state.json`, каталог `profiles/` (YAML).
- GUI: конфигурация, регистры (одиночная и batch запись, пресеты «Заполнить нулями», «Случайные значения»), Modbus-сервер (статус с автообновлением, Запустить/Остановить), профили (сохранение/загрузка/удаление), при включённой авторизацией — форма входа, журнал событий с цветами по типам (запуск/остановка, ошибки, Modbus‑операции, HEX‑трейс), свежие записи сверху.
- Авторизация: опциональная (env `GUI_USER`/`GUI_PASSWORD`); при заданных — Basic Auth для API и форма логина в SPA.
- Тесты: health, state, batch, server, profiles; `pytest` с временным DATA_DIR.
- README: запуск, порты, профили, пресеты, тесты.

**В планах (по желанию):** CI (GitHub Actions), e2e-тесты.

