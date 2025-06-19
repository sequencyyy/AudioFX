FROM python:3.12-slim

WORKDIR /app

# Установка FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Копирование зависимостей
COPY requirements.txt .

# RUN pip install --upgrade pip

RUN pip install --no-cache-dir --timeout 100 -r requirements.txt

# Копирование кода
COPY . .

# Запуск сервера
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]