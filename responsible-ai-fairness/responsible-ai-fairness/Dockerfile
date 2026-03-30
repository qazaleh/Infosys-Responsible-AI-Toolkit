FROM python:3.9.13-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY . .

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && python -m pip install --upgrade pip \
    && pip install --prefix=/install --retries 10 --timeout 180 -r requirements/requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/src

EXPOSE 8000

CMD ["python", "main_api.py"]
