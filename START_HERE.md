# 🎯 Быстрый старт - Modbus TCP Simulator

## 1️⃣ Запуск приложения

```bash
# Из корня проекта
docker compose up -d

# Подождите 5 секунд для инициализации
sleep 5

# Проверьте статус
docker compose ps
```

Ожидаемый вывод:
```
NAME              STATUS
modbud_backend    Up
modbud_frontend   Up
```

---

## 2️⃣ Открытие в браузере

### ⚠️ ВАЖНО: Первый запуск

Откройте **в приватном окне** (чтобы избежать проблем с кешем):

**Chrome/Edge/Yandex:**
```
Ctrl+Shift+N → http://localhost:8080
```

**Firefox:**
```
Ctrl+Shift+P → http://localhost:8080
```

### Если открываете в обычном окне:
1. Откройте http://localhost:8080
2. Нажмите **Ctrl+Shift+R** для Hard Refresh
3. Проверьте что нет баннера "Переподключение к серверу..."

---

## 3️⃣ Проверка работоспособности

### ✅ Всё работает если:
- Нет оранжевого баннера вверху
- Кнопка "Запустить сервер" работает (становится "Остановить")
- Можно редактировать регистры
- Можно создать генератор сигналов

### ❌ Проблемы если:
- Висит баннер "Переподключение к серверу..."
- Кнопки не работают
- Консоль браузера переполняется логами

**→ Смотрите:** `QUICK_FIX.md` для решения

---

## 4️⃣ Быстрый тест генераторов

1. Нажмите **"Запустить сервер"**
2. Нажмите **"Создать генератор"**
3. Настройте:
   - **Type:** Sine
   - **Start Address:** 0
   - **Data Type:** FLOAT32
   - **Amplitude:** 100
   - **Offset:** 100
   - **Frequency:** 1 Hz
   - **Update Period:** 100 ms
4. Нажмите **"Включить генератор"**

**Результат:**
- График синусоиды обновляется плавно
- Регистры 0-1 обновляются синхронно (~100ms)
- Неоновая подсветка регистров

---

## 📚 Документация

- **QUICK_FIX.md** - Решение проблем с WebSocket за 3 шага
- **ARCHITECTURE.md** - Архитектура проекта
- **docs/API.md** - REST API документация
- **docs/WEBSOCKET.md** - WebSocket real-time API
- **docs/TROUBLESHOOTING_WEBSOCKET.md** - Детальный troubleshooting
- **CONTRIBUTING.md** - Разработка и testing

---

## 🐛 Troubleshooting

### Баннер "Переподключение к серверу..."
→ **QUICK_FIX.md** (очистка кеша браузера)

### Браузер зависает, миллионы логов
→ Закройте ВСЕ вкладки, перезапустите `docker compose restart`

### Backend не запускается
```bash
docker compose logs backend
```

### Ошибка "порт занят"
```bash
# Проверьте что порты свободны
sudo lsof -i :8000
sudo lsof -i :8080
sudo lsof -i :1502

# Остановите другие процессы или измените порты в docker-compose.yml
```

---

## 🔥 Production deployment

**Для production используйте:**
- HTTPS вместо HTTP
- WSS вместо WS
- Настройте CORS whitelist
- Настройте rate limiting
- Используйте secrets для паролей

См. `CONTRIBUTING.md` → Production Considerations

---

## 🚀 Разработка

### Local development (без Docker):

**Backend:**
```bash
cd backend
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Запустится на порту 5173 с proxy на backend:8000
```

### Запуск тестов:

**Backend:**
```bash
cd backend
pytest -v
```

**Frontend:**
```bash
cd frontend
npm test
```

---

**Вопросы?** Смотрите CONTRIBUTING.md или создайте issue на GitHub.
