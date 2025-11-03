# Prisma Database Schema

Схема базы данных для системы управления медицинскими документами.

## База данных

- **СУБД**: PostgreSQL 16
- **Расширения**: pgvector (для векторного поиска)
- **ORM**: Prisma

## Модели данных

### 👤 Пользователи и аутентификация

#### User
Основная модель пользователя системы.

**Поля**:
- `id` - Уникальный идентификатор (CUID)
- `email` - Email (уникальный)
- `name` - Имя пользователя
- `password` - Хэшированный пароль
- `role` - Роль (USER/ADMIN)

#### RefreshToken
Refresh токены для JWT аутентификации.

**Поля**:
- `token` - Refresh token (уникальный)
- `userId` - Ссылка на пользователя
- `expiresAt` - Дата истечения

---

### 📄 Документы

#### Record
Группа связанных медицинских документов (например, все документы одного визита к врачу или анализов за определённый период).

**Поля**:
- `title` - Название (генерируется AI или задаётся пользователем)
- `description` - Опциональное описание
- `date` - Дата создания или извлечённая из документов
- `summary` - Суммаризация всех документов в Record (генерируется AI)

**Связи**:
- Принадлежит User
- Имеет множество Document
- Имеет множество Tag через RecordTag

#### Document
Отдельный медицинский документ (PDF или текстовый файл).

**Поля**:
- `title` - Автоматически генерируется AI
- `originalFileName` - Имя файла при загрузке
- `mimeType` - MIME тип (application/pdf, text/plain)
- `fileSize` - Размер файла в байтах
- `minioUrl`, `minioBucket`, `minioObjectKey` - Данные для доступа к файлу в MinIO
- `status` - Статус обработки (UPLOADING, PROCESSING, COMPLETED, FAILED)
- `errorMessage` - Сообщение об ошибке (если status = FAILED)
- `processedAt` - Timestamp завершения обработки

**Связи**:
- Принадлежит Record
- Имеет множество DocumentChunk
- Имеет множество PiiMapping
- Имеет множество ProcessingLog

#### DocumentChunk
Часть документа с векторным представлением для семантического поиска.

**Важно**: Документы разбиваются на чанки размером ~500 токенов для эффективной векторизации.

**Поля**:
- `content` - Анонимизированный текст чанка
- `order` - Порядковый номер в документе
- `embedding` - Векторное представление (`vector(1536)` через OpenAI)

**Связи**:
- Принадлежит Document

#### PiiMapping
Маппинг персональных данных для возможности деанонимизации.

**Поля**:
- `original` - Оригинальное значение (зашифровано AES)
- `replacement` - Замена (например, `[PATIENT_NAME_1]`)
- `type` - Тип PII (NAME, ADDRESS, PHONE, EMAIL, DATE, ID, OTHER)
- `encryptionIv` - Initialization Vector для расшифровки

**Связи**:
- Принадлежит Document

#### ProcessingLog
Логи обработки документов для отладки и мониторинга.

**Поля**:
- `step` - Шаг обработки (parsing, anonymization, vectorization, tagging)
- `status` - Статус (started, completed, failed)
- `message` - Сообщение
- `metadata` - JSON с дополнительными данными

---

### 🏷️ Теги и категоризация

#### Tag
Теги для категоризации документов.

**Поля**:
- `name` - Название тега (уникальное)
- `description` - Описание
- `color` - HEX цвет для UI
- `isSystem` - Системный тег (автоматический) или пользовательский

**Примеры системных тегов**: "Анализы", "Заключения", "Рецепты", "МРТ", "УЗИ"

#### RecordTag
Связь многие-ко-многим между Record и Tag.

---

### ⚙️ Настройки

#### SystemSetting
Глобальные настройки системы.

**Поля**:
- `key` - Уникальный ключ настройки
- `value` - Значение
- `category` - Категория (ai, storage, processing)

---

## Индексы

Для оптимизации производительности созданы следующие индексы:

- `User.email` - для аутентификации
- `Document.userId`, `Document.recordId`, `Document.status` - для фильтрации
- `DocumentChunk.documentId`, `DocumentChunk.userId` - для поиска
- `RecordTag.recordId`, `RecordTag.tagId` - для связи тегов

## Каскадное удаление

При удалении родительской записи автоматически удаляются связанные данные:

- User → RefreshToken, Record
- Record → Document, RecordTag
- Document → DocumentChunk, PiiMapping, ProcessingLog
- Tag → RecordTag

## Миграции

### Создание новой миграции

```bash
cd prisma
npx prisma migrate dev --name migration_name
```

### Применение миграций

```bash
npx prisma migrate deploy
```

### Генерация Prisma Client

```bash
npx prisma generate
```

### Сброс базы данных (только для dev!)

```bash
npx prisma migrate reset
```

## Prisma Studio

Для визуального просмотра данных:

```bash
npx prisma studio
```

Откроется на `http://localhost:5555`

## pgvector

### Создание индекса для векторного поиска

После применения миграций, выполните SQL:

```sql
-- IVFFlat индекс для быстрого поиска похожих векторов
CREATE INDEX IF NOT EXISTS document_chunk_embedding_idx 
ON "DocumentChunk" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Поиск похожих документов

```sql
-- Поиск 10 наиболее похожих чанков
SELECT id, content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM "DocumentChunk"
WHERE "userId" = 'user_id_here'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

## Переменные окружения

```env
DATABASE_URL="postgresql://user:password@localhost:5432/medical_docs?schema=public"
```

## Best Practices

1. **Всегда используйте транзакции** для связанных операций
2. **Используйте select** для выбора только нужных полей
3. **Используйте include/select с осторожностью** - избегайте N+1 запросов
4. **Индексируйте часто используемые поля** для фильтрации и сортировки
5. **Регулярно анализируйте медленные запросы** через Prisma Studio или логи PostgreSQL

## Миграция данных

Для миграции данных из существующей схемы (`backend/prisma/schema.prisma`):

1. Экспортируйте данные User и RefreshToken
2. Примените миграции новой схемы
3. Импортируйте данные пользователей
4. Создайте новые Records и Documents

См. скрипт миграции в `scripts/migrate-data.ts` (создать при необходимости).
