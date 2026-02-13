# Performance Guide - Modbus Simulator

Руководство по оптимизации производительности и настройке частоты обновлений.

## WebSocket Real-time Updates

### Частота обновлений

**Генераторы сигналов:**
- **Столбец "Значение"**: обновляется каждые ~100ms через `/ws/generators`
- **Регистры**: обновляются с той же частотой через `/ws/registers`
- **Графики**: обновляются каждые ~100ms с новыми точками данных

### Как работает синхронизация

1. **Backend цикл** (20ms):
   - Движок генераторов проверяет каждые 20ms, нужно ли обновить генераторы
   - Если генератор имеет `update_period_ms = 100`, он обновляется каждые ~100ms
   - Все обновления за цикл собираются в batch

2. **WebSocket broadcast** (100ms):
   - Значения генераторов: каждые 100ms → `/ws/generators`
   - Изменения регистров: при каждом обновлении → `/ws/registers` (batch)

3. **Frontend обновление** (мгновенное):
   - Получает WebSocket события
   - Обновляет состояние локально без HTTP запросов
   - React батчит обновления для оптимальной производительности

## Настройка частоты обновлений

### Для более быстрых обновлений

Если вам нужны обновления чаще чем 100ms:

1. **Уменьшите `update_period_ms` генератора:**
   ```typescript
   // В GeneratorForm.tsx при создании генератора
   update_period_ms: 50  // Обновления каждые 50ms
   ```

2. **Учтите нагрузку:**
   - `update_period_ms = 50ms` → ~20 обновлений/сек
   - `update_period_ms = 20ms` → ~50 обновлений/сек
   - Слишком частые обновления могут нагрузить CPU

### Для меньшей нагрузки

Если у вас много генераторов и нужно снизить нагрузку:

1. **Увеличьте `update_period_ms`:**
   ```typescript
   update_period_ms: 200  // Обновления каждые 200ms
   ```

2. **Увеличьте `base_sleep` в backend** (требует изменения кода):
   ```python
   # В signal_generators.py
   base_sleep = 0.05  # 50ms вместо 20ms
   ```

## Производительность по компонентам

### Backend

| Компонент | Частота | Нагрузка |
|-----------|---------|----------|
| Генераторы (цикл) | 20ms | Низкая (проверка условий) |
| Генераторы (обновление) | 100ms* | Средняя (математика + запись) |
| WebSocket broadcast (generators) | 100ms | Низкая (JSON serialize) |
| WebSocket broadcast (registers) | По событию | Низкая (batch) |

\* Зависит от `update_period_ms` каждого генератора

### Frontend

| Компонент | Частота | Нагрузка |
|-----------|---------|----------|
| WebSocket события | 100ms | Низкая (JSON parse) |
| React re-renders | По событию | Низкая (React.memo) |
| График обновления | 100ms | Средняя (SVG render) |

### Network

| Событие | Размер | Частота |
|---------|--------|---------|
| generator_values | ~200-500 bytes | 100ms |
| registers_changed | ~100-300 bytes | По обновлению |
| Общий трафик | ~3-8 KB/sec | При 1-3 генераторах |

## Оптимизации

### ✅ Реализованные

1. **Batch обновления регистров** - все изменения за цикл в одном событии
2. **Группировка последовательных регистров** - эффективная передача данных
3. **Локальное обновление UI** - без HTTP запросов
4. **React.memo** - предотвращение лишних re-renders
5. **WebSocket connection pooling** - раздельные каналы

### 🔮 Возможные улучшения

1. **Throttling для множественных генераторов:**
   - При >10 генераторах: уменьшить частоту broadcast
   - Адаптивная частота на основе нагрузки

2. **Delta updates:**
   - Отправлять только изменённые значения
   - Экономия трафика для больших диапазонов регистров

3. **Binary WebSocket:**
   - Использовать binary frames вместо JSON
   - Уменьшение размера сообщений на ~50%

## Troubleshooting

### Проблема: Регистры обновляются медленнее графиков

**Причина:** Генераторы имеют разные `update_period_ms`

**Решение:**
1. Проверьте `update_period_ms` всех генераторов
2. Убедитесь, что значения одинаковые (обычно 100ms)
3. Проверьте WebSocket соединение (ConnectionStatus banner)

### Проблема: Высокая нагрузка CPU

**Причина:** Слишком много генераторов или слишком низкий `update_period_ms`

**Решение:**
1. Увеличьте `update_period_ms` до 200ms или больше
2. Уменьшите количество одновременно работающих генераторов
3. Увеличьте `base_sleep` в `signal_generators.py`

### Проблема: Задержки в WebSocket

**Причина:** Сетевые проблемы или перегрузка сервера

**Решение:**
1. Проверьте latency: `ping localhost` (для локального)
2. Проверьте загрузку CPU/RAM сервера
3. Проверьте количество WebSocket соединений

## Benchmarks

### Локальная разработка

- **Латентность WebSocket:** < 5ms
- **Частота обновлений:** 100ms (стабильно)
- **CPU (backend):** ~5% при 3 генераторах
- **RAM (backend):** ~50MB

### Docker Compose

- **Латентность WebSocket:** 5-10ms
- **Частота обновлений:** 100ms (стабильно)
- **CPU (backend):** ~10% при 3 генераторах
- **RAM (backend):** ~100MB

### Production (рекомендации)

- **Max генераторов:** 20-30 на инстанс
- **Max клиентов:** 100-200 WebSocket соединений
- **Рекомендуемое железо:** 2 CPU cores, 2GB RAM
- **Scale strategy:** Horizontal scaling с load balancer

## Мониторинг

### Backend логи

```bash
# Смотреть производительность генераторов
docker compose logs backend | grep "generator"

# Смотреть WebSocket активность
docker compose logs backend | grep "WebSocket"
```

### Frontend DevTools

```javascript
// В консоли браузера - проверить WebSocket события
const ws = performance.getEntriesByType('resource')
  .filter(r => r.name.includes('ws://'));
console.log('WebSocket connections:', ws.length);
```

### Метрики

Добавьте в код для отладки:

```python
# В signal_generators.py
import time

cycle_times = []
start = time.time()
# ... код цикла ...
cycle_times.append(time.time() - start)
if len(cycle_times) > 100:
    avg = sum(cycle_times) / len(cycle_times)
    print(f"Average cycle time: {avg*1000:.2f}ms")
    cycle_times.clear()
```
