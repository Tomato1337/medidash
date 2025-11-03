# Архитектура системы Medical Docs

## Обзор

Система построена на микросервисной архитектуре с использованием NestJS, Fastify и PostgreSQL с pgvector для векторного поиска.

## Компоненты системы

### Frontend
- **Технологии**: React 19, TanStack Query, TanStack Router
- **Архитектура**: Feature-Sliced Design (FSD)
- **Коммуникация**: REST API + WebSocket для real-time обновлений

### Backend Services

#### 1. API Gateway (Port: 3000)
**Ответственность**: Единая точка входа для всех запросов

**Функции**:
- Аутентификация (JWT)
- Rate limiting
- Маршрутизация к микросервисам
- WebSocket сервер для уведомлений
- CORS management

**Endpoints**:
```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /api/documents/*     → Document Service
POST   /api/processing/*    → Processing Service
GET    /api/search/*        → Search Service
```

#### 2. Document Service (Port: 3001)
**Ответственность**: Управление документами и файлами

**Функции**:
- CRUD операции с Records и Documents
- Загрузка файлов в MinIO
- Управление метаданными
- Отслеживание статусов

**Database Models**:
- User
- Record
- Document
- Tag
- RecordTag

#### 3. Processing Service (Port: 3002)
**Ответственность**: Фоновая обработка документов

**Функции**:
- Парсинг PDF и текстовых файлов
- Разбивка на чанки
- Управление очередями (BullMQ)
- Координация с AI Service

**Очереди**:
- `document-processing`: главная очередь
- `document-parsing`: парсинг файлов
- `document-chunking`: разбивка текста

#### 4. AI Service (Port: 3003)
**Ответственность**: Операции с искусственным интеллектом

**Функции**:
- Анонимизация (PII removal)
- Векторизация текста (embeddings)
- Автоматическое тегирование
- Извлечение даты
- Генерация названия
- Суммаризация документов

**AI Models**:
- GPT-4: анонимизация, тегирование, суммаризация
- text-embedding-ada-002: векторизация (1536 dimensions)

#### 5. Search Service (Port: 3004)
**Ответственность**: Поиск по документам

**Функции**:
- Семантический поиск (pgvector)
- Лексический поиск (PostgreSQL FTS)
- Гибридный поиск
- Фильтрация и ранжирование
- Кэширование результатов

## Инфраструктура

### PostgreSQL + pgvector
- **Версия**: PostgreSQL 16
- **Extension**: pgvector для векторного поиска
- **Хранение**: 
  - Метаданные документов
  - Пользователи и сессии
  - Document chunks с embeddings
  - PII mappings

### Redis
- **Использование**:
  - Очереди BullMQ
  - Кэширование поисковых запросов
  - Session storage
- **Политика**: allkeys-lru, maxmemory 256mb

### MinIO (S3-compatible)
- **Использование**: Хранение оригинальных файлов
- **Bucket**: medical-documents
- **Retention**: Бессрочное хранение

## Потоки данных

### 1. Загрузка и обработка документа

```
User → Frontend
  ↓
Frontend → API Gateway (POST /api/documents/upload)
  ↓
API Gateway → Document Service
  ↓
Document Service:
  1. Сохранение файла в MinIO
  2. Создание записи Document (status: UPLOADING)
  3. Добавление задачи в очередь
  ↓
Processing Service (BullMQ worker):
  1. Получение задачи
  2. Загрузка файла из MinIO
  3. Парсинг документа (PDF/TXT → текст)
  4. Разбивка на чанки
  5. Отправка в AI Service
  ↓
AI Service:
  1. Анонимизация каждого чанка
  2. Векторизация (создание embeddings)
  3. Автоматическое тегирование
  4. Извлечение даты
  5. Генерация названия
  ↓
Processing Service:
  1. Сохранение DocumentChunks с embeddings
  2. Сохранение PII mappings
  3. Обновление Document (status: COMPLETED)
  4. Уведомление пользователя через WebSocket
```

### 2. Поиск документов

```
User → Frontend (поисковый запрос)
  ↓
Frontend → API Gateway (GET /api/search?query=...)
  ↓
API Gateway → Search Service
  ↓
Search Service:
  1. Проверка кэша в Redis
  2. Если нет в кэше:
     - Векторизация запроса (AI Service)
     - Семантический поиск (pgvector)
     - Лексический поиск (PostgreSQL FTS)
     - Комбинирование результатов
  3. Ранжирование
  4. Кэширование результата
  5. Возврат результатов
  ↓
Frontend → Отображение результатов
```

### 3. Суммаризация Record

```
User → Frontend (кнопка "Анализ")
  ↓
Frontend → API Gateway (POST /api/processing/summarize/:recordId)
  ↓
API Gateway → Processing Service
  ↓
Processing Service:
  1. Получение всех документов Record
  2. Создание задачи суммаризации
  ↓
AI Service:
  1. Объединение всех анонимизированных текстов
  2. Суммаризация через GPT-4
  3. Выделение ключевых моментов
  ↓
Processing Service:
  1. Сохранение summary в Record
  2. Уведомление пользователя
```

## Безопасность

### Аутентификация
- JWT tokens (access: 15min, refresh: 7d)
- Хранение refresh tokens в базе
- Автоматическое обновление через /auth/refresh

### Авторизация
- Guards на уровне API Gateway
- Проверка userId в каждом сервисе
- Row-Level Security в запросах к БД

### Анонимизация
- Все PII данные заменяются перед векторизацией
- PII mappings хранятся отдельно с шифрованием
- Возможность деанонимизации только для владельца

### Хранение файлов
- Оригинальные файлы в MinIO
- Доступ только через presigned URLs
- TTL для временных ссылок

## Масштабирование

### Горизонтальное
- Каждый микросервис может масштабироваться независимо
- Load balancing через API Gateway
- Stateless сервисы

### Вертикальное
- PostgreSQL: увеличение памяти для pgvector индексов
- Redis: расширение для кэша
- MinIO: добавление хранилища

### Оптимизации
- Индексы в PostgreSQL на часто запрашиваемых полях
- Кэширование в Redis для поисковых запросов
- Lazy loading для больших документов
- Chunking для параллельной обработки

## Мониторинг и логирование

### Логи
- Структурированные JSON логи
- Уровни: debug, info, warn, error
- Централизованное хранение (будущее: ELK stack)

### Метрики
- Health checks для каждого сервиса
- Мониторинг очередей BullMQ
- Отслеживание времени обработки

### Алерты
- Ошибки обработки документов
- Переполнение очередей
- Недоступность сервисов

## Развертывание

### Development
```bash
docker-compose up -d
cd services/api-gateway && pnpm start:dev
cd services/document-service && pnpm start:dev
# ... остальные сервисы
```

### Production
- Docker Compose с production конфигурацией
- Или Kubernetes для оркестрации
- CI/CD через GitHub Actions

## Будущие улучшения

1. **Кэширование**: добавить Redis для API responses
2. **Message Broker**: перейти на RabbitMQ/Kafka для межсервисной коммуникации
3. **API Versioning**: добавить версионирование API
4. **GraphQL**: рассмотреть GraphQL Federation
5. **Observability**: Prometheus + Grafana
6. **Service Mesh**: Istio для production
7. **OCR**: добавить распознавание отсканированных документов
8. **Multi-tenancy**: поддержка организаций
