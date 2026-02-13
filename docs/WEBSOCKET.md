# WebSocket Real-time Communication

Этот документ описывает WebSocket архитектуру для real-time обновлений в modbud_simulator.

## Обзор

WebSocket заменил HTTP polling для обеспечения мгновенных обновлений между backend и frontend. Используется архитектура с раздельными каналами для разных типов данных.

## Архитектура

### Backend

**WebSocket Manager** (`backend/app/websocket_manager.py`):
- Централизованное управление соединениями
- Раздельные пулы для каждого канала (registers, server, generators)
- Автоматическая очистка отключенных соединений
- Thread-safe операции с asyncio.Lock

**WebSocket Endpoints** (`backend/app/api/websocket_api.py`):
- `/ws/registers` - обновления регистров
- `/ws/server` - статус сервера и Modbus лог
- `/ws/generators` - значения генераторов сигналов

### Frontend

**WebSocketContext** (`frontend/src/features/websocket/WebSocketContext.tsx`):
- Управление WebSocket соединениями
- Автоматическое переподключение с exponential backoff
- Подписка/отписка на события
- Отслеживание статуса соединений

**useWebSocket Hook** (`frontend/src/shared/hooks/useWebSocket.ts`):
- Удобный интерфейс для подписки на события
- Автоматическая отписка при размонтировании компонента

## Формат событий

Все WebSocket сообщения имеют единый формат:

```json
{
  "event": "event_name",
  "data": { ... }
}
```

### Канал: /ws/registers

#### Событие: registers_changed

Отправляется при изменении значений регистров (через API, Modbus или генераторы).

```json
{
  "event": "registers_changed",
  "data": {
    "kind": "holding",
    "start": 0,
    "count": 10,
    "values": [100, 200, 300, ...]
  }
}
```

**Поля:**
- `kind` - тип регистров ("coils", "holding", "discrete_inputs", "input")
- `start` - начальный адрес
- `count` - количество регистров
- `values` - массив значений

**Триггеры:**
- PUT `/api/state/{kind}` - одиночная запись
- PUT `/api/state/{kind}/batch` - множественная запись
- Modbus запись (FC05, FC06, FC15, FC16)
- **Обновление генератором сигналов** (каждое обновление генератора = событие registers_changed)

**Оптимизация:** Начиная с версии WebSocket, обновления регистров от генераторов происходят мгновенно. Движок генераторов проверяет обновления каждые 20ms и отправляет batch WebSocket события со всеми изменёнными регистрами. Если несколько генераторов обновляют последовательные регистры, они группируются в одно событие. Frontend обновляет регистры локально без дополнительного HTTP запроса, что делает обновления такими же быстрыми, как и сами генераторы (~20-100ms в зависимости от update_period_ms).

### Канал: /ws/server

#### Событие: server_status

Отправляется при изменении статуса Modbus сервера.

```json
{
  "event": "server_status",
  "data": {
    "running": true,
    "host": "0.0.0.0",
    "port": 502,
    "error": null
  }
}
```

**Триггеры:**
- POST `/api/server/start`
- POST `/api/server/stop`

#### Событие: modbus_log

Отправляется при добавлении новых записей в Modbus лог.

```json
{
  "event": "modbus_log",
  "data": [
    {
      "id": 123,
      "type": "modbus_write",
      "message": "FC06: Запись в holding[10] = 999",
      "time": "2026-02-13T12:34:56.789Z",
      "kind": "holding",
      "start": 10,
      "count": 1
    }
  ]
}
```

**Триггеры:**
- Все Modbus операции (FC01-FC06, FC15-FC16)
- Подключение/отключение клиентов

### Канал: /ws/generators

#### Событие: generator_values

Отправляется периодически (~120ms) с текущими значениями всех активных генераторов.

```json
{
  "event": "generator_values",
  "data": {
    "generators": [
      {
        "id": "gen-123",
        "name": "sine1",
        "value": 512.5,
        "registers": [0, 1],
        "neon_color": "#3b82f6"
      }
    ]
  }
}
```

**Поля:**
- `id` - уникальный ID генератора
- `name` - имя генератора
- `value` - текущее значение сигнала (до кодирования)
- `registers` - массив затрагиваемых адресов регистров
- `neon_color` - цвет подсветки в UI

**Триггер:**
- Фоновый поток `SignalGeneratorEngine._run_loop()` каждые 100ms (синхронно с типичным update_period_ms генераторов)

## Reconnection Strategy

### Exponential Backoff

При разрыве соединения используется exponential backoff:

