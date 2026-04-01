# Dockerfile Optimization Guide for Responsible AI Modules
# ===========================================================================

## What's Changed

### 1. **Consistent Layer Ordering (Build Cache Optimization)**
All Dockerfiles now follow this optimal order:
```
1. FROM python:3.9.13-slim
2. ENV variables
3. WORKDIR /app
4. COPY requirements/requirement.txt  ← BEFORE code
5. RUN pip install
6. COPY . .                           ← AFTER deps (code changes frequently)
7. RUN useradd & chown
8. USER appuser
9. WORKDIR /app/src
10. CMD
```

**Why?** Docker caches layers. When you change app code, steps 1-5 are skipped (cache hit). Without this order, code changes force pip reinstalls.

### 2. **Removed Unnecessary APT/Pip Upgrades**
- Removed `apt-get install build-essential` (unless module needs compilation)
- Removed `pip install --upgrade pip` (pip 20.3+ included in slim image)
- Removed `pip install --prefix=/install` (non-standard)

**Result:** Faster builds, smaller images.

### 3. **Unified Environment Variables**
All modules now export:
```dockerfile
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
```

**Why?**
- `PYTHONDONTWRITEBYTECODE=1` → No `.pyc` files in image (saves space)
- `PYTHONUNBUFFERED=1` → Logs appear immediately (good for containers)
- `PIP_NO_CACHE_DIR=1` → Pip doesn't cache wheels (saves space)

### 4. **Non-Root User (Security)**
All modules now use:
```dockerfile
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser
```

**Why?** Prevents containers from running as root (security best practice).

### 5. **Standardized Paths**
All modules now standardize on:
- `WORKDIR /app` → Build context
- `WORKDIR /app/src` → Runtime (where main.py sits)
- `EXPOSE {port}` → Only for services that need it

**Affected paths:**
- `responsible-ai-admin`: `requirement/requirement.txt` (kept as-is)
- `responsible-ai-backend`: `requirement/requirements.txt` (kept as-is)
- Most others: `requirements/requirement.txt` (standardized)

## Expected Benefits

### Build Speed
- **First build**: No change (all layers must run)
- **Rebuild after code change**: 50-70% faster (dependencies cached)
- **Rebuild after requirements change**: 10-20% faster (code copy skipped)

### Image Size
- Removed unnecessary tools: ~20-30MB reduction per image
- No `.pyc` files: ~10-15MB reduction per image
- Total: **30-45MB smaller per module**

### Security
- Non-root user prevents privilege escalation
- No build tools in runtime image
- Consistent across all modules

## Validation Checklist

For each module, verify:
- [ ] `requirements/requirement.txt` or `requirement/requirement.txt` exists
- [ ] `src/main.py` exists (or adjust WORKDIR/CMD)
- [ ] Correct port in EXPOSE (if applicable)
- [ ] Build with: `docker build -t {module}:latest .`
- [ ] Run with: `docker run -it --rm {module}:latest`

## Build Commands

### Build single module:
```bash
cd responsible-ai-{module}/{sub-path}
docker build -t responsible-ai-{module}:latest .
```

### Build all modules with caching:
```bash
docker compose -f docker-compose.optimized.yml build --pull
```

### Verify image sizes:
```bash
docker images | grep responsible-ai
```

## Rollback (If Issues Arise)

If a module fails to build:
1. Check `requirements/requirement.txt` path
2. Check `WORKDIR /app/src` matches your main.py location
3. Run with `--no-cache`: `docker build --no-cache .`
4. Check logs: `docker logs {container_id}`

## Module-Specific Notes

### responsible-ai-admin, responsible-ai-backend
- Uses `requirement/` instead of `requirements/`
- Dockerfiles already corrected for this path

### responsible-ai-explain, responsible-ai-fairness
- Exposed ports: 8002, 8000
- Uses `requirements/requirement.txt`

### responsible-ai-llm-* modules
- Multiple modules with different ports
- All standardized to 8002 or 8000

### Node.js modules (mfe, shell)
- Not affected by this optimization
- Already have separate Dockerfile patterns

## Next Steps

1. Run builds: `docker compose -f docker-compose.optimized.yml build --pull`
2. Test each service: `docker compose -f docker-compose.optimized.yml --profile {profile} up`
3. Monitor logs: `docker compose -f docker-compose.optimized.yml logs -f {service}`
4. Check sizes: `docker images | grep responsible-ai`
