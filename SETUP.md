# Установка и настройка

## Требования

- **Node.js** 20+ (рекомендуется использовать [fnm](https://github.com/Schniz/fnm) или nvm)
- **Bun** 1.0+ — [bun.sh](https://bun.sh)
- **Docker** и **Docker Compose** — для инфраструктуры

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/Tomato1337/ai-medic-helper.git
cd ai-medic-helper
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` при необходимости (по умолчанию подходит для локальной разработки).

### 3. Запуск инфраструктуры

```bash
docker compose up -d
```

Это запустит:
- **PostgreSQL 16** с pgvector (порт 5432)
- **Redis 7** (порт 6379)
- **MinIO** (API: 9000, Console: 9001)
- **API Gateway** (порт 3000)

### 4. Миграции и seed данных

```bash
cd prisma
pnpm install
pnpm migrate:deploy
pnpm seed
pnpm generate
cd ..
```

### 5. Запуск Frontend

```bash
cd frontend
bun install
bun run dev
```

Frontend будет доступен на http://localhost:5173

## Проверка работы

- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:3000/api/health
- **Swagger UI**: http://localhost:3000/api/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Prisma Studio**: `cd prisma && pnpm studio` → http://localhost:5555

## Полезные команды

```bash
# Логи всех сервисов
docker compose logs -f

# Перезапуск с пересборкой
docker compose up -d --build

# Остановка
docker compose down

# Полный сброс (удаляет данные!)
docker compose down -v
```

## Дополнительная документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) — архитектура системы
- [prisma/README.md](./prisma/README.md) — документация БД