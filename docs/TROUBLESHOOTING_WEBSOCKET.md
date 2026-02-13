# WebSocket Troubleshooting Guide

Руководство по решению проблем с WebSocket соединениями.

## Симптомы и решения

### 🔴 Баннер "Переподключение к серверу..." не исчезает

**Причина:** WebSocket соединения не устанавливаются или сразу закрываются.

**Решение:**

1. **Очистите кеш браузера полностью:**
   ```
   F12 → Application → Clear storage → Clear site data
   ```

2. **Сделайте Hard Refresh:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

3. **Проверьте что загружен новый JS файл:**
   - F12 → Network tab → найдите `index-*.js`
   - Убедитесь что имя файла соответствует последней сборке

4. **Откройте в приватном окне** для проверки:
   ```
   Ctrl+Shift+N (Chrome/Edge)
   Ctrl+Shift+P (Firefox)
   ```

---

### 🔴 Браузер или IDE зависает, консоль переполняется логами

**Причина:** Бесконечный цикл WebSocket переподключений с миллионами логов.

**Решение:**

✅ **УЖЕ ИСПРАВЛЕНО** в текущей версии:
- Ограничение: максимум 10 попыток переподключения
- Уменьшено логирование: только первые 3 ошибки
- React.StrictMode отключен

**Если проблема осталась:**

1. **Закройте ВСЕ вкладки** с localhost:8080

2. **Перезапустите контейнеры:**
   ```bash
   docker compose restart
   ```

3. **Откройте НОВУЮ вкладку** (не восстанавливайте закрытую)

---

### 🔴 WebSocket подключается и сразу закрывается (код 1006)

**Причина:** Проблемы с nginx proxy или backend.

**Диагностика:**

```bash
# Проверьте backend логи
docker compose logs backend --tail 50 | grep WebSocket

# Проверьте nginx логи  
docker compose logs frontend --tail 50 | grep ws

# Проверьте прямое подключение к backend
python3 -c "
import asyncio, websockets
async def test():
    async with websockets.connect('ws://localhost:8000/ws/registers') as ws:
        await ws.send('ping')
        print(await ws.recv())
asyncio.run(test())
"
```

**Решения:**

1. **Если backend недоступен:**
   ```bash
   docker compose restart backend
   ```

2. **Если nginx не проксирует WebSocket:**
   - Проверьте `/etc/nginx/conf.d/default.conf` в контейнере
   - Должен быть блок `location /ws/` с headers для upgrade

3. **Если проблемы с timeouts:**
   - Nginx настроен на 7 дней read timeout
   - Проверьте что изменения применены: `docker compose build frontend`

---

### 🔴 Консоль пустая, но приложение не работает

**Причина:** JavaScript не загружается или есть ошибки до WebSocket.

**Диагностика:**

1. **Откройте DevTools (F12) → Console tab**
   - Должны быть сообщения "WebSocket connected to channel: ..."
   - Если консоль полностью пустая - JS не загрузился

2. **Проверьте Network tab:**
   - Найдите `index-*.js` - должен быть статус 200
   - Проверьте размер файла (~236KB)

**Решения:**

1. **Hard Refresh:** Ctrl+Shift+R несколько раз

2. **Проверьте frontend контейнер:**
   ```bash
   docker compose logs frontend --tail 20
   docker compose restart frontend
   ```

3. **Проверьте что файлы собрались:**
   ```bash
   docker compose build frontend --no-cache
   ```

---

### 🔴 Регистры не обновляются, но WebSocket подключен

**Причина:** Генераторы не работают или broadcast не отправляется.

**Диагностика:**

```bash
# Проверьте что backend отправляет broadcast
docker compose logs backend --tail 100 | grep -i broadcast

# Проверьте генераторы
curl http://localhost:8000/api/generators
```

**Решения:**

1. **Создайте тестовый генератор** через UI
2. **Проверьте консоль браузера** - должны приходить события `registers_changed`
3. **Перезапустите Modbus сервер** через UI кнопкой "Запустить"

---

## Проверка здоровья системы

### Быстрая диагностика

```bash
# 1. Проверка контейнеров
docker compose ps

# 2. Проверка backend API
curl http://localhost:8000/health

# 3. Проверка frontend
curl -I http://localhost:8080

# 4. Проверка WebSocket (Python)
python3 << 'EOF'
import asyncio, websockets
async def test():
    try:
        async with websockets.connect('ws://localhost:8080/ws/registers', ping_interval=None) as ws:
            await ws.send('ping')
            print(f"✅ WebSocket OK: {await ws.recv()}")
            return True
    except Exception as e:
        print(f"❌ WebSocket Error: {e}")
        return False
exit(0 if asyncio.run(test()) else 1)
EOF
```

### Ожидаемый вывод

```
NAME              STATUS         PORTS
modbud_backend    Up X minutes   0.0.0.0:8000->8000/tcp, 0.0.0.0:1502->1502/tcp
modbud_frontend   Up X minutes   0.0.0.0:8080->80/tcp

{"status":"ok"}

HTTP/1.1 200 OK

✅ WebSocket OK: pong
```

---

## Debug режим

Для детального логирования в браузере:

```javascript
// В консоли браузера (F12)
localStorage.setItem('debug', 'websocket:*');
location.reload();
```

Для просмотра WebSocket трафика:
1. F12 → Network tab
2. Фильтр: `WS` (WebSocket)
3. Кликните на соединение → вкладка Messages

---

## Известные ограничения

1. **Максимум 10 попыток переподключения** - после этого нужен refresh страницы
2. **Ping interval 10s** - соединение может разорваться если backend не отвечает 10+ секунд
3. **Nginx timeout 7 days** - после этого соединение будет закрыто (обычно не достигается)
4. **React.StrictMode отключен** - это нормально для WebSocket приложений

---

## Сброс к заводским настройкам

Если ничего не помогает:

```bash
# 1. Остановить и удалить всё
docker compose down -v

# 2. Очистить кеш сборки
docker system prune -f

# 3. Пересобрать с нуля
docker compose build --no-cache

# 4. Запустить заново
docker compose up -d

# 5. Проверить логи
docker compose logs -f
```

В браузере:
1. Закрыть все вкладки с localhost:8080
2. Очистить все данные сайта (F12 → Application → Clear storage)
3. Закрыть и открыть браузер заново
4. Открыть http://localhost:8080 в новой вкладке

---

## Контакты для помощи

Если проблема не решена:
1. Соберите логи: `docker compose logs > logs.txt`
2. Сделайте screenshot консоли браузера (F12)
3. Опишите шаги для воспроизведения
