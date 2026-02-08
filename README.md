# Medidash

Local-first система для умного хранения и AI анализа медицинских
документов.

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│              Feature-Enhanced Organizational Design (FEOD)       │
│              TanStack Query + Router + Service Worker            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
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
health-helper/
├── frontend/                 # React приложение
│   └── src/
│       ├── app/              # Инициализация, роутинг, провайдеры
│       ├── pages/            # UI страниц (чистая композиция)
│       ├── modules/          # Бизнес-логика (domain, application, infrastructure)
│       └── shared/           # Переиспользуемые компоненты, утилиты, API
├── services/
│   ├── api-gateway/          # API Gateway — точка входа
│   ├── document-service/     # Управление документами
│   ├── processing-service/   # Обработка и парсинг
│   ├── ai-service/           # AI операции
│   ├── search-service/       # Семантический поиск
│   └── shared-types/         # Общие TypeScript типы
├── prisma/                   # Схемы базы данных
├── docker-compose.yml        # Инфраструктура
└── .env.example              # Переменные окружения
```

## 🚀 Быстрый старт


```bash
# 1. Настройка
cp .env.example .env

# 2. Инфраструктура
docker compose up -d

# 3. База данных
cd prisma && npm install && npm run migrate:deploy && npm run seed && cd ..

# 4. Frontend
cd frontend && bun install && bun run dev
```

## 🛠️ Технологический стек

### Backend
| Компонент | Технология |
|-----------|-----------|
| Framework | NestJS + Fastify |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Cache | Redis 7 |
| Storage | MinIO (S3) |
| Queue | BullMQ |
| AI | OpenAI API |

### Frontend
| Компонент | Технология |
|-----------|-----------|
| Framework | React 19 + Vite |
| Architecture | FEOD (модульная архитектура) |
| State | TanStack Query |
| Routing | TanStack Router |
| Offline | Service Worker + IndexedDB |

## 📝 Основные функции

- **Загрузка документов** — PDF и текстовые файлы
- **Автоматический парсинг** — извлечение текста
- **Анонимизация** — удаление персональных данных (PII)
- **AI-тегирование** — автоматическая категоризация
- **Суммаризация** — объединение документов
- **Семантический поиск** — поиск по смыслу (pgvector)
- **Offline-режим** — работа без интернета

## 📚 Документация

- [SETUP.md](./SETUP.md) — установка и настройка
- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура системы
- [prisma/README.md](./prisma/README.md) — база данных