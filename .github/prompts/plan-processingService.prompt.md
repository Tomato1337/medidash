# Plan: Реализация Processing Service с TONL

Processing Service оркестрирует двухфазную обработку документов через BullMQ. **Фаза 1 (PARSING)** — парсинг PDF/TXT и чанкинг. **Фаза 2 (PROCESSING)** — AI-обработка. Статусы: `UPLOADING → PARSING → PROCESSING → COMPLETED | FAILED`. TONL используется для оптимизации токенов (32-45% экономия). Изображения — TODO на будущее.

## Steps

1. **Обновить `prisma/schema.prisma`**: добавить `expectedDocumentsCount: Int?` в `Record`, добавить `failedPhase: String?` в `Document`.

2. **Обновить `services/shared-types/index.ts`**: синхронизировать `DocumentStatus` (убрать `PENDING`, `COMPRESSING`), добавить типы `FailedPhase`, `ProcessingEvent`, `ParsingJobData`, `AiProcessingJobData`.

3. **Дополнить `documents.service.ts` метод `confirmUpload`**: после статуса `PARSING` проверить готовность всех документов Record → если все `PARSING` → Redis publish `record.ready-for-parsing`.

4. **Обновить конфигурацию `services/processing-service/`**: `package.json` (добавить `bullmq`, `pdf-parse`, `ioredis`, `tonl`, `@nestjs/bullmq`), `env.schema.ts` (BULL*\*, REDIS*_, MINIO\__, CHUNK_SIZE, CHUNK_OVERLAP), исправить `main.ts`.

5. **Создать QueueModule**: BullMQ с очередями `parsing-queue` (concurrency: 2) и `ai-processing-queue` (concurrency: 1), retry с exponential backoff (3 attempts), логирование при exhausted retries.

6. **Создать MinioModule**: копия из document-service для загрузки файлов.

7. **Создать EventsModule**: Redis Pub/Sub — подписка на `record.ready-for-parsing`, публикация в `processing:events`.

8. **Создать ParsingModule**: `ParsingService` (pdf-parse для PDF, чтение TXT, chunking с настраиваемыми `CHUNK_SIZE`/`CHUNK_OVERLAP`), `ParsingProcessor` (BullMQ worker), `ParsingGateway` (Redis listener).

9. **Создать AiProcessingModule**: `AiProcessingService` (сбор чанков, `encodeTONL()`, HTTP вызов AI Service), `AiProcessingProcessor` (BullMQ worker).

10. **Создать RecoveryController**: `POST /processing/records/:recordId/retry/:phase` — частичный retry только документов с ошибкой или незавершённых.

11. **Добавить Processing Service в `docker-compose.yml`**: порт 3002, зависимости от redis, postgres, minio.

## Workflow

```
[Frontend] ─── PUT presigned URL ───► [MinIO]
      │
      ▼ POST /documents/:id/confirm (Document Service)
[confirmUpload] → Document.status = PARSING
      │           → Все PARSING? → Redis "record.ready-for-parsing"
      │
      ▼
[ParsingGateway] ─── subscribe ───► parsing-queue (×N документов)
      │
═══════════ ФАЗА 1: PARSING (concurrency: 2) ═══════════
      │
[ParsingProcessor]
      │ ├── MinIO → файл
      │ ├── PDF/TXT → текст
      │ ├── Chunking (CHUNK_SIZE/CHUNK_OVERLAP из env)
      │ ├── Сохранить DocumentChunk[]
      │ └── Document.status = PROCESSING
      │
      ├── Ошибка → failedPhase = "parsing", Record.status = FAILED
      │
      ▼ Все PROCESSING? → ai-processing-queue
      │
═══════════ ФАЗА 2: AI PROCESSING ═══════════
      │
[AiProcessingProcessor]
      │ ├── Собрать чанки → encodeTONL()
      │ ├── HTTP → AI Service
      │ ├── Сохранить embeddings, PII, tags
      │ └── Documents/Record.status = COMPLETED
      │
      ├── Ошибка → failedPhase = "processing", Record.status = FAILED
      │
      ▼ Redis "processing:events" → SSE → Frontend
```

## Recovery

```
POST /processing/records/:recordId/retry/:phase

phase = "parsing":
  → Документы: (FAILED + failedPhase="parsing") OR status=PARSING
  → Сбросить failedPhase, добавить в parsing-queue

phase = "processing":
  → Использовать существующие чанки (без повторного парсинга)
  → Добавить Record в ai-processing-queue
```

## Структура файлов

```
services/processing-service/src/
├── app.module.ts
├── main.ts
├── env/
│   ├── env.schema.ts    # CHUNK_SIZE, CHUNK_OVERLAP, BULL_*, REDIS_*, MINIO_*
│   └── env.service.ts
├── prisma/
├── minio/               # Копия из document-service
├── queue/
│   ├── queue.module.ts
│   └── queue.constants.ts
├── events/
│   └── events.service.ts
├── parsing/
│   ├── parsing.service.ts
│   ├── parsing.processor.ts
│   └── parsing.gateway.ts
├── ai-processing/
│   ├── ai-processing.service.ts
│   └── ai-processing.processor.ts
└── recovery/
    └── recovery.controller.ts
```

## Environment Variables (новые)

```env
# Chunking
CHUNK_SIZE=800           # токенов
CHUNK_OVERLAP=100        # токенов

# BullMQ
PARSING_CONCURRENCY=2
AI_PROCESSING_CONCURRENCY=1
BULL_RETRY_ATTEMPTS=3
```

## TODO (будущие итерации)

-   **OCR для изображений**: добавить Tesseract.js для обработки JPEG/PNG/WEBP/AVIF
-   **Dead Letter Queue**: отдельная очередь для анализа failed jobs
-   **Уведомления администратору**: при критических ошибках
