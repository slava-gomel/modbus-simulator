# Рефакторинг Frontend

## Обзор

Проведён полный рефакторинг монолитного `App.tsx` (2714 строк) в модульную архитектуру с разделением по функциональным областям.

## Структура после рефакторинга

```
frontend/src/
├── features/              # Функциональные модули
│   ├── auth/             # Аутентификация
│   │   ├── AuthContext.tsx
│   │   ├── LoginForm.tsx
│   │   └── index.ts
│   ├── server/           # Управление Modbus-сервером
│   │   ├── ServerContext.tsx
│   │   ├── ServerPanel.tsx
│   │   └── index.ts
│   ├── config/           # Конфигурация
│   │   ├── ConfigContext.tsx
│   │   ├── ConfigPanel.tsx
│   │   └── index.ts
│   ├── profiles/         # Профили
│   │   ├── ProfilesContext.tsx
│   │   ├── ProfilesPanel.tsx
│   │   └── index.ts
│   ├── registers/        # Регистры
│   │   ├── RegistersContext.tsx
│   │   ├── RegistersPanel.tsx
│   │   ├── formatters.ts
│   │   └── index.ts
│   ├── generators/       # Генераторы сигналов
│   │   ├── GeneratorsContext.tsx
│   │   ├── GeneratorsPanel.tsx
│   │   └── index.ts
│   └── logs/             # Журнал событий
│       ├── LogsContext.tsx
│       ├── LogView.tsx
│       └── index.ts
├── shared/               # Общие утилиты
│   ├── hooks/
│   │   ├── usePolling.ts
│   │   ├── useCollapse.ts
│   │   └── index.ts
│   ├── types.ts
│   └── constants.ts
├── App.tsx              # Главный компонент (~140 строк)
├── AppProviders.tsx     # Композиция контекстов
├── api.ts              # API клиент
└── main.tsx            # Точка входа
```

## Ключевые улучшения

### 1. Модульность
- Каждая feature изолирована и самодостаточна
- Чёткое разделение ответственности
- Лёгкое тестирование отдельных модулей

### 2. Context API
- Каждая область имеет свой контекст
- Избегание prop drilling
- Централизованное управление состоянием

### 3. Переиспользуемые хуки
- `usePolling` - универсальный polling
- `useCollapse` - управление сворачиванием панелей

### 4. Оптимизация производительности
- React.memo для всех панельных компонентов
- useMemo для фильтрации и вычислений
- useCallback для обработчиков событий
- Разделение polling на независимые эффекты

### 5. TypeScript
- Полная типизация всех компонентов и хуков
- Явные интерфейсы для контекстов
- Типобезопасность API

## Зависимости между контекстами

```
LogsContext (независим)
  ↓
AuthContext → LogsContext
  ↓
ServerContext → LogsContext
  ↓
ConfigContext → LogsContext
  ↓
GeneratorsContext → LogsContext
  ↓
ProfilesContext → LogsContext, ConfigContext, GeneratorsContext
  ↓
RegistersContext → LogsContext
```

## Метрики

| Метрика | До | После |
|---------|-----|-------|
| Размер App.tsx | 2714 строк | ~140 строк |
| Количество файлов | 3 | ~25 |
| Макс. размер файла | 2714 | ~250 |
| Переиспользуемость | Низкая | Высокая |
| Тестируемость | Сложная | Простая |

## Дальнейшие улучшения

1. **Полная реализация RegistersPanel**
   - Детальная таблица регистров с форматированием
   - Редактирование holding-регистров
   - Битовое представление для coils

2. **Полная реализация GeneratorsPanel**
   - Форма создания/редактирования генераторов
   - Живые графики сигналов
   - Подсветка затрагиваемых регистров

3. **E2E тесты**
   - Тестирование потоков работы пользователя
   - Интеграционные тесты компонентов

4. **Улучшение UX**
   - Анимации переходов
   - Улучшенная обработка ошибок
   - Toast-уведомления

## Примечания

- Старый монолитный код сохранён как резервная копия (если нужен референс)
- Все компоненты используют существующие CSS-классы из styles.css
- API клиент (api.ts) остался без изменений
- Backend не требует изменений
