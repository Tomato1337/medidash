# Anonymizer Service

Python FastAPI сервис для анонимизации текста и OCR изображений.

## Функции

- **Анонимизация текста**: Natasha NER для русского языка + regex паттерны
- **OCR**: EasyOCR для извлечения текста из изображений (русский + английский)

## Распознаваемые типы PII

- **NAME**: ФИО (через Natasha NER)
- **ADDRESS**: Адреса (через Natasha NER)
- **PHONE**: Телефоны (regex)
- **EMAIL**: Email адреса (regex)
- **DATE**: Даты (regex)
- **ID**: СНИЛС, паспорт (regex)

## API Endpoints

### POST /anonymize
Анонимизация текста.

```json
{
  "text": "Иванов Иван Иванович, телефон +7 999 123-45-67"
}
```

Ответ:
```json
{
  "anonymizedText": "[ИМЯ_1], телефон [ТЕЛЕФОН_1]",
  "piiMappings": [
    {"original": "Иванов Иван Иванович", "replacement": "[ИМЯ_1]", "type": "NAME"},
    {"original": "+7 999 123-45-67", "replacement": "[ТЕЛЕФОН_1]", "type": "PHONE"}
  ]
}
```

### POST /ocr
OCR изображения (base64).

```json
{
  "image": "base64-encoded-image",
  "mimeType": "image/jpeg"
}
```

### GET /health
Проверка здоровья сервиса.

## Технологии

- **FastAPI**: Web framework
- **Natasha**: NER для русского языка
- **EasyOCR**: OCR (русский + английский)
- **Pillow**: Обработка изображений

## Docker

```dockerfile
docker build -t anonymizer-service .
docker run -p 8000:8000 -v easyocr_models:/root/.EasyOCR anonymizer-service
```

**Важно**: Используйте volume для кеширования моделей EasyOCR (`/root/.EasyOCR`).

## Локальный запуск

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Переменные окружения

```env
LOG_LEVEL=info
```

## Особенности

- **Ленивая загрузка EasyOCR**: Модели загружаются при первом OCR запросе
- **Timeout**: OCR может занимать до 120 секунд для больших изображений
- **GPU**: По умолчанию CPU (`gpu=False`), можно включить GPU при необходимости
