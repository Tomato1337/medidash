# AI Service

## Назначение

AI Service предоставляет все операции, связанные с искусственным интеллектом:

- **Анонимизация текста** (PII removal) - удаление персональных данных через Python сервис с spaCy NER
- **Векторизация текста** - создание embeddings через Gemini API (768 dimensions)
- **Автоматическое тегирование** документов
- **Извлечение даты** из документа
- **Генерация названия** документа
- **Суммаризация** (summarization) документов через Gemini 2.0 Flash

## Технологии

- NestJS + Fastify
- **Gemini API** (text-embedding-004, gemini-2.0-flash)
- **Python Anonymizer Service** (spaCy NER + Tesseract)
- Axios для HTTP вызовов

## Основные операции

### Анонимизация (PII Removal)
- Обнаружение и замена через spaCy NER + regex:
  - ФИО
  - Адреса  
  - Номера телефонов
  - Email адреса
  - Даты
  - СНИЛС, паспортные данные
- Сохранение PII маппинга для возможной деанонимизации

### Векторизация
- Создание embeddings через Gemini text-embedding-004 (**768 dimensions**)
- Rate limiting для free tier (1.5 сек между запросами)

### Суммаризация
- Генерация краткого резюме через Gemini 2.0 Flash
- TONL оптимизация для экономии токенов

## Порт

По умолчанию: **3003**

## Переменные окружения

```env
AI_SERVICE_PORT=3003
GEMINI_API_KEY=your-gemini-api-key
ANONYMIZER_SERVICE_URL=http://anonymizer-service:8000
GEMINI_RATE_LIMIT_DELAY_MS=1500
```

## API Endpoints

- `POST /api/ai/anonymize` - Анонимизация текста
- `POST /api/ai/embeddings` - Создание embedding для одного текста
- `POST /api/ai/embeddings/batch` - Batch создание embeddings
- `POST /api/ai/summary` - Генерация резюме
- `POST /api/ai/process` - Полная обработка документа
- `GET /api/ai/health` - Проверка здоровья сервисов

## Зависимости

- **Anonymizer Service** (Python): должен быть запущен для анонимизации и OCR
- **Gemini API Key**: получить на https://aistudio.google.com/

## Запуск

```bash
npm install
npm run start:dev
```
