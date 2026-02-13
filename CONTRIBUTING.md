# Contributing Guide

Спасибо за интерес к проекту Modbus Simulator! Этот документ поможет вам начать разработку.

## Содержание

- [Setup окружения](#setup-окружения)
- [Структура проекта](#структура-проекта)
- [Code Style](#code-style)
- [Git workflow](#git-workflow)
- [Testing](#testing)
- [Отправка изменений](#отправка-изменений)

## Setup окружения

### Требования

- Node.js 18+ и npm 9+
- Python 3.11+
- Docker и Docker Compose (опционально)

### Локальная разработка

#### Frontend

```bash
cd frontend
npm install
npm run dev  # Запуск dev сервера (Vite)
```

Доступно на `http://localhost:5173`

#### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Доступно на `http://localhost:8000`

#### Docker (рекомендуется)

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

## Структура проекта

### Frontend

```
frontend/src/
├── api/               # Модульные API клиенты
│   ├── client.ts      # Axios instance
│   ├── types.ts       # API типы
│   ├── registers.ts   # Endpoints для регистров
│   └── index.ts       # Barrel export
├── features/          # Feature-based modules
│   ├── registers/
│   │   ├── RegistersContext.tsx
│   │   ├── RegistersPanel.tsx
│   │   ├── converters.ts    # Бизнес-логика
│   │   └── formatters.ts
│   └── ...
├── shared/
│   ├── components/    # Переиспользуемые UI
│   ├── hooks/         # Custom hooks
│   ├── types/         # Общие типы
│   └── constants.ts
└── App.tsx
```

### Backend

```
backend/app/
├── api/               # FastAPI роуты
│   ├── config_api.py
│   ├── state_api.py
│   └── ...
├── storage/           # Модульная система хранения
│   ├── base.py
│   ├── config.py
│   ├── state.py
│   └── profiles.py
├── modbus_core.py     # Ядро Modbus симулятора
├── signal_generators.py
└── main.py
```

## Code Style

### Frontend (TypeScript/React)

#### Naming conventions

- **Components**: PascalCase (`RegistersPanel.tsx`)
- **Files**: camelCase для утилит (`converters.ts`)
- **Hooks**: camelCase с префиксом `use` (`usePolling`)
- **Types/Interfaces**: PascalCase (`RegisterKind`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_PORT`)

#### Правила

```typescript
// ✅ Good
export const Button: React.FC<ButtonProps> = ({ variant, children }) => {
  return <button className={`btn btn-${variant}`}>{children}</button>;
};

// ❌ Bad
export function button(props: any) {
  return <button>{props.children}</button>;
}
```

- Используйте `React.FC` для функциональных компонентов
- Предпочитайте `const` стрелочные функции
- Экспортируйте типы вместе с компонентами
- Используйте `React.memo` для оптимизации

#### Imports порядок

```typescript
// 1. External libraries
import React, { useState } from "react";
import axios from "axios";

// 2. Internal modules (absolute imports)
import { useRegisters } from "@/features/registers";
import { Button } from "@/shared/components";

// 3. Relative imports
import { formatValue } from "./formatters";
import "./styles.css";
```

#### TypeScript

- Избегайте `any`, используйте конкретные типы или `unknown`
- Предпочитайте `interface` для объектов, `type` для unions
- Используйте строгий режим (`strict: true`)

### Backend (Python)

#### Style guide

Следуем **PEP 8** и **PEP 484** (type hints).

```python
# ✅ Good
def fetch_registers(
    kind: RegisterKind,
    start: int,
    count: int
) -> RegisterRangeResponse:
    """Fetch register range from Modbus core."""
    pass

# ❌ Bad
def fetch(kind, start, count):
    pass
```

#### Naming conventions

- **Modules**: snake_case (`modbus_core.py`)
- **Classes**: PascalCase (`ModbusSimulatorCore`)
- **Functions/methods**: snake_case (`read_coils`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_PORT`)

#### Docstrings

Используйте Google style:

```python
def save_profile(name: str, core: ModbusSimulatorCore) -> str:
    """Сохранить новый профиль конфигурации.
    
    Args:
        name: Имя профиля.
        core: Экземпляр ModbusSimulatorCore.
    
    Returns:
        Slug сохранённого профиля.
    
    Raises:
        ValueError: Если имя профиля пустое.
    """
    pass
```

#### Imports порядок

```python
# 1. Стандартная библиотека
from __future__ import annotations
import json
import logging

# 2. Сторонние библиотеки
import yaml
from fastapi import APIRouter

# 3. Локальные модули
from .config import AppConfig
from .modbus_core import ModbusSimulatorCore
```

## Git workflow

### Branching strategy

```
main                 # Стабильная версия
├── feature/xxx      # Новые фичи
├── fix/xxx          # Исправления багов
└── refactor/xxx     # Рефакторинг
```

### Commit messages

Формат: `type(scope): subject`

**Типы:**
- `feat`: Новая фича
- `fix`: Исправление бага
- `refactor`: Рефакторинг без изменения функциональности
- `docs`: Документация
- `style`: Форматирование, пробелы
- `test`: Добавление тестов
- `chore`: Обслуживание, зависимости

**Примеры:**

```
feat(registers): add INT64 format support
fix(generators): correct FLOAT32 byte order
refactor(storage): split into separate modules
docs(api): update REST endpoints documentation
```

### Pull Request процесс

1. **Создайте feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Сделайте изменения и commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Убедитесь, что код компилируется**
   ```bash
   # Frontend
   cd frontend && npm run build
   
   # Backend
   cd backend && python3 -m py_compile app/**/*.py
   ```

4. **Push и создайте PR**
   ```bash
   git push origin feature/my-feature
   ```

5. **В PR укажите:**
   - Описание изменений
   - Связанные issue (если есть)
   - Скриншоты для UI изменений
   - Checklist для тестирования

## Testing

### Frontend

#### Unit тесты (Vitest)

```typescript
// converters.test.ts
import { describe, it, expect } from 'vitest';
import { convertToInt16 } from './converters';

describe('convertToInt16', () => {
  it('converts valid signed number', () => {
    const result = convertToInt16('-100', 'signed');
    expect(result.registers).toEqual([65436]);
    expect(result.error).toBeUndefined();
  });
});
```

Запуск:
```bash
npm test
npm test -- --coverage  # С покрытием
```

### Backend

#### Unit тесты (pytest)

```python
# tests/test_storage.py
def test_config_storage_load():
    cfg = AppConfig()
    storage = ConfigStorage(cfg)
    storage.load_config()
    assert cfg.modbus.port == 502
```

Запуск:
```bash
pytest
pytest --cov=app  # С покрытием
```

#### Integration тесты

```python
# tests/test_api.py
def test_fetch_registers(client):
    response = client.get("/api/state/holding?start=0&count=10")
    assert response.status_code == 200
    assert "values" in response.json()
```

## Отправка изменений

### Checklist перед PR

- [ ] Код компилируется без ошибок
- [ ] Тесты проходят (если есть)
- [ ] Добавлена документация для новых API
- [ ] Соблюдён code style
- [ ] Commit messages соответствуют формату
- [ ] PR описание заполнено

### Review процесс

1. Автоматические проверки (CI, если настроен)
2. Code review от мейнтейнера
3. Внесение правок (если требуется)
4. Merge в main

### После merge

- Обновите локальный main:
  ```bash
  git checkout main
  git pull origin main
  ```
- Удалите feature branch:
  ```bash
  git branch -d feature/my-feature
  ```

## Architecture принципы

### Frontend

1. **Feature isolation**: Каждая фича — отдельная папка с Context, компонентами и утилитами
2. **Shared first**: Переиспользуемые компоненты в `shared/components`
3. **Single source of truth**: State в Context, не дублировать в компонентах
4. **Type everything**: Строгая типизация без `any`

### Backend

1. **Single Responsibility**: Один модуль — одна задача
2. **Dependency injection**: Передача зависимостей явно
3. **Type hints everywhere**: Аннотации для всех функций
4. **Graceful errors**: Обработка исключений с понятными сообщениями

## Error handling паттерны

### Frontend

```typescript
try {
  const data = await fetchRegisters("holding", 0, 10);
  setValues(data.values);
} catch (e) {
  const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
  setError(msg);
  pushLog("error", msg);
}
```

### Backend

```python
try:
    core.write_coils(start, values)
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    logger.exception("Unexpected error")
    raise HTTPException(status_code=500, detail="Internal error")
```

## Вопросы и помощь

- **Issues**: GitHub Issues для багов и feature requests
- **Discussions**: GitHub Discussions для вопросов
- **Документация**: См. [ARCHITECTURE.md](./ARCHITECTURE.md)

Спасибо за вклад! 🚀
