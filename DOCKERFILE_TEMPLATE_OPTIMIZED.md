# Optimized Dockerfile Template for Python Services
# ===========================================================================
# Use this template for ALL Python modules in responsible-ai-toolkit
# Location: each module's responsible-ai-{module}/Dockerfile
#
# Steps to apply to each module:
# 1. Copy this entire template
# 2. Replace {MODULE_NAME} with your module name
# 3. Adjust WORKDIR and CMD if different from defaults
# 4. Ensure requirements/requirement.txt exists in module root
# ===========================================================================

FROM python:3.9.13-slim

# Production environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy requirements FIRST (expensive layer, cached longer)
# This allows code changes without re-installing dependencies
COPY requirements/requirement.txt requirements/requirement.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements/requirement.txt

# Copy application code (cheap layer, changes frequently)
COPY . .

# Create non-root user for security
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Set working directory for application entry point
WORKDIR /app/src

# Expose port if service runs a server (uncomment if needed)
# EXPOSE 8000

# Application entry point
CMD ["python3", "main.py"]
