# Processing Service

## Назначение

Processing Service занимается обработкой документов в фоновом режиме:

- **Парсинг PDF** и текстовых документов
- **Извлечение текста** из файлов
- **Разбивка на чанки** (chunks) для векторизации
- **Управление очередями** через BullMQ
- **Оркестрация процесса** обработки
- **Обработка ошибок** и повторные попытки

## Технологии

- NestJS
- BullMQ (очереди)
- Redis
- PDF-parse
- Prisma ORM

## Процесс обработки

1. **Получение задачи** из очереди BullMQ
2. **Загрузка файла** из MinIO
3. **Парсинг документа**:
   - PDF → текст
   - TXT → прямое чтение
4. **Разбивка текста** на чанки (~500 токенов)
5. **Отправка на AI Service** для:
   - Анонимизации (PII removal)
   - Векторизации (embeddings)
6. **Сохранение чанков** в базу данных
7. **Обновление статуса** документа

## Очереди

- `document-processing` - основная очередь обработки
- `document-parsing` - парсинг файлов
- `document-chunking` - разбивка на чанки

## Порт

По умолчанию: **3002**

## Переменные окружения

```env
PROCESSING_SERVICE_PORT=3002
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
BULL_QUEUE_NAME=document-processing
BULL_QUEUE_PREFIX=medical-docs
```

## Запуск

```bash
pnpm install
pnpm start:dev
```

## Workers

Сервис запускает несколько workers для параллельной обработки документов.
