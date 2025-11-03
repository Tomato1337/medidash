# API Gateway - Адаптация под микросервисную архитектуру

## ✅ Выполненные изменения

### 1. Обновление переменных окружения (`env.schema.ts`)

**Добавлено:**
- `API_GATEWAY_PORT` - порт API Gateway (3000)
- `LOG_LEVEL` - уровень логирования
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - подключение к Redis
- `CORS_ORIGIN` - настройка CORS
- `DOCUMENT_SERVICE_URL`, `PROCESSING_SERVICE_URL`, `AI_SERVICE_URL`, `SEARCH_SERVICE_URL` - URL микросервисов
- `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX` - настройки rate limiting

**Изменено:**
- `NODE_ENV` - теперь поддерживает `dev`, `prod`, `test`
- `JWT_SECRET` и `JWT_REFRESH_SECRET` - упрощенные имена
- `JWT_EXPIRES_IN` и `JWT_REFRESH_EXPIRES_IN` - строковый формат (15m, 7d)

### 2. Улучшение `main.ts`

**Добавлено:**
- Logger для вывода информации о запуске
- Использование EnvService для типобезопасного доступа к переменным
- Улучшенная Swagger документация с тегами
- Bearer Auth в Swagger
- Поддержка нескольких CORS origins (через запятую)
- Расширенные настройки ValidationPipe
- Логирование информации о запуске сервера

### 3. HTTP Client Service (`common/http-client.service.ts`)

**Создан новый сервис для проксирования запросов к микросервисам:**
- `proxyRequest()` - универсальный метод для проксирования
- `get()`, `post()`, `put()`, `patch()`, `delete()` - HTTP методы
- `checkHealth()` - проверка здоровья микросервиса
- `getServices()` - получение списка всех зарегистрированных сервисов

**Поддерживаемые микросервисы:**
- Document Service (порт 3001)
- Processing Service (порт 3002)
- AI Service (порт 3003)
- Search Service (порт 3004)

### 4. Common Module (`common/common.module.ts`)

**Создан глобальный модуль** для общих утилит:
- HTTP Client Service доступен во всех модулях
- Помечен декоратором `@Global()`

### 5. Health Check (`health/`)

**Создан модуль для мониторинга здоровья системы:**
- `GET /api/health` - проверка API Gateway и всех микросервисов
- `GET /api/health/ping` - простой ping endpoint

**Ответ health check:**
```json
{
  "status": "ok" | "degraded" | "down",
  "timestamp": "2025-11-03T...",
  "uptime": 123.45,
  "services": [
    {
      "name": "document",
      "status": "healthy" | "unhealthy",
      "url": "http://localhost:3001"
    },
    ...
  ]
}
```

### 6. Обновление JWT стратегий

**`jwt.strategy.ts`:**
- Добавлена поддержка Bearer token из заголовка
- Использует `JWT_SECRET` вместо `JWT_ACCESS_TOKEN_SECRET`

**`jwt-refresh.strategy.ts`:**
- Использует `JWT_REFRESH_SECRET` вместо `JWT_REFRESH_TOKEN_SECRET`

### 7. Обновление AuthService

**Метод `login()`:**
- Использует строковый формат времени жизни токенов (15m, 7d)
- Добавлен метод `parseExpirationTime()` для парсинга времени
- Улучшена безопасность cookies (sameSite: 'lax')
- Исправлена проверка NODE_ENV (теперь 'production' вместо 'prod')

**Исправлен импорт:**
- `User` теперь импортируется из `../generated/prisma`

### 8. App Module

**Обновлена структура:**
- Добавлен `CommonModule` (глобальный)
- Добавлен `HealthModule`
- Улучшены комментарии для группировки модулей

### 9. Environment файл

**Создан `.env.example`** с всеми необходимыми переменными для:
- Application settings
- Database
- Redis
- JWT
- CORS
- Microservices URLs
- Rate Limiting

## 📋 Что нужно сделать дальше

### Следующие шаги для полной интеграции:

1. **Proxy контроллеры** для микросервисов:
   - `DocumentProxyController` - проксирование запросов к Document Service
   - `SearchProxyController` - проксирование запросов к Search Service
   - `ProcessingProxyController` - проксирование запросов к Processing Service

2. **Rate Limiting**:
   - Добавить `@nestjs/throttler` для защиты от DDoS
   - Настроить лимиты для разных endpoints

3. **WebSocket Gateway**:
   - Для real-time уведомлений о статусе обработки документов
   - Интеграция с BullMQ events

4. **Logging & Monitoring**:
   - Настроить Winston logger
   - Добавить request logging middleware
   - Метрики для Prometheus

5. **Error Handling**:
   - Глобальный Exception Filter
   - Обработка ошибок от микросервисов

6. **Documentation**:
   - Расширить Swagger документацию
   - Добавить примеры запросов/ответов

## 🚀 Как запустить

1. Установите зависимости:
```bash
cd services/api-gateway
pnpm install
```

2. Скопируйте `.env.example` в `.env`:
```bash
copy .env.example .env
```

3. Запустите инфраструктуру (PostgreSQL, Redis, MinIO):
```bash
cd ../..
docker-compose up -d
```

4. Сгенерируйте Prisma Client:
```bash
cd prisma
pnpm generate
```

5. Запустите API Gateway:
```bash
cd ../services/api-gateway
pnpm start:dev
```

6. Откройте Swagger:
```
http://localhost:3000/api/docs
```

## 📊 Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `POST /api/auth/logout` - Выход

### Health Check
- `GET /api/health` - Проверка здоровья всех сервисов
- `GET /api/health/ping` - Ping

### Users
- `GET /api/users/me` - Текущий пользователь

### Будущие endpoints (требуют реализации proxy)
- `/api/documents/*` → Document Service
- `/api/processing/*` → Processing Service
- `/api/search/*` → Search Service

## 🔒 Безопасность

- JWT аутентификация с access и refresh токенами
- HttpOnly cookies для защиты от XSS
- CORS настройки
- Validation Pipe для валидации входных данных
- Rate Limiting (готово к настройке)

## 📝 Примечания

- API Gateway теперь готов для проксирования запросов
- Все переменные окружения типобезопасны через Zod
- Health check позволяет мониторить состояние всех микросервисов
- HTTP Client Service упрощает коммуникацию между сервисами
