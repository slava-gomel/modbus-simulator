## modbud_simulator – Modbus TCP Simulator с WEB GUI

Симулятор Modbus TCP slave с WEB-интерфейсом для конфигурирования и наблюдения за регистрами.

### Возможности

- **Backend (FastAPI + pymodbus):** Modbus TCP slave (функции 01–06, 15/16), запуск/остановка сервера через API, хранение конфигурации и состояния в файлах.
- **WEB GUI (React + TypeScript):** конфигурация Modbus, просмотр и редактирование регистров (coils, discrete inputs, holding, input), пакетная запись и пресеты («Заполнить нулями», «Случайные значения»), управление сервером (статус, Запустить/Остановить), профили (сохранение и загрузка конфигурации и состояния).
- **Docker Compose:** сервисы `backend` и `frontend`, volume для данных.

### Запуск

**Docker Compose (рекомендуется):**

```bash
docker compose up --build
```

- **Backend:** API `http://localhost:8000/api/...`, health `http://localhost:8000/health`, Modbus TCP `localhost:1502`
- **WEB GUI:** `http://localhost:8080`

**Локальная разработка:**

```bash
# Backend
cd backend && pip install -e .[dev] && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (в другом терминале)
cd frontend && npm install && npm run dev
```

Фронтенд: `http://localhost:5173`, прокси `/api` → `http://localhost:8000`.

### Профили

В GUI раздел «Профили»: сохранение текущей конфигурации и состояния регистров под именем (и комментарием), загрузка и удаление профилей. Файлы хранятся в volume в каталоге `profiles/` (YAML).

### Пресеты регистров

Для coils и holding регистров: кнопки «Заполнить нулями» и «Случайные значения» — заполняют выбранный диапазон и записывают его одним batch-запросом.

### Авторизация (опционально)

Если заданы переменные окружения `GUI_USER` и `GUI_PASSWORD`, доступ к API и WEB GUI защищён Basic Auth. В GUI отображается форма входа. Без этих переменных авторизация не требуется.

Пример для docker-compose:

```yaml
environment:
  - GUI_USER=admin
  - GUI_PASSWORD=secret
```

### Тесты

```bash
cd backend && python3 -m pytest tests/ -v
```

Перед запуском тестов нужна установка: `pip install -e .[dev]`. Для тестов используется временный каталог данных (см. `tests/conftest.py`).

