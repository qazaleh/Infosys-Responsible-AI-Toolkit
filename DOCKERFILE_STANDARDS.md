# Python Service Dockerfile Standards

This repository uses a standardized pattern for Python services to minimize repetition and ensure consistency.

## Key Standards

All Python service Dockerfiles in this repo follow these patterns:

### Base Image
- `python:3.9.13-slim` — consistent version across all services

### Environment Variables
```dockerfile
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
```

### User & Security
- Non-root user (`appuser`) with UID 1000 created during build
- All files owned by `appuser` for least privilege execution

### Layer Ordering (Best Practices)
1. Base image + ENV variables
2. WORKDIR
3. COPY requirements → Install dependencies (expensive, cached layer)
4. COPY application code (changes frequently, uses cached deps)
5. Create user & fix permissions
6. Switch to non-root user
7. Expose ports (if applicable)
8. CMD/ENTRYPOINT

## Module Structure

Each service module should follow this structure:
```
responsible-ai-{module}/
├── responsible-ai-{module}/
│   ├── Dockerfile
│   ├── requirements/
│   │   └── requirement.txt
│   ├── src/
│   │   └── main.py
│   └── config/
└── README.md
```

## Standard Dockerfile Pattern

```dockerfile
FROM python:3.9.13-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Copy requirements first (cacheable layer)
COPY requirements/requirement.txt requirements/requirement.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements/requirement.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Set working directory for application
WORKDIR /app/src

# Expose port if needed (optional)
# EXPOSE 8002

CMD ["python3", "main.py"]
```

## Port Exposure

If your service exposes a port, add the EXPOSE instruction before CMD:

```dockerfile
EXPOSE 8002
```

## Updating Requirements File Paths

Some modules use `requirements/requirement.txt`, others use `requirement/requirements.txt`. Standardize on:
```
requirements/requirement.txt  ← preferred pattern
```

Update the COPY instruction accordingly if your module differs.

## Building & Running

### Build a module
```bash
cd responsible-ai-{module}/responsible-ai-{module}
docker build -t responsible-ai-{module}:latest .
```

### Run a module
```bash
docker run -d --name {module} \
  -e ENV_VAR=value \
  responsible-ai-{module}:latest
```

### Using Docker Compose (root-level)

See `docker-compose.yml` at the repo root for multi-service orchestration.

## Migration Checklist

When updating a module's Dockerfile:
- [ ] Use `python:3.9.13-slim` base
- [ ] Set all ENV variables (DEBIAN_FRONTEND, PYTHONDONTWRITEBYTECODE, PYTHONUNBUFFERED, PIP_NO_CACHE_DIR)
- [ ] COPY requirements before COPY . . (layer caching)
- [ ] Create appuser with UID 1000
- [ ] chown all files to appuser
- [ ] Switch USER before CMD
- [ ] Set WORKDIR to /app/src or appropriate subdirectory
- [ ] Add EXPOSE if the service runs a server
- [ ] Use `pip install --no-cache-dir` or `pip3 install --no-cache-dir`

## Future Enhancements

1. **Multi-stage builds** — For services with large build dependencies, use multi-stage to reduce final image size:
   ```dockerfile
   FROM python:3.9.13-slim AS builder
   RUN pip install --user -r requirements.txt
   
   FROM python:3.9.13-slim
   COPY --from=builder /root/.local /root/.local
   ...
   ```

2. **Shared base image** — Push a public `responsible-ai:base-py3.9` to Docker Hub and use:
   ```dockerfile
   FROM responsible-ai:base-py3.9
   COPY requirements/requirement.txt requirements/requirement.txt
   RUN pip install --no-cache-dir -r requirements/requirement.txt
   COPY . .
   CMD ["python3", "main.py"]
   ```

3. **Security scanning** — Use Docker Scout to check for vulnerabilities:
   ```bash
   docker scout cves responsible-ai-{module}:latest
   ```
