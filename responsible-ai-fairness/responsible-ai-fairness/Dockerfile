FROM python:3.9.13-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy lib directory and requirements for layer caching
COPY lib/ lib/
COPY requirements/requirements.txt requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

WORKDIR /app/src

EXPOSE 8000

CMD ["python3", "main_api.py"]
