# API Gateway - Task 2.1 ✅ ЗАВЕРШЕНО

## ✅ Реализовано

1. **Prisma Client** - сгенерирован, все TypeScript типы доступны
2. **Environment Schema** - все переменные окружения для микросервисов
3. **HTTP Client Service** - сервис для проксирования запросов
4. **Health Check** - мониторинг всех микросервисов
5. **JWT стратегии** - обновлены под новые env переменные
6. **SSE (Server-Sent Events)** - real-time уведомления о статусе обработки документов
   - Подключение к `/api/events/processing` - все events пользователя
   - Подключение к `/api/events/processing/:recordId` - конкретный record
   - Redis Pub/Sub для трансляции событий между микросервисами
   - События: `processing:started`, `processing:progress`, `processing:completed`, `processing:failed`
7. **Proxy Controllers** - проксирование к микросервисам:
   - `DocumentProxyController` → Document Service (порт 3001)
   - `SearchProxyController` → Search Service (порт 3004)
   - `ProcessingProxyController` → Processing Service (порт 3002)
8. **Rate Limiting** - защита от злоупотреблений через `@nestjs/throttler`
9. **Global Exception Filter** - обработка всех ошибок с правильным форматированием
10. **Request Logging Middleware** - логирование всех HTTP запросов

## 🎯 Преимущества SSE над WebSocket

- ✅ Проще в реализации (обычный HTTP)
- ✅ Автоматическое переподключение
- ✅ Встроенный `EventSource` API в браузере (не нужны библиотеки)
- ✅ Работает через HTTP/2 (multiplexing)
- ✅ Проще проксировать через nginx
- ✅ Меньше overhead
- ✅ Идеально для односторонней коммуникации (server → client)

## 📋 Пример использования SSE на клиенте

```typescript
// Frontend код для подключения к SSE
const eventSource = new EventSource('/api/events/processing/cm2u1234567890abcdef', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Connected:', data.clientId);
});

eventSource.addEventListener('processing:started', (event) => {
  const data = JSON.parse(event.data);
  console.log('Processing started:', data.recordId);
});

eventSource.addEventListener('processing:progress', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress, '%');
});

eventSource.addEventListener('processing:completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('Processing completed:', data.recordId);
  eventSource.close();
});

eventSource.addEventListener('processing:failed', (event) => {
  const data = JSON.parse(event.data);
  console.error('Processing failed:', data.error);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // Автоматическое переподключение встроено в EventSource
};
```

## 📋 Как микросервисы публикуют события

```typescript
// В Processing Service или других микросервисах
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Публикуем событие
await redis.publish('processing:events', JSON.stringify({
  recordId: 'cm2u1234567890abcdef',
  userId: 'user123',
  type: 'progress',
  data: {
    progress: 45,
    currentStep: 'AI анализ документа',
  },
  timestamp: new Date().toISOString(),
}));
```

## 🔄 Тестирование API Gateway

```bash
cd services\api-gateway
pnpm start:dev
```

API Gateway будет доступен на `http://localhost:3000`:
- Swagger UI: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/health`
- SSE Events: `http://localhost:3000/api/events/processing`

## 📊 Текущий статус проекта

- ✅ **Task 1.1**: Monorepo структура
- ✅ **Task 1.2**: Prisma schema + миграции
- ✅ **Task 1.3**: Docker Compose (PostgreSQL+pgvector, Redis, MinIO)
- ✅ **Task 2.1**: API Gateway (100% завершено!)
- ⏳ **Task 2.2**: Document Service (следующий)
- ⏳ **Task 2.3**: Processing Service
- ⏳ **Task 2.4**: AI Service
- ⏳ **Task 2.5**: Search Service
- ⏳ **Stage 3**: Frontend
- ⏳ **Stage 4**: Testing & Deployment

## 🚀 Следующий шаг: Task 2.2 - Document Service

Document Service будет отвечать за:
1. Загрузку документов в MinIO
2. Создание записей в БД (Record, Document)
3. Отправку событий в BullMQ для обработки
4. CRUD операции с документами
5. REST API эндпоинты
