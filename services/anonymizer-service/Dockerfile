FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей для OpenCV и EasyOCR
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt .
RUN pip install -r requirements.txt

# Предзагрузка моделей Natasha при сборке
RUN python -c "from natasha import NewsEmbedding; NewsEmbedding()"

# Копируем код приложения
COPY main.py .

# Порт
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=120s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Запуск
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
