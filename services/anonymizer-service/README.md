# Anonymizer Service

Python FastAPI сервис для анонимизации текста и OCR изображений.

## Функции

- **Анонимизация текста**: spaCy NER для русского языка + regex паттерны
- **OCR**: Tesseract для извлечения текста из изображений (русский + английский)

## Распознаваемые типы PII

- **NAME**: ФИО (через spaCy NER)
- **ADDRESS**: Адреса (через spaCy NER)
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
- **spaCy**: NER для русского языка (ru_core_news_md)
- **Tesseract**: OCR (русский + английский)
- **Pillow**: Обработка изображений

## Docker

```dockerfile
docker build -t anonymizer-service .
docker run -p 8000:8000 anonymizer-service
```

**Важно**: Для работы OCR нужно, чтобы Tesseract был установлен в образе (уже включено в Dockerfile).

## Локальный запуск

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Для локального запуска необходим установленный Tesseract OCR:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-rus tesseract-ocr-eng
```

## Переменные окружения

```env
LOG_LEVEL=info
```

## Особенности

- **Быстрый OCR через Tesseract**: Оптимизация размера изображений для ускорения
- **Timeout**: OCR может занимать время для больших изображений
