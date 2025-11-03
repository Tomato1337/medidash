# Document Service

## Назначение

Document Service отвечает за управление медицинскими документами:

- **Загрузка файлов** (PDF, TXT)
- **Сохранение в MinIO** (S3-compatible storage)
- **CRUD операции** с документами
- **Управление Records** (группами документов)
- **Метаданные документов** (название, дата, теги)
- **Отслеживание статусов** документов (UPLOADING, PROCESSING, COMPLETED, FAILED)

## Технологии

- NestJS
- Fastify
- Prisma ORM
- MinIO Client
- Multer (file upload)

## Основные операции

### Records
- Создание Record (группы документов)
- Получение списка Records пользователя
- Обновление Record
- Удаление Record

### Documents
- Загрузка документа в Record
- Получение документа по ID
- Скачивание оригинального файла из MinIO
- Обновление метаданных документа
- Удаление документа

## Порт

По умолчанию: **3001**

## Переменные окружения

```env
DOCUMENT_SERVICE_PORT=3001
DATABASE_URL=postgresql://...
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=medical-documents
```

## База данных

Использует модели Prisma:
- `User`
- `Record`
- `Document`
- `Tag`
- `RecordTag`

## Запуск

```bash
pnpm install
pnpm start:dev
```
