# Frontend Testing Setup

## Установка зависимостей для тестирования

После обновления `package.json` с зависимостями Vitest необходимо установить их:

```bash
cd frontend
npm install
```

## Новые зависимости

Добавлены следующие dev-зависимости:

- `vitest` – быстрый test runner для Vite
- `@vitest/ui` – UI интерфейс для Vitest
- `jsdom` – окружение для тестов (эмуляция браузера)
- `@testing-library/react` – утилиты для тестирования React компонентов
- `@testing-library/jest-dom` – дополнительные matchers для DOM

## Структура тестов

```
frontend/src/
├── features/
│   └── registers/
│       ├── converters.ts
│       └── converters.test.ts       # Тесты конвертации форматов
├── shared/
│   └── hooks/
│       ├── usePolling.ts
│       ├── usePolling.test.ts       # Тесты хука polling
│       ├── useCollapse.ts
│       └── useCollapse.test.ts      # Тесты хука collapse
└── test/
    └── setup.ts                      # Настройка тестового окружения
```

## Запуск тестов

### Локально (без Docker)

```bash
cd frontend

# Все тесты
npm test

# Watch mode (автоматический перезапуск)
npm test -- --watch

# UI интерфейс
npm run test:ui

# С покрытием кода
npm run test:coverage
```

### В Docker

⚠️ **Важно:** После изменения `package.json` необходимо пересобрать Docker образ:

```bash
# Из корня проекта
docker compose build frontend

# Запустить тесты
docker compose run --rm frontend npm test
```

## Написание тестов

### Пример теста для функции

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('должна возвращать правильный результат', () => {
    const result = myFunction(42);
    expect(result).toBe(84);
  });
});
```

### Пример теста для хука

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('должен обновлять состояние', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.update(42);
    });
    
    expect(result.current.value).toBe(42);
  });
});
```

### Пример теста для компонента

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('должен отображать текст', () => {
    render(<MyComponent text="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Покрытие тестами

### Реализовано

- ✅ **converters.test.ts** (60+ тестов)
  - INT16 (unsigned/signed)
  - BITMAP (decimal/binary)
  - INT32/INT64 (ABCD/CDAB порядок)
  - FLOAT32/FLOAT64 (высокая точность)
  - Валидация ввода

- ✅ **usePolling.test.ts** (6 тестов)
  - Периодический вызов callback
  - Остановка при unmount
  - Обновление callback
  - Изменение интервала
  - Отключение polling (null)

- ✅ **useCollapse.test.ts** (6 тестов)
  - Инициализация состояния
  - Toggle переключение
  - Явная установка состояния
  - Свёртывание/развёртывание
  - Независимость экземпляров

### TODO

- Unit тесты для `formatters.ts` (отображение значений)
- Unit тесты для `generators/utils.ts` (графики, подсветка)
- Component тесты для shared UI:
  - `Button.tsx`
  - `Input.tsx`
  - `RadioGroup.tsx`
  - `NumericField.tsx`
- Integration тесты для Context providers:
  - `RegistersContext.tsx`
  - `GeneratorsContext.tsx`
  - `ProfilesContext.tsx`
- E2E тесты (Playwright):
  - Редактирование регистров
  - Создание генератора
  - Сохранение профиля

## Отладка

### Использование debugger

```typescript
import { describe, it, expect } from 'vitest';

describe('myTest', () => {
  it('should work', () => {
    debugger; // Точка останова
    expect(true).toBe(true);
  });
});
```

Запустите с флагом `--inspect`:

```bash
npm test -- --inspect
```

### Вывод в консоль

```typescript
it('should log something', () => {
  console.log('Debug info:', someValue);
  expect(someValue).toBeDefined();
});
```

### Использование vi.fn() для мокирования

```typescript
import { vi } from 'vitest';

it('should call callback', () => {
  const callback = vi.fn();
  
  myFunction(callback);
  
  expect(callback).toHaveBeenCalled();
  expect(callback).toHaveBeenCalledWith(42);
});
```

## Производительность

- Все тесты (3 файла, 70+ тестов): ~1-2 секунды
- `converters.test.ts`: ~0.5 секунды
- `hooks/`: ~0.2 секунды

Vitest использует многопоточность и кэширование, что делает тесты очень быстрыми.

## CI/CD Integration

### GitHub Actions пример

```yaml
- name: Setup Node
  uses: actions/setup-node@v3
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json

- name: Install dependencies
  working-directory: frontend
  run: npm ci

- name: Run tests
  working-directory: frontend
  run: npm test

- name: Generate coverage
  working-directory: frontend
  run: npm run test:coverage
```

## Troubleshooting

### Тесты не находятся

Убедитесь, что файлы имеют суффикс `.test.ts` или `.spec.ts`.

### Ошибка "Cannot find module"

Установите зависимости:

```bash
npm install
```

### Timeout ошибки

Увеличьте timeout для медленных тестов:

```typescript
it('slow test', () => {
  // test code
}, 10000); // 10 секунд
```

## Ресурсы

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
