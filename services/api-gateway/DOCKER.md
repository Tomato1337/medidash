# Docker Build Instructions для API Gateway

## ⚠️ Важно: Контекст сборки

API Gateway использует Prisma schema из **корня проекта** (`/prisma/schema.prisma`), поэтому Docker build **ОБЯЗАТЕЛЬНО** должен запускаться из корня монорепозитория, а не из `services/api-gateway/`.

## 🔨 Development

```bash
# Из КОРНЯ проекта (health-helper/)
docker build -f services/api-gateway/Dockerfile.dev -t api-gateway:dev .

# Запуск
docker run -p 3000:3000 --env-file services/api-gateway/.env api-gateway:dev
```

## 🚀 Production

```bash
# Из КОРНЯ проекта (health-helper/)
docker build -f services/api-gateway/Dockerfile.prod -t api-gateway:prod .

# Запуск
docker run -p 3000:3000 --env-file services/api-gateway/.env api-gateway:prod
```

## 📋 Что происходит в Dockerfile

### Development (`Dockerfile.dev`)
1. Копируем `services/api-gateway/package.json` и устанавливаем зависимости
2. Копируем `/prisma` из корня проекта
3. Запускаем `pnpm generate` в `/app/prisma` → генерирует в `/app/generated/prisma`
4. Копируем код API Gateway
5. Запускаем `pnpm start:dev`

### Production (`Dockerfile.prod`)
1. **Stage 1 (dependencies)**: Устанавливаем production зависимости
2. **Stage 2 (builder)**:
   - Устанавливаем все зависимости
   - Копируем `/prisma` из корня
   - Генерируем Prisma Client (только типы TypeScript)
   - Копируем код и собираем TypeScript
3. **Stage 3 (production)**:
   - Копируем `node_modules`, `prisma/`, `generated/`, `dist/`
   - **При запуске**: сначала `prisma migrate deploy`, затем `pnpm start:prod`
   - Запускаем под непривилегированным пользователем

## 🔄 Миграции в Production

### Почему миграции запускаются при старте контейнера?

1. **Во время build** БД может быть недоступна
2. **При deploy** миграции должны применяться к актуальной БД
3. **Безопасность**: миграции применяются до старта приложения

### Альтернативный подход: Init Container

Если хотите запускать миграции отдельно (рекомендуется для Kubernetes):

```yaml
# docker-compose.yml
services:
  api-gateway-migrations:
    build:
      context: .
      dockerfile: services/api-gateway/Dockerfile.prod
    command: sh -c "cd prisma && npx prisma migrate deploy"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: ${DATABASE_URL}

  api-gateway:
    build:
      context: .
      dockerfile: services/api-gateway/Dockerfile.prod
    command: pnpm start:prod  # Без миграций
    depends_on:
      api-gateway-migrations:
        condition: service_completed_successfully
```

## 🐳 Docker Compose

В `docker-compose.yml` контекст уже настроен правильно:

```yaml
services:
  api-gateway:
    build:
      context: .  # Корень проекта
      dockerfile: services/api-gateway/Dockerfile.dev
    ports:
      - "3000:3000"
    env_file:
      - services/api-gateway/.env
    depends_on:
      - postgres
      - redis
```

## ✅ Проверка

После сборки проверьте, что Prisma Client сгенерирован:

```bash
# Для dev
docker run --rm api-gateway:dev ls -la /app/generated/prisma

# Для prod
docker run --rm api-gateway:prod ls -la /app/generated/prisma
```

Должны увидеть файлы: `index.js`, `index.d.ts`, `schema.prisma`, и т.д.
