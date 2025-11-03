# Medical Documents Management System

Система для управления медицинскими документами с автоматическим парсингом, анонимизацией и семантическим поиском.

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                  Feature-Sliced Design (FSD)                     │
│              TanStack Query + Axios + WebSocket                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/WSS
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (NestJS)                        │
│         Authentication, Rate Limiting, Routing                   │
│                   JWT, Guards, Interceptors                      │
└───────┬──────────┬──────────┬──────────┬────────────────────────┘
        │          │          │          │
        ↓          ↓          ↓          ↓
┌───────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐
│ Document  │ │Processing│ │   AI     │ │  Search    │
│ Service   │ │ Service  │ │ Service  │ │  Service   │
│ (NestJS)  │ │ (NestJS) │ │ (NestJS) │ │  (NestJS)  │
└─────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬─────┘
      │            │            │               │
      └────────────┴────────────┴───────────────┘
                   │
      ┌────────────┼────────────┬────────────────┐
      │            │            │                │
      ↓            ↓            ↓                ↓
┌──────────┐  ┌────────┐  ┌─────────┐    ┌──────────┐
│PostgreSQL│  │ Redis  │  │  MinIO  │    │ BullMQ   │
│+pgvector │  │ Cache  │  │   S3    │    │  Queue   │
└──────────┘  └────────┘  └─────────┘    └──────────┘
```

## 📁 Структура проекта

```
medical-docs-app/
├── services/
│   ├── api-gateway/          # API Gateway - точка входа для всех запросов
│   ├── document-service/     # Управление документами и файлами
│   ├── processing-service/   # Обработка и парсинг документов
│   ├── ai-service/           # AI операции (тегирование, анонимизация)
│   ├── search-service/       # Семантический и лексический поиск
│   └── shared-types/         # Общие TypeScript типы
├── backend/                  # Существующий backend (будет мигрирован)
├── frontend/                 # React приложение (FSD)
├── prisma/                   # Схемы базы данных
├── docker-compose.yml        # Инфраструктура (Postgres, Redis, MinIO)
└── .env.example              # Пример переменных окружения
```

## 🚀 Быстрый старт

📖 **Полная инструкция по установке**: см. [SETUP.md](./SETUP.md)

### Кратко

1. Скопируйте `.env.example` в `.env` и настройте переменные
2. Запустите инфраструктуру: `docker-compose up -d`
3. Примените миграции: `cd prisma && pnpm migrate:deploy`
4. Заполните базовые данные: `pnpm seed`
5. Сгенерируйте Prisma Client: `pnpm generate`

📚 **Документация**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Архитектура системы
- [SETUP.md](./SETUP.md) - Инструкция по установке
- [prisma/README.md](./prisma/README.md) - Документация по базе данных

## 🛠️ Технологический стек

### Backend
- **Framework**: NestJS + Fastify
- **Database**: PostgreSQL 16 + pgvector
- **ORM**: Prisma
- **Cache**: Redis 7
- **Storage**: MinIO (S3-compatible)
- **Queue**: BullMQ
- **AI**: OpenAI API

### Frontend
- **Framework**: React 19
- **Architecture**: Feature-Sliced Design (FSD)
- **State Management**: TanStack Query
- **Routing**: TanStack Router

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Vector Search**: pgvector

## 📝 Основные функции

1. **Загрузка документов**: PDF и текстовые файлы
2. **Автоматический парсинг**: Извлечение текста из документов
3. **Анонимизация**: Удаление персональных данных (PII)
4. **AI-тегирование**: Автоматическая категоризация документов
5. **Суммаризация**: Объединение множества документов
6. **Семантический поиск**: Поиск по смыслу с использованием векторных эмбеддингов
7. **Лексический поиск**: Традиционный поиск по ключевым словам
8. **Хранение оригиналов**: Все исходные файлы сохраняются в MinIO

## 🔧 Переменные окружения

См. файл `.env.example` для полного списка конфигурационных переменных.

## 📄 Лицензия

[Укажите вашу лицензию]
