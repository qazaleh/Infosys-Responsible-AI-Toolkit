FROM python:3.9.13-slim

<<<<<<< Updated upstream
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
=======
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

COPY . .

# Keep pip tooling consistent with project docs and install dependencies once.
RUN python -m pip install --upgrade pip==24.2 \
	&& pip3 install --no-cache-dir -r requirements/requirement.txt

WORKDIR /app/src

CMD ["sh", "-c", "python3 privacy_main.py"]


>>>>>>> Stashed changes

WORKDIR /app

# Copy requirements first for layer caching
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

CMD ["python3", "main.py"]
