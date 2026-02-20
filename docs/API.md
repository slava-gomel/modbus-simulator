# REST API Documentation

Полная документация REST API для Modbus Simulator.

**Base URL:** `http://localhost:8000/api`  
**Swagger UI:** `http://localhost:8000/docs`  
**WebSocket URL:** `ws://localhost:8000/ws/{channel}`

## Authentication

Опциональная HTTP Basic Auth. Настраивается через переменные окружения:

```bash
export MB_AUTH_USER=admin
export MB_AUTH_PASS=secret
```

При 401 ответе frontend автоматически показывает форму авторизации.

---

## WebSocket Real-time Communication

Для real-time обновлений используются WebSocket соединения. Подробная документация в [WEBSOCKET.md](WEBSOCKET.md).

### Endpoints

- **`/ws/registers`** - обновления регистров
- **`/ws/server`** - статус сервера и Modbus лог
- **`/ws/generators`** - значения генераторов сигналов

### Пример подключения

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/registers');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Event:', message.event);
  console.log('Data:', message.data);
};

// Keep-alive
setInterval(() => ws.send('ping'), 30000);
```

См. [WEBSOCKET.md](WEBSOCKET.md) для полной документации по форматам событий и использованию.

---

## REST Endpoints

### Config - Конфигурация Modbus

#### GET `/config`
Получить текущую конфигурацию.

**Response 200:**
```json
{
  "host": "0.0.0.0",
  "port": 502,
  "unit_id": 1,
  "coils_size": 100,
  "discrete_inputs_size": 100,
  "holding_registers_size": 100,
  "input_registers_size": 100
}
```

#### PUT `/config`
Обновить конфигурацию.

**Request Body:**
```json
{
  "host": "0.0.0.0",
  "port": 502,
  "unit_id": 1,
  "coils_size": 200,
  "discrete_inputs_size": 200,
  "holding_registers_size": 200,
  "input_registers_size": 200
}
```

**Response 200:** Обновлённая конфигурация (как GET).

---

### State - Регистры

#### GET `/state/{kind}`
Прочитать диапазон регистров.

**Path Parameters:**
- `kind`: `coils`, `discrete_inputs`, `holding`, `input`

**Query Parameters:**
- `start` (int): Начальный адрес
- `count` (int): Количество регистров

**Example:**
```
GET /state/holding?start=0&count=10
```

**Response 200:**
```json
{
  "kind": "holding",
  "start": 0,
  "values": [0, 100, 200, 300, ...]
}
```

**Errors:**
- `400`: Недопустимый `kind` или параметры
- `500`: Ошибка чтения

#### PUT `/state/{kind}`
Записать одно значение.

**Path Parameters:**
- `kind`: `coils`, `holding` (только записываемые)

**Query Parameters:**
- `start` (int): Адрес регистра
- `value` (int): Значение (0-65535 для holding, 0-1 для coils)

**Example:**
```
PUT /state/holding?start=5&value=1234
```

**Response 200:**
```json
{
  "kind": "holding",
  "start": 5,
  "values": [1234]
}
```

**Errors:**
- `400`: Недопустимый адрес или значение
- `500`: Ошибка записи

#### PUT `/state/{kind}/batch`
Пакетная запись регистров.

**Path Parameters:**
- `kind`: `coils`, `holding`

**Request Body:**
```json
{
  "start": 0,
  "count": 3,
  "values": [100, 200, 300]
}
```

**Response 200:**
```json
{
  "kind": "holding",
  "start": 0,
  "values": [100, 200, 300]
}
```

**Errors:**
- `400`: Размер `values` не совпадает с `count`
- `500`: Ошибка записи

---

### Generators - Генераторы сигналов

#### GET `/generators`
Получить список генераторов.

**Response 200:**
```json
{
  "generators": [
    {
      "id": "gen-1",
      "enabled": true,
      "name": "Temperature",
      "register_kind": "holding",
      "start_address": 10,
      "register_count": 2,
      "data_type": "float32",
      "wave_type": "sine",
      "amplitude": 10.0,
      "offset": 20.0,
      "frequency_hz": 0.1,
      "update_period_ms": 500,
      "neon_color": "#00ff88"
    }
  ]
}
```

#### PUT `/generators`
Сохранить конфигурацию генераторов (полная замена).

**Request Body:**
```json
{
  "generators": [
    {
      "id": "gen-1",
      "enabled": true,
      "name": "Temperature",
      "register_kind": "holding",
      "start_address": 10,
      "register_count": 2,
      "data_type": "float32",
      "wave_type": "sine",
      "amplitude": 10.0,
      "offset": 20.0,
      "frequency_hz": 0.1,
      "update_period_ms": 500,
      "neon_color": "#00ff88"
    }
  ]
}
```

**Response 200:** Сохранённая конфигурация (как GET).

**Параметры генератора:**
- `wave_type`: `sine`, `saw`, `square`, `constant`
- `data_type`: `int16`, `float32`, `float64`
- `register_count`: автоматически 1/2/4 в зависимости от `data_type`
- `register_kind`: область регистров, в которую пишет генератор: `holding` (FC03/06) или `input` (FC04, только чтение со стороны Modbus клиента; запись выполняется через REST/генераторы)

---

### Profiles - Профили

#### GET `/profiles`
Список всех профилей.

**Response 200:**
```json
[
  {
    "name": "default",
    "slug": "default",
    "comment": "Профиль по умолчанию"
  },
  {
    "name": "Production",
    "slug": "production",
    "comment": "Рабочая конфигурация"
  }
]
```

#### POST `/profiles`
Создать новый профиль из текущего состояния.

**Request Body:**
```json
{
  "name": "My Profile",
  "comment": "Описание профиля"
}
```

**Response 200:**
```json
{
  "slug": "my_profile",
  "name": "My Profile"
}
```

#### POST `/profiles/{slug}/load`
Загрузить профиль (применить конфигурацию и состояние).

**Path Parameters:**
- `slug`: Идентификатор профиля

**Response 200:**
```json
{
  "slug": "my_profile",
  "loaded": true
}
```

**Errors:**
- `404`: Профиль не найден

#### POST `/profiles/{slug}/update`
Обновить существующий профиль из текущего состояния.

**Path Parameters:**
- `slug`: Идентификатор профиля

**Request Body (опционально):**
```json
{
  "comment": "Обновлённое описание"
}
```

**Response 200:**
```json
{
  "slug": "my_profile",
  "updated": true
}
```

**Errors:**
- `404`: Профиль не найден

#### DELETE `/profiles/{slug}`
Удалить профиль.

**Path Parameters:**
- `slug`: Идентификатор профиля

**Response 204:** No content

**Errors:**
- `404`: Профиль не найден

---

### Server - Управление Modbus сервером

#### GET `/server/status`
Получить статус сервера.

**Response 200:**
```json
{
  "running": true,
  "host": "0.0.0.0",
  "port": 502,
  "error": null
}
```

#### POST `/server/start`
Запустить Modbus TCP сервер.

**Response 200:**
```json
{
  "running": true,
  "host": "0.0.0.0",
  "port": 502,
  "error": null
}
```

**Errors:**
- `500`: Ошибка запуска (порт занят и т.п.)

#### POST `/server/stop`
Остановить сервер.

**Response 200:**
```json
{
  "running": false,
  "host": "0.0.0.0",
  "port": 502,
  "error": null
}
```

#### GET `/server/modbus_log`
Получить события Modbus (для логирования).

**Query Parameters:**
- `since` (int): ID последнего события (для polling)

**Response 200:**
```json
{
  "events": [
    {
      "id": 1,
      "type": "modbus_request",
      "message": "FC03 read holding, start=0, count=10",
      "time": "2024-01-15T12:34:56.789Z",
      "kind": "holding",
      "start": 0,
      "count": 10
    }
  ],
  "next_id": 2
}
```

---

### Auth - Авторизация

#### GET `/auth/required`
Проверить, требуется ли авторизация.

**Response 200:**
```json
{
  "required": true
}
```

---

## Error Responses

### Общий формат ошибки

```json
{
  "detail": "Описание ошибки"
}
```

### HTTP Status Codes

- `200` OK — Успешный запрос
- `204` No Content — Успешное удаление
- `400` Bad Request — Неверные параметры
- `401` Unauthorized — Требуется авторизация
- `404` Not Found — Ресурс не найден
- `500` Internal Server Error — Внутренняя ошибка сервера

---

## WebSocket (Future)

Планируется добавить WebSocket endpoint для real-time обновлений:

```
ws://localhost:8000/ws
```

События:
- `register_change`: Изменение регистра
- `generator_update`: Обновление значения генератора
- `modbus_event`: Modbus операция

---

## Rate Limiting

В текущей версии отсутствует rate limiting. Для production рекомендуется:

- Nginx reverse proxy с `limit_req`
- Slowapi middleware для FastAPI

---

## CORS

Разрешены все origins (`*`) в dev режиме. Для production настройте whitelist в `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    ...
)
```

---

## Testing API

### cURL Examples

```bash
# Получить конфигурацию
curl http://localhost:8000/api/config

# Прочитать holding-регистры
curl "http://localhost:8000/api/state/holding?start=0&count=10"

# Прочитать input-регистры
curl "http://localhost:8000/api/state/input?start=0&count=10"

# Записать значение в holding или input-регистр через REST
curl -X PUT "http://localhost:8000/api/state/holding?start=5&value=1234"
curl -X PUT "http://localhost:8000/api/state/input?start=5&value=4321"

# Пакетная запись в holding или input
curl -X PUT http://localhost:8000/api/state/holding/batch \
  -H "Content-Type: application/json" \
  -d '{"start":0,"count":3,"values":[100,200,300]}'

curl -X PUT http://localhost:8000/api/state/input/batch \
  -H "Content-Type: application/json" \
  -d '{"start":0,"count":3,"values":[10,20,30]}'

# Запустить сервер
curl -X POST http://localhost:8000/api/server/start

# С авторизацией
curl -u admin:secret http://localhost:8000/api/config
```

### Postman Collection

Импортируйте OpenAPI spec из Swagger UI:
```
http://localhost:8000/openapi.json
```

---

## Changelog

### v1.0.0
- Initial API release
- CRUD для конфигурации, регистров, профилей
- Генераторы сигналов
- Управление сервером
