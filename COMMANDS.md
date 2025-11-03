# Makefile-style команды для проекта Medical Docs

## ⚠️ Важно: Контекст сборки Docker

Все Docker команды должны запускаться из **корня проекта** (`health-helper/`), потому что API Gateway использует Prisma schema из `/prisma/`.

## Инфраструктура

### Запуск всех сервисов (включая API Gateway)
```bash
# Из корня проекта
docker-compose up -d
```

### Запуск только инфраструктуры (без микросервисов)
```bash
docker-compose up -d postgres redis minio
```

### Запуск с пересборкой
```bash
docker-compose up -d --build
```

### Остановка всех сервисов
```bash
docker-compose down
```

### Остановка + удаление volumes (ОСТОРОЖНО! Удалит все данные)
```bash
docker-compose down -v
```

### Просмотр логов
```bash
docker-compose logs -f
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
docker-compose logs -f api-gateway
```

### Перезапуск конкретного сервиса
```bash
docker-compose restart postgres
docker-compose restart redis
docker-compose restart minio
docker-compose restart api-gateway
```

## База данных (Prisma)

### Установка зависимостей
```bash
cd prisma
pnpm install
```

### Применение миграций (Development)
```bash
cd prisma
pnpm migrate:dev
```

### Применение миграций (Production)
```bash
cd prisma
pnpm migrate:deploy
```

### Создание новой миграции
```bash
cd prisma
pnpm migrate:dev --name your_migration_name
```

### Генерация Prisma Client
```bash
cd prisma
pnpm generate
```

### Заполнение базовых данных (seed)
```bash
cd prisma
pnpm seed
```

### Открыть Prisma Studio
```bash
cd prisma
pnpm studio
# Откроется на http://localhost:5555
```

### Сброс базы данных (ОСТОРОЖНО!)
```bash
cd prisma
pnpm migrate:reset
```

## PostgreSQL

### Подключение через Docker
```bash
docker exec -it medical-docs-postgres psql -U postgres -d medical_docs
```

### Подключение через локальный psql
```bash
psql -h localhost -p 5432 -U postgres -d medical_docs
```

### Создание бэкапа
```bash
docker exec medical-docs-postgres pg_dump -U postgres medical_docs > backup.sql
```

### Восстановление из бэкапа
```bash
docker exec -i medical-docs-postgres psql -U postgres medical_docs < backup.sql
```

## Redis

### Подключение к Redis CLI
```bash
docker exec -it medical-docs-redis redis-cli
```

### Очистка всех данных в Redis
```bash
docker exec -it medical-docs-redis redis-cli FLUSHALL
```

### Просмотр всех ключей
```bash
docker exec -it medical-docs-redis redis-cli KEYS '*'
```

## MinIO

### Открыть MinIO Console
```
URL: http://localhost:9001
Login: minioadmin
Password: minioadmin (или из .env)
```

### API endpoint
```
URL: http://localhost:9000
```

## Микросервисы

### API Gateway (Port: 3000)

**Локальная разработка:**
```bash
cd services/api-gateway

# Установка зависимостей
pnpm install

# Генерация Prisma Client (из корня!)
cd ../../prisma
pnpm generate
cd ../services/api-gateway

# Запуск в dev режиме
pnpm start:dev

# Production build
pnpm build
pnpm start:prod

# Swagger UI
# http://localhost:3000/api/docs
```

**Docker:**
```bash
# Из КОРНЯ проекта (важно!)
docker build -f services/api-gateway/Dockerfile.dev -t api-gateway:dev .

# Запуск
docker run -p 3000:3000 --env-file services/api-gateway/.env api-gateway:dev

# Production
docker build -f services/api-gateway/Dockerfile.prod -t api-gateway:prod .
```

### Document Service (Port: 3001)
```bash
cd services/document-service
pnpm install
pnpm start:dev
```

### Processing Service (Port: 3002)
```bash
cd services/processing-service
pnpm install
pnpm start:dev
```

### AI Service (Port: 3003)
```bash
cd services/ai-service
pnpm install
pnpm start:dev
```

### Search Service (Port: 3004)
```bash
cd services/search-service
pnpm install
pnpm start:dev
```

## Frontend

### Запуск в development режиме
```bash
cd frontend
pnpm install
pnpm dev
# Откроется на http://localhost:5173
```

### Сборка для production
```bash
cd frontend
pnpm build
```

### Preview production build
```bash
cd frontend
pnpm preview
```

## Тестирование

### Запуск всех тестов
```bash
# В каждом микросервисе
pnpm test
```

### Запуск тестов с покрытием
```bash
pnpm test:cov
```

### E2E тесты
```bash
pnpm test:e2e
```

## Линтинг и форматирование

### ESLint
```bash
pnpm lint
pnpm lint:fix
```

### Prettier (если используется)
```bash
pnpm format
```

## Полезные SQL запросы

### Проверка наличия pgvector extension
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Просмотр всех таблиц
```sql
\dt
```

### Просмотр индексов
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'DocumentChunk';
```

### Подсчёт записей во всех таблицах
```sql
SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM quote_ident(schemaname) || '.' || quote_ident(tablename)) as count
FROM pg_tables
WHERE schemaname = 'public';
```

### Размер базы данных
```sql
SELECT pg_size_pretty(pg_database_size('medical_docs'));
```

## Troubleshooting

### Очистка Docker
```bash
# Остановить все контейнеры
docker-compose down

# Удалить все volumes
docker-compose down -v

# Очистить Docker кэш
docker system prune -a
```

### Пересоздание контейнеров
```bash
docker-compose up -d --force-recreate
```

### Просмотр использования ресурсов
```bash
docker stats
```
