# Руководство по тестированию

## Backend тесты

### Установка зависимостей для разработки

```bash
cd backend
pip install -e .[dev]
```

### Запуск всех тестов

```bash
cd backend
pytest tests/ -v
```

### Запуск тестов с покрытием

```bash
cd backend
pytest tests/ --cov=app --cov-report=html
```

Отчёт о покрытии будет доступен в `htmlcov/index.html`.

### Тесты по модулям

**Encoding Utils (INT16/FLOAT32/FLOAT64):**
```bash
pytest tests/test_encoding_utils.py -v
```

**Modbus Functions (FC01-FC06, FC15-FC16):**
```bash
# Unit тесты для ModbusSimulatorCore (41 тест)
pytest tests/test_modbus_core.py -v

# Integration тесты для InMemoryDataStore (18 тестов)
pytest tests/test_modbus_integration.py -v
```

**API Endpoints:**
```bash
pytest tests/test_health.py -v
pytest tests/test_state_api.py -v
pytest tests/test_server_api.py -v
pytest tests/test_profiles_api.py -v
pytest tests/test_generators_api.py -v
```

### Запуск тестов в Docker

```bash
# Собрать образ backend
docker compose build backend

# Запустить тесты в контейнере
docker compose run --rm backend pytest tests/ -v
```

## Frontend тесты

### Установка зависимостей

```bash
cd frontend
npm install
```

### Запуск тестов

```bash
cd frontend
npm test
```

### Запуск тестов с UI

```bash
cd frontend
npm run test:ui
```

Откроется интерфейс Vitest UI в браузере.

### Запуск тестов с покрытием

```bash
cd frontend
npm run test:coverage
```

### Тесты по модулям

**Converters (INT16/32/64, FLOAT32/64, BITMAP):**
```bash
npm test -- converters.test.ts
```

**Hooks (usePolling, useCollapse):**
```bash
npm test -- hooks/
```

### Запуск тестов в Docker

После изменения `package.json` необходимо пересобрать frontend образ:

```bash
# Пересобрать frontend с новыми зависимостями
docker compose build frontend

# Запустить тесты в контейнере
docker compose run --rm frontend npm test
```

## Непрерывная интеграция (CI)

### Локальный запуск как в CI

Для проверки, что тесты пройдут в CI:

```bash
# Backend
docker compose run --rm backend pytest tests/ -v

# Frontend  
docker compose run --rm frontend npm test
```

### GitHub Actions (TODO)

Создать `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          cd backend
          pip install -e .[dev]
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=app

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test
```

## Покрытие тестами

### Backend (текущее состояние)

- ✅ `test_health.py` – проверка /health endpoint
- ✅ `test_state_api.py` – чтение/запись регистров, batch операции
- ✅ `test_server_api.py` – управление Modbus сервером
- ✅ `test_profiles_api.py` – сохранение/загрузка профилей
- ✅ `test_generators_api.py` – генераторы сигналов
- ✅ `test_encoding_utils.py` – конвертация INT16/FLOAT32/FLOAT64 (22 теста)
- ✅ `test_modbus_core.py` – unit тесты всех Modbus функций (41 тест)
  - RegisterBlock (9 тестов)
  - FC01: Read Coils (3 теста)
  - FC02: Read Discrete Inputs (2 теста)
  - FC03: Read Holding Registers (3 теста)
  - FC04: Read Input Registers (2 теста)
  - FC05: Write Single Coil (3 теста)
  - FC06: Write Single Register (3 теста)
  - FC15: Write Multiple Coils (5 тестов)
  - FC16: Write Multiple Registers (6 тестов)
  - Сценарии интеграции (5 тестов)
- ✅ `test_modbus_integration.py` – integration тесты InMemoryDataStore (18 тестов)
  - FC01-FC06 чтение/запись через datastore
  - FC15-FC16 множественная запись
  - Комплексные сценарии

**TODO:**
- Unit тесты для `signal_generators.py`
- Integration тесты для Signal Generator Engine
- Unit тесты для storage модулей (сложная интеграция с AppConfig)
- E2E тесты с реальным Modbus TCP клиентом

### Frontend (текущее состояние)

- ✅ `converters.test.ts` – все функции конвертации форматов (60+ тестов)
- ✅ `usePolling.test.ts` – хук периодического опроса (6 тестов)
- ✅ `useCollapse.test.ts` – хук управления сворачиванием (6 тестов)

**TODO:**
- Unit тесты для formatters.ts
- Unit тесты для generators/utils.ts
- Component тесты для shared UI компонентов (Button, Input, RadioGroup, NumericField)
- Integration тесты для Context providers
- E2E тесты для критичных пользовательских сценариев (Playwright)

## Отладка тестов

### Backend

Запуск одного теста:
```bash
pytest tests/test_encoding_utils.py::TestEncodeInt16::test_encode_positive_number -v
```

Запуск с отладочным выводом:
```bash
pytest tests/ -v -s
```

Запуск с PDB debugger:
```bash
pytest tests/ --pdb
```

### Frontend

Запуск одного теста:
```bash
npm test -- converters.test.ts -t "должен конвертировать положительные числа"
```

Watch mode для автоматического перезапуска:
```bash
npm test -- --watch
```

## Известные проблемы

1. **Backend тесты генераторов используют `time.sleep()`** для ожидания фоновых обновлений. Это замедляет тесты, но необходимо для проверки реального поведения движка.

2. **Frontend тесты требуют пересборки Docker образа** после изменения `package.json`. В локальной разработке используйте `npm test` напрямую.

3. **Storage модули тесно связаны с AppConfig**, что усложняет unit-тестирование. Текущие API тесты покрывают storage косвенно.

## Лучшие практики

### Backend

- Используйте `conftest.py` для создания временной DATA_DIR
- Все тесты должны быть изолированы и независимы
- Используйте `TestClient` для тестирования API endpoints
- Type hints обязательны для всех тестовых функций

### Frontend

- Используйте `@testing-library/react` для компонентных тестов
- Избегайте тестирования implementation details
- Тестируйте поведение, а не внутреннюю структуру
- Используйте `vi.fn()` для мокирования функций
- Используйте `vi.useFakeTimers()` для тестирования таймеров

## Производительность тестов

### Backend

- Все тесты (8 файлов, 94 теста): ~0.8 секунды
- `test_encoding_utils.py` (22 теста): ~0.03 секунды
- `test_modbus_core.py` (41 тест): ~0.05 секунды
- `test_modbus_integration.py` (18 тестов): ~0.15 секунды
- `test_generators_api.py` (с sleep): ~0.3 секунды

### Frontend

- Все тесты (3 файла, 70+ тестов): ~1-2 секунды
- `converters.test.ts`: ~0.5 секунды
- `hooks/`: ~0.2 секунды

## Ресурсы

- [pytest документация](https://docs.pytest.org/)
- [Vitest документация](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
