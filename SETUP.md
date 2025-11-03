# Инструкция по установке и настройке

## Предварительные требования

- Node.js 20+
- pnpm 8+
- Docker и Docker Compose
- Git

## Шаг 1: Клонирование репозитория

```bash
git clone <repository-url>
cd health-helper
```

## Шаг 2: Настройка переменных окружения

Скопируйте файл `.env.example` в `.env`:

```bash
copy .env.example .env
```

Отредактируйте `.env` файл и укажите ваши значения для:
- `OPENAI_API_KEY` - API ключ OpenAI
- `JWT_SECRET` и `JWT_REFRESH_SECRET` - секретные ключи для JWT
- Пароли для Redis и MinIO (в production окружении)

## Шаг 3: Запуск инфраструктуры

Запустите PostgreSQL, Redis и MinIO через Docker Compose:

```bash
docker-compose up -d
```

Проверьте, что все сервисы запущены:

```bash
docker-compose ps
```

Должны быть запущены:
- ✅ medical-docs-postgres (порт 5432)
- ✅ medical-docs-redis (порт 6379)
- ✅ medical-docs-minio (порты 9000, 9001)

## Шаг 4: Установка зависимостей Prisma

```bash
cd prisma
pnpm install
```

## Шаг 5: Применение миграций

Примените миграции базы данных:

```bash
pnpm migrate:deploy
```

Или для development (с возможностью создания новой базы):

```bash
pnpm migrate:dev
```

## Шаг 6: Создание pgvector индексов

pgvector индексы создаются автоматически во второй миграции, но вы можете проверить их наличие:

```bash
docker exec -it medical-docs-postgres psql -U postgres -d medical_docs -c "\d+ \"DocumentChunk\""
```

## Шаг 7: Генерация Prisma Client

```bash
pnpm generate
```

Prisma Client будет сгенерирован в `generated/prisma/`.

## Шаг 8: Заполнение базовых данных (seed)

Заполните базу данных системными тегами и настройками:

```bash
pnpm seed
```

## Шаг 9: Проверка базы данных

Откройте Prisma Studio для просмотра данных:

```bash
pnpm studio
```

Prisma Studio откроется на `http://localhost:5555`.

## Шаг 10: Установка зависимостей микросервисов

Для каждого микросервиса установите зависимости:

```bash
# API Gateway
cd services/api-gateway
pnpm install

# Document Service
cd ../document-service
pnpm install

# Processing Service
cd ../processing-service
pnpm install

# AI Service
cd ../ai-service
pnpm install

# Search Service
cd ../search-service
pnpm install
```

## Шаг 11: Запуск микросервисов (после их реализации)

```bash
# В отдельных терминалах запустите каждый сервис:

# Terminal 1: API Gateway
cd services/api-gateway
pnpm start:dev

# Terminal 2: Document Service
cd services/document-service
pnpm start:dev

# Terminal 3: Processing Service
cd services/processing-service
pnpm start:dev

# Terminal 4: AI Service
cd services/ai-service
pnpm start:dev

# Terminal 5: Search Service
cd services/search-service
pnpm start:dev
```

## Шаг 12: Запуск Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend откроется на `http://localhost:5173`.

---

## Полезные команды

### Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Просмотр логов
docker-compose logs -f

# Перезапуск сервиса
docker-compose restart postgres
```

### Prisma

```bash
# Создание новой миграции
cd prisma
pnpm migrate:dev --name migration_name

# Применение миграций в production
pnpm migrate:deploy

# Сброс базы данных (ОСТОРОЖНО!)
pnpm migrate:reset

# Открыть Prisma Studio
pnpm studio

# Генерация Prisma Client
pnpm generate
```

### Подключение к PostgreSQL

```bash
# Через Docker
docker exec -it medical-docs-postgres psql -U postgres -d medical_docs

# Через psql (если установлен локально)
psql -h localhost -p 5432 -U postgres -d medical_docs
```

### MinIO Console

Откройте в браузере: `http://localhost:9001`

Логин: `minioadmin`  
Пароль: `minioadmin` (или значение из `.env`)

### Redis CLI

```bash
docker exec -it medical-docs-redis redis-cli
```

---

## Troubleshooting

### Проблема: "Connection refused" при подключении к PostgreSQL

**Решение**: Убедитесь, что контейнер запущен:
```bash
docker-compose ps
docker-compose logs postgres
```

### Проблема: "Extension vector not found"

**Решение**: Убедитесь, что используется образ `pgvector/pgvector:pg16`:
```bash
docker-compose down -v
docker-compose up -d
```

### Проблема: "Cannot find module '@prisma/client'"

**Решение**: Сгенерируйте Prisma Client:
```bash
cd prisma
pnpm generate
```

### Проблема: Медленный поиск по векторам

**Решение**: Убедитесь, что pgvector индексы созданы:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'DocumentChunk';
```

---

## Следующие шаги

После завершения установки:

1. ✅ Реализуйте микросервисы согласно архитектуре
2. ✅ Настройте межсервисную коммуникацию
3. ✅ Реализуйте BullMQ очереди для обработки документов
4. ✅ Интегрируйте OpenAI API для AI функций
5. ✅ Реализуйте frontend согласно FSD архитектуре
6. ✅ Настройте CI/CD для автоматического развертывания

См. `ARCHITECTURE.md` для подробной информации об архитектуре системы.
