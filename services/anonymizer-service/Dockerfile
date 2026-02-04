FROM python:3.11-slim

WORKDIR /app

# Установка Tesseract OCR и системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-rus \
    tesseract-ocr-eng \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Проверяем наличие модели spaCy
RUN python -c "import ru_core_news_md"

# Копируем код приложения
COPY main.py .

# Создаем non-root пользователя
RUN useradd -r -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Порт
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