```
Attempt 1: 1000ms (1s)
Attempt 2: 2000ms (2s)
Attempt 3: 4000ms (4s)
Attempt 4: 8000ms (8s)
Attempt 5: 16000ms (16s)
Attempt 6+: 30000ms (30s)
```

### Keep-alive

Клиент отправляет `ping` каждые 30 секунд. Сервер отвечает `pong`.

```typescript
// Клиент
websocket.send("ping");

// Сервер
if (data === "ping") {
  await websocket.send_text("pong");
}
```

## UI индикатор статуса

`ConnectionStatus` компонент показывает banner при проблемах с соединением:

- **Красный:** Ошибка соединения
- **Оранжевый:** Переподключение
- **Синий:** Подключение

Banner скрывается автоматически при успешном подключении всех каналов.

## Использование в коде

### Backend: Broadcast события

```python
# В любом модуле с доступом к ws_manager
await ws_manager.broadcast("registers", {
    "event": "registers_changed",
    "data": {"kind": "holding", "start": 0, "count": 1, "values": [999]}
})
```

Из синхронного кода (threading):

```python
import asyncio

loop = asyncio.get_event_loop()
asyncio.run_coroutine_threadsafe(
    ws_manager.broadcast("generators", {...}),
    loop
)
```

### Frontend: Подписка на события

```typescript
import { useWebSocket } from "../../shared/hooks";

const MyComponent = () => {
  useWebSocket(
    "registers",
    (event, data) => {
      if (event === "registers_changed") {
        console.log("Registers updated:", data);
      }
    },
    [] // deps
  );
};
```

## Troubleshooting

### Проблема: Соединение не устанавливается

**Решение:**
1. Проверьте, что WebSocketProvider добавлен в App
2. Проверьте браузерную консоль на WebSocket errors
3. Убедитесь, что backend запущен и доступен

### Проблема: События не приходят

**Решение:**
1. Проверьте, что есть активная подписка на канал
2. Проверьте статус соединения через `connectionStatus`
3. Проверьте backend логи на ошибки broadcast

### Проблема: Частые переподключения

**Решение:**
1. Проверьте стабильность сети
2. Проверьте, нет ли ошибок в обработчиках событий
3. Увеличьте timeout для keep-alive

### Проблема: Высокая нагрузка на сеть

**Решение:**
1. Генераторы отправляют события каждые 120ms - это нормально
2. Для оптимизации можно увеличить интервал в `signal_generators.py`
3. Рассмотрите batching событий при большом количестве генераторов

## Performance

### Латентность

- **Локально:** < 5ms
- **Docker Compose:** 5-10ms
- **Сеть (LAN):** 10-50ms

### Overhead

- **Подключение:** ~1KB (WebSocket handshake)
- **Keep-alive:** ~10 bytes каждые 30s
- **Событие регистра:** ~100-200 bytes
- **Событие генератора:** ~150-300 bytes (зависит от количества)

### Масштабирование

Текущая реализация поддерживает:
- **Клиенты:** Сотни одновременных соединений
- **Каналы:** 3 канала на клиента
- **События:** Тысячи событий в секунду

Для production с > 1000 клиентов рекомендуется:
- Redis Pub/Sub для broadcast между worker'ами
- Load balancer с sticky sessions
- Rate limiting для защиты от DOS

## Тестирование

### Backend тесты

```bash
cd backend
pytest tests/test_websocket.py -v
```

### Frontend тесты

```bash
cd frontend
npm test -- WebSocketContext.test.tsx
```

### Manual тестирование

```bash
# wscat для ручного тестирования
npm install -g wscat

# Подключение к каналу
wscat -c ws://localhost:8000/ws/registers

# Отправка ping
> ping
< pong

# Изменение регистра в другом терминале
curl -X PUT "http://localhost:8000/api/state/holding?start=0&value=999"

# Получение события
< {"event":"registers_changed","data":{"kind":"holding","start":0,"count":1,"values":[999]}}
```

## Миграция с polling

Если нужно вернуться к polling:

1. Восстановить `usePolling` hook из git истории
2. Заменить `useWebSocket` на `usePolling` в Contexts
3. Восстановить polling константы в `constants.ts`
4. Восстановить endpoint `/api/server/modbus_log`

Однако WebSocket обеспечивает:
- ✅ Меньшую латентность (мгновенные обновления)
- ✅ Меньшую нагрузку на сервер (нет постоянных HTTP запросов)
- ✅ Лучший UX (нет задержек обновления)
- ✅ Меньший трафик (события отправляются только при изменениях)
