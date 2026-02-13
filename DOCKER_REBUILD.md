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
docker compose run --rm backend pytest tests/ -v
```

### Frontend тесты

```bash
# Первая установка зависимостей (внутри контейнера)
docker compose run --rm frontend npm install

# Запуск тестов
docker compose run --rm frontend npm test
```

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

### Frontend `package.json`

Добавлены dev-зависимости:
- `vitest` – test runner
- `@vitest/ui` – UI интерфейс для тестов
- `jsdom` – DOM окружение
- `@testing-library/react` – утилиты для тестирования
- `@testing-library/jest-dom` – дополнительные matchers

### Новые файлы

**Backend:**
- `backend/tests/test_encoding_utils.py` – тесты конвертации (22 теста)

**Frontend:**
- `frontend/vitest.config.ts` – конфигурация Vitest
- `frontend/src/test/setup.ts` – настройка окружения
- `frontend/src/features/registers/converters.test.ts` – тесты converters (60+ тестов)
- `frontend/src/shared/hooks/usePolling.test.ts` – тесты usePolling (6 тестов)
- `frontend/src/shared/hooks/useCollapse.test.ts` – тесты useCollapse (6 тестов)
- `frontend/README_TESTS.md` – документация по тестам

**Документация:**
- `.cursorrules` – проектный интеллект и паттерны
- `TESTING.md` – руководство по тестированию
- `DOCKER_REBUILD.md` – инструкции по пересборке

## Размер образов

После пересборки размер frontend образа увеличится на ~50-100 MB из-за тестовых зависимостей.

Если это критично для production, можно создать отдельный `Dockerfile.test` для тестирования.

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
