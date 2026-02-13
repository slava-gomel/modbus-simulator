## modbud_simulator – Modbus TCP Simulator с WEB GUI

Симулятор Modbus TCP slave с WEB-интерфейсом для конфигурирования и наблюдения за регистрами.

## Содержание

- [Возможности](#возможности)
- [Быстрый старт](#быстрый-старт)
- [Документация](#документация)
- [Разработка](#разработка)
- [Тестирование](#тестирование)

## Возможности

### Backend (FastAPI + pymodbus)
- Modbus TCP slave (функции 01–06, 15/16)
- Запуск/остановка сервера через API
- Хранение конфигурации и состояния в файлах
- Модульная архитектура storage

### WEB GUI (React + TypeScript)
- Конфигурация Modbus параметров
- Просмотр и редактирование регистров (coils, discrete inputs, holding, input)
- Форматы отображения: INT16/32/64, FLOAT32/64, BITMAP
- Пакетная запись и пресеты
- Управление профилями конфигураций
- Журнал событий Modbus
- Feature-based архитектура с React Context API

### Генератор сигналов
- Фоновое обновление holding‑регистров
- Типы сигналов: синус, пила, меандр, константа
- Форматы: INT16, FLOAT32, FLOAT64
- Настраиваемые параметры: амплитуда, частота, смещение
- Параллельная работа нескольких генераторов

### Профили
- Сохранение конфигурации и состояния под именем
- Комментарии к профилям
- Привязка генераторов сигналов к профилям
- Загрузка и удаление профилей
- Хранение в YAML файлах

## Быстрый старт

### Docker Compose (рекомендуется)

```bash
docker compose up --build
```

**Доступ:**
- Backend API: `http://localhost:8000/api`
- API Docs: `http://localhost:8000/docs`
- WEB GUI: `http://localhost:3000`
- Modbus TCP: `localhost:502`

### Локальная разработка

**Backend:**
```bash
cd backend
pip install -e .[dev]
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`, API прокси `/api` → `http://localhost:8000`

## Документация

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Архитектура проекта, структура модулей, data flow
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Руководство для разработчиков, code style, git workflow
- **[docs/API.md](./docs/API.md)** — Полная REST API документация
- **[TESTING.md](./TESTING.md)** — Руководство по тестированию (backend + frontend)
- **[DOCKER_REBUILD.md](./DOCKER_REBUILD.md)** — Инструкции по пересборке Docker после изменений

### Структура проекта

```
modbud_simulator/
├── frontend/               # React + TypeScript
│   ├── src/
│   │   ├── api/           # Модульные API клиенты
│   │   ├── features/      # Feature-based modules
│   │   ├── shared/        # Переиспользуемые компоненты
│   │   └── App.tsx
│   └── Dockerfile
├── backend/               # FastAPI + Python
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── storage/      # Модульное хранилище
│   │   ├── modbus_core.py
│   │   └── main.py
│   └── Dockerfile
├── docs/                  # Документация
│   └── API.md
├── ARCHITECTURE.md        # Архитектура системы
├── CONTRIBUTING.md        # Руководство разработчика
└── docker-compose.yml
```

## Разработка

### Frontend

**Технологии:**
- React 18 + TypeScript
- Vite для dev сервера и сборки
- Axios для API запросов
- React Context API для state management

**Архитектура:**
- Feature-based структура (`features/`)
- Shared UI компоненты (`shared/components/`)
- Custom hooks (`usePolling`, `useApiCall`)
- Модульная API (`api/registers.ts`, `api/generators.ts`, и т.д.)

### Backend

**Технологии:**
- FastAPI
- Pymodbus для Modbus TCP
- YAML/JSON для storage
- Threading для генераторов сигналов

**Архитектура:**
- Модульная storage система (`storage/config.py`, `storage/state.py`, `storage/profiles.py`)
- Dependency injection через init функции
- Type hints (PEP 484)
- Structured logging

### Code Style

**Frontend:**
- TypeScript strict mode
- React.FC для компонентов
- Именование: PascalCase (компоненты), camelCase (функции/переменные)

**Backend:**
- PEP 8 style guide
- Type hints для всех функций
- Google-style docstrings

См. [CONTRIBUTING.md](./CONTRIBUTING.md) для деталей.

## Тестирование

### Backend

```bash
cd backend
pip install -e .[dev]  # Установить зависимости для тестов
pytest tests/ -v
pytest --cov=app  # С покрытием кода
```

**Покрытие:** 94 теста (health, state, server, profiles, generators, encoding_utils, **modbus_core, modbus_integration**)

### Frontend

```bash
cd frontend
npm install  # Установить зависимости для тестов
npm test
npm run test:ui  # UI интерфейс
npm run test:coverage  # С покрытием кода
```

**Покрытие:** 70+ тестов (converters, usePolling, useCollapse)

### Docker

```bash
# Backend тесты
docker compose run --rm backend pytest tests/ -v

# Frontend тесты
docker compose run --rm frontend npm test
```

См. [TESTING.md](./TESTING.md) для подробностей.

## Авторизация (опционально)

Защита доступа через HTTP Basic Auth:

```yaml
# docker-compose.yml
environment:
  - MB_AUTH_USER=admin
  - MB_AUTH_PASS=secret
```

Без этих переменных авторизация не требуется.

## Производство

**Рекомендации для production:**

1. Настройте CORS whitelist в `backend/app/main.py`
2. Используйте переменные окружения для конфигурации
3. Настройте volume для `/app/data` для persistence
4. Добавьте nginx reverse proxy для rate limiting
5. Включите HTTPS

См. [ARCHITECTURE.md](./ARCHITECTURE.md#deployment) для деталей.

## Лицензия

MIT

## Contributing

Contributions welcome! См. [CONTRIBUTING.md](./CONTRIBUTING.md) для начала работы.

## Поддержка

- Issues: GitHub Issues
- Документация: См. `/docs` и `ARCHITECTURE.md`


