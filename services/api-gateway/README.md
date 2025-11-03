# API Gateway Service

## Назначение

API Gateway - это единая точка входа для всех клиентских запросов. Сервис обеспечивает:

- **Аутентификацию и авторизацию** (JWT tokens)
- **Rate limiting** и защита от DDoS
- **Маршрутизацию** запросов к соответствующим микросервисам
- **Логирование** всех входящих запросов
- **Валидацию** входных данных
- **CORS** настройки
- **WebSocket** подключения для real-time уведомлений

## Технологии

- NestJS
- Fastify
- JWT Authentication
- Class Validator
- Class Transformer

## Endpoints

### Аутентификация
- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход в систему
- `POST /auth/refresh` - Обновление токена
- `POST /auth/logout` - Выход из системы

### Проксирование к микросервисам
- `/api/documents/*` → Document Service
- `/api/processing/*` → Processing Service
- `/api/search/*` → Search Service

## Порт

По умолчанию: **3000**

## Переменные окружения

```env
API_GATEWAY_PORT=3000
JWT_SECRET=your-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
```

## Запуск

```bash
pnpm install
pnpm start:dev
```
