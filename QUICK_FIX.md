# 🚀 Быстрое исправление WebSocket

Если вы видите баннер "Переподключение к серверу..." и приложение не работает - следуйте этой инструкции.

## ⚡ Решение за 3 шага

### Шаг 1: Закройте все вкладки
Закройте **ВСЕ** вкладки браузера с `localhost:8080` или `127.0.0.1:8080`

### Шаг 2: Очистите кеш
**Вариант A** (рекомендуется):
1. Откройте браузер
2. Нажмите F12
3. **Правый клик** на кнопке обновления (↻)
4. Выберите **"Очистить кеш и жёсткая перезагрузка"**

**Вариант B** (если вариант A не помог):
1. F12 → Application tab
2. Storage → Clear site data
3. Нажмите "Clear site data"

**Вариант C** (самый простой):
- Откройте в **приватном окне**: Ctrl+Shift+N

### Шаг 3: Откройте приложение заново
```
http://localhost:8080
```

---

## ✅ Как проверить что всё работает

### В консоли браузера (F12 → Console):
```
WebSocket connected to channel: server
WebSocket connected to channel: registers
WebSocket connected to channel: generators
```

### На странице:
- ✅ Оранжевый баннер **ИСЧЕЗ**
- ✅ Кнопка "Запустить сервер" работает
- ✅ Профили загружаются
- ✅ Регистры редактируются

---

## 🔧 Если не помогло

### Проверка 1: Контейнеры работают?
```bash
docker compose ps
```

Ожидается:
```
NAME              STATUS
modbud_backend    Up
modbud_frontend   Up
```

### Проверка 2: Backend доступен?
```bash
curl http://localhost:8000/health
```

Ожидается: `{"status":"ok"}`

### Проверка 3: WebSocket работает?
```bash
python3 << 'EOF'
import asyncio, websockets
async def test():
    async with websockets.connect('ws://localhost:8080/ws/registers') as ws:
        await ws.send('ping')
        print(await ws.recv())
asyncio.run(test())
EOF
```

Ожидается: `pong`

---

## 🔴 Ошибка "WebSocket is closed before the connection is established"

Эта ошибка возникала из‑за того, что при быстром remount (React) вызывался `unsubscribe` и сокет закрывался, пока он ещё в состоянии CONNECTING.

**Что сделано в коде:**
- При отписке последнего подписчика сокет **не закрывается сразу** — отключение откладывается на 3 секунды.
- Если за 3 секунды снова подписываются (remount) — отложенное отключение отменяется.
- Не создаётся второй WebSocket, если для канала уже есть сокет в состоянии CONNECTING.
- `subscribe`/`unsubscribe` обёрнуты в `useCallback`, чтобы не дергать лишние переподключения из‑за смены ссылок при рендере.

После обновления кода сделайте **жёсткое обновление страницы** (Ctrl+Shift+R) или откройте приложение в **приватном окне**.

---

## 🆘 Последний шанс - Полный сброс

Если ничего не помогло, сделайте полный сброс:

```bash
# 1. Остановить всё
docker compose down

# 2. Пересобрать backend и frontend
docker compose build

# 3. Запустить
docker compose up -d

# 4. Подождать 5 секунд
sleep 5

# 5. Проверить статус
docker compose ps
docker compose logs backend --tail 20
```

**В браузере:**
1. Закрыть браузер полностью (все окна)
2. Открыть браузер заново
3. Открыть http://localhost:8080 в **приватном окне**

Если в приватном окне работает - значит проблема в кеше обычного окна.

---

## 📊 Мониторинг после исправления

### Консоль браузера должна показывать:
```
WebSocket connected to channel: server
WebSocket connected to channel: registers  
WebSocket connected to channel: generators
```

### Network tab (фильтр WS) должен показывать:
- 3 WebSocket соединения с status "101 Switching Protocols"
- Периодические ping/pong сообщения каждые 10 секунд

### Backend логи должны показывать:
```bash
docker compose logs backend --tail 30 | grep WebSocket
```

Должно быть:
```
INFO: WebSocket /ws/registers: client connected
INFO: WebSocket /ws/server: client connected
INFO: WebSocket /ws/generators: client connected
```

---

## 💡 Почему это происходит?

Браузеры агрессивно кешируют JavaScript файлы. После пересборки frontend:
- Новый файл: `index-B1WWN4VD.js` (новый код)
- Старый в кеше: `index-BJ3qmmh2.js` (старый код без WebSocket)

Браузер продолжает использовать старый файл из кеша пока вы не очистите его принудительно.

**Решение:** Hard Refresh (Ctrl+Shift+R) всегда загружает свежую версию.

---

## 🎯 Критические файлы

Если изменяли эти файлы - требуется пересборка:

**Backend:**
- `backend/app/api/websocket_api.py`
- `backend/app/websocket_manager.py`
- `backend/app/signal_generators.py`

```bash
docker compose restart backend
```

**Frontend:**
- `frontend/src/features/websocket/*`
- `frontend/src/shared/hooks/useWebSocket.ts`
- `frontend/nginx.conf`

```bash
docker compose build frontend
docker compose restart frontend
```

---

## 📞 Дальнейшая помощь

Если проблема не решена:
1. Соберите полные логи: `docker compose logs > full_logs.txt`
2. Сделайте screenshot консоли браузера (F12 → Console)
3. Сделайте screenshot Network tab с WebSocket соединениями
4. Опишите что видите на экране

См. также: `docs/TROUBLESHOOTING_WEBSOCKET.md` для детального troubleshooting.
