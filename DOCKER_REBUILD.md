# Пересборка Docker после добавления тестов

## ⚠️ Важно

После добавления тестовых зависимостей в frontend необходимо пересобрать Docker образы.

## Быстрая пересборка

```bash
# Остановить контейнеры
docker compose down

# Пересобрать только frontend (добавлены зависимости для тестов)
docker compose build frontend

# Запустить снова
docker compose up -d
```

## Полная пересборка (если нужно)

```bash
# Остановить и удалить контейнеры
docker compose down

# Пересобрать всё с нуля
docker compose build --no-cache

# Запустить
docker compose up -d
```

## Проверка работоспособности

```bash
# Проверить логи
docker compose logs -f

# Проверить статус
docker compose ps

# Открыть браузер
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

## Запуск тестов в Docker

### Backend тесты

```bash
# Важно: использовать python -m pytest вместо pytest напрямую
docker compose run --rm backend python -m pytest tests/ -v

# С покрытием
docker compose run --rm backend python -m pytest tests/ --cov=app --cov-report=term

# Конкретный модуль
docker compose run --rm backend python -m pytest tests/test_modbus_core.py -v
```

### Frontend тесты

```bash
# Использовать специальный сервис frontend-test
docker compose --profile testing run --rm frontend-test

# Или напрямую с npm
docker compose --profile testing run --rm frontend-test npm test -- --run

# С покрытием
docker compose --profile testing run --rm frontend-test npm test -- --run --coverage

# С UI (доступен на http://localhost:51204)
docker compose --profile testing run --rm -p 51204:51204 frontend-test npm test -- --ui
```

**Примечание:** Frontend использует profile `testing` для изоляции тестового окружения от production.

## Альтернатива: Локальная разработка

Для быстрой разработки и тестирования рекомендуется запускать тесты локально:

### Backend

```bash
cd backend
pip install -e .[dev]
pytest tests/ -v
```

### Frontend

```bash
cd frontend
npm install
npm test
```

## Что изменилось

### Backend `Dockerfile`

```diff
+ COPY tests ./tests
```
- Тесты теперь копируются в образ для запуска в Docker

### Frontend `Dockerfile`

Переработан на multi-stage build:
```dockerfile
FROM node:20-alpine AS base     # Базовый слой с зависимостями
FROM base AS dev                # Для тестирования
FROM base AS build              # Для сборки
FROM nginx:1.27-alpine AS production  # Production образ
```

**Преимущества:**
- Тестовые зависимости НЕ попадают в production образ
- Production образ остался компактным (~40 MB)
- Dev образ содержит всё для тестирования

### `docker-compose.yml`

```diff
  frontend:
    build:
+     target: production
+
+ frontend-test:
+   build:
+     target: dev
+   profiles:
+     - testing
+   command: npm test -- --run
```
- Добавлен отдельный сервис `frontend-test` для тестов
- Использование Docker Compose profiles для изоляции

### Frontend `package.json`

Добавлены dev-зависимости:
- `vitest` – test runner
- `@vitest/ui` – UI интерфейс для тестов
- `jsdom` – DOM окружение
- `@testing-library/react` – утилиты для тестирования
- `@testing-library/jest-dom` – дополнительные matchers

### Новые файлы

**Backend тесты (94 теста):**
- `test_encoding_utils.py` – конвертация данных (22 теста)
- `test_modbus_core.py` – ядро Modbus (41 тест)
- `test_modbus_integration.py` – интеграция с pymodbus (18 тестов)
- `test_*_api.py` – API endpoints (13 тестов)

**Frontend тесты (54 теста):**
- `vitest.config.ts` – конфигурация Vitest
- `src/test/setup.ts` – настройка окружения
- `converters.test.ts` – тесты converters (44 теста)
- `usePolling.test.ts` – тесты usePolling (5 тестов)
- `useCollapse.test.ts` – тесты useCollapse (5 тестов)

**Документация:**
- `.cursorrules` – проектный интеллект и паттерны
- `TESTING.md` – руководство по тестированию
- `DOCKER_REBUILD.md` – инструкции по пересборке
- `DOCKER_TEST_RESULTS.md` – результаты Docker тестов
- `frontend/README_TESTS.md` – frontend тестирование
- `backend/tests/README_MODBUS_TESTS.md` – Modbus тесты

## Размер образов

### До изменений
- Backend: ~300 MB
- Frontend (production): ~40 MB

### После изменений
- Backend: ~302 MB (+2 MB из-за копирования tests/)
- Frontend (production): ~40 MB (без изменений!)
- Frontend (dev): ~450 MB (только для тестирования)

**Важно:** Production образы frontend остались компактными благодаря multi-stage build.

## Troubleshooting

### Ошибка "Module not found"

```bash
# Пересобрать с чистым кэшем
docker compose build --no-cache frontend
```

### Контейнер не запускается

```bash
# Проверить логи
docker compose logs frontend

# Проверить синтаксис docker-compose.yml
docker compose config
```

### Порты заняты

```bash
# Проверить занятые порты
sudo netstat -tulpn | grep -E '(3000|8000|502)'

# Остановить старые контейнеры
docker compose down
```

## Production deployment

Для production рекомендуется использовать multi-stage build в Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Тестовые зависимости не попадут в production образ
```

Текущий Dockerfile frontend уже использует этот подход, поэтому тестовые зависимости не влияют на production образ.
