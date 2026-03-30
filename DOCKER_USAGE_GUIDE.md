# 🐳 Docker Compose Usage Guide - Optimized Setup

## Overview

The **docker-compose.optimized.yml** file provides a streamlined way to run all 15 containerizable modules of the Responsible AI Toolkit with intelligent profile-based grouping.

### 📦 What's Included

- **15 Microservices** organized into 8 logical profiles
- **Shared MongoDB** for all services
- **Dedicated network** for inter-service communication
- **Named volumes** for persistent data
- **Health checks** for critical services

---

## 🏗️ Architecture

### Services by Profile

| Profile | Services | Description |
|---------|----------|-------------|
| **Core** | mongo | Always runs - shared MongoDB database |
| **ui** | admin, backend, mfe, shell | User interface and admin services |
| **ml-ops** | model-detail, reporting-tool | ML operations and model management |
| **explainability** | ai-explain | AI model explainability |
| **fairness** | fairness | Fairness testing and analysis |
| **privacy** | privacy | Privacy analysis tools |
| **llm** | llm-explain, llm-benchmarking | LLM services |
| **security** | security, moderationlayer, moderationmodel | Security & moderation |
| **storage** | file-storage | File storage and management |

### Port Mapping

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| mongo | 27017 | 27017 | mongodb://localhost:27017 |
| admin | 30016 | 30016 | http://localhost:30016 |
| backend | 30019 | 30019 | http://localhost:30019 |
| shell | 30010 | 30010 | http://localhost:30010 |
| mfe | 30055 | 30055 | http://localhost:30055 |
| model-detail | 80 | 30020 | http://localhost:30020 |
| reporting-tool | 80 | 30021 | http://localhost:30021 |
| ai-explain | 8002 | 8002 | http://localhost:8002 |
| fairness | 8000 | 8000 | http://localhost:8000 |
| privacy | 30002 | 30002 | http://localhost:30002 |
| llm-explain | 8002 | 8003 | http://localhost:8003 |
| llm-benchmarking | 8000 | 30022 | http://localhost:30022 |
| security | 80 | 30023 | http://localhost:30023 |
| moderationlayer | 8000 | 30024 | http://localhost:30024 |
| moderationmodel | 8000 | 30025 | http://localhost:30025 |
| file-storage | 8000 | 30026 | http://localhost:30026 |

---

## 🚀 Usage Examples

### 1. Start Core + UI Only (Lightweight)

Perfect for frontend development and basic admin tasks.

```bash
docker compose -f docker-compose.optimized.yml --profile ui up -d
```

**Services started:** mongo, admin, backend, mfe, shell

---

### 2. Start UI + ML Capabilities

For ML model work including explainability and fairness testing.

```bash
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile ml-ops \
  --profile explainability \
  --profile fairness \
  up -d
```

**Services started:** mongo, admin, backend, mfe, shell, model-detail, reporting-tool, ai-explain, fairness

---

### 3. Start UI + LLM Services

For working with Large Language Models.

```bash
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile llm \
  up -d
```

**Services started:** mongo, admin, backend, mfe, shell, llm-explain, llm-benchmarking

---

### 4. Start UI + Security Suite

For security testing and content moderation.

```bash
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile security \
  up -d
```

**Services started:** mongo, admin, backend, mfe, shell, security, moderationlayer, moderationmodel

---

### 5. Start Everything (Full Stack)

Run all services for complete functionality.

```bash
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile ml-ops \
  --profile explainability \
  --profile fairness \
  --profile privacy \
  --profile llm \
  --profile security \
  --profile storage \
  up -d
```

---

### 6. Recommended Development Setup

Balanced setup for most development work:

```bash
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile ml-ops \
  --profile storage \
  up -d
```

---

## 🛠️ Common Operations

### View Running Services

```bash
docker compose -f docker-compose.optimized.yml ps
```

### View Logs

```bash
# All services
docker compose -f docker-compose.optimized.yml logs -f

# Specific service
docker compose -f docker-compose.optimized.yml logs -f admin

# Multiple services
docker compose -f docker-compose.optimized.yml logs -f admin backend
```

### Stop Services

```bash
# Stop all running services (keeps volumes)
docker compose -f docker-compose.optimized.yml down

# Stop and remove volumes
docker compose -f docker-compose.optimized.yml down -v
```

### Restart a Service

```bash
docker compose -f docker-compose.optimized.yml restart admin
docker compose -f docker-compose.optimized.yml restart ai-explain
```

### Rebuild a Service

```bash
# Rebuild specific service
docker compose -f docker-compose.optimized.yml build admin
docker compose -f docker-compose.optimized.yml build ai-explain fairness llm-explain

# Rebuild and restart
docker compose -f docker-compose.optimized.yml up -d --build admin
docker compose -f docker-compose.optimized.yml up -d --build ai-explain
docker compose -f docker-compose.optimized.yml up -d --build fairness
docker compose -f docker-compose.optimized.yml up -d --build llm-explain
```

Use Compose service names for these commands. Examples:
`admin`, `backend`, `mfe`, `shell`, `model-detail`, `reporting-tool`, `ai-explain`, `fairness`, `privacy`, `llm-explain`, `llm-benchmarking`, `security`, `moderationlayer`, `moderationmodel`, `file-storage`, and `mongo`.

### Access Service Shell

```bash
# MongoDB shell
docker exec -it rai-mongo mongosh

# Admin service shell
docker exec -it rai-admin bash

# Any service shell
docker exec -it rai-<service-name> bash
```

---

## 📊 Resource Management

### Estimated Resource Usage by Profile

| Configuration | Containers | Est. Memory | Est. CPU |
|---------------|------------|-------------|----------|
| Core only | 1 | ~500MB | 0.5 cores |
| UI | 5 | ~3GB | 2 cores |
| UI + ML-ops | 7 | ~5GB | 3 cores |
| UI + LLM | 7 | ~6GB | 3 cores |
| UI + Security | 8 | ~5GB | 3 cores |
| Full Stack | 16 | ~12GB | 6 cores |

*Note: Actual usage depends on workload and data*

---

## 🔧 Troubleshooting

### Issue: Port Already in Use

```bash
# Find what's using the port
lsof -i :30016

# Kill the process or change the port in docker-compose.optimized.yml
```

### Issue: Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.optimized.yml logs service-name

# Rebuild from scratch
docker compose -f docker-compose.optimized.yml build --no-cache service-name
docker compose -f docker-compose.optimized.yml up -d service-name
```

### Issue: MongoDB Connection Failed

```bash
# Check MongoDB health
docker compose -f docker-compose.optimized.yml ps mongo

# Restart MongoDB
docker compose -f docker-compose.optimized.yml restart mongo

# Wait for healthy status
docker compose -f docker-compose.optimized.yml up -d
```

### Issue: Out of Memory

```bash
# Stop unused services
docker compose -f docker-compose.optimized.yml stop service-name

# Or run with fewer profiles
docker compose -f docker-compose.optimized.yml --profile ui up -d
```

### Clean Up Everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose -f docker-compose.optimized.yml down -v

# Remove unused Docker resources
docker system prune -a --volumes
```

---

## 🔄 Migration from Original docker-compose.yml

### Differences

1. **Better organization**: Services grouped by logical profiles
2. **More services**: 15 services vs 10 in original
3. **Dedicated network**: All services on `rai-network`
4. **Named volumes**: Better volume management
5. **Consistent naming**: All containers prefixed with `rai-`

### How to Switch

```bash
# Stop old setup
docker compose down

# Start new setup
docker compose -f docker-compose.optimized.yml --profile ui --profile ml-ops up -d
```

**Note:** Data in MongoDB volume is preserved if you keep the same volume name.

---

## 💡 Best Practices

1. **Start small**: Begin with `--profile ui` and add profiles as needed
2. **Use logs**: Monitor services with `logs -f` during development
3. **Health checks**: Wait for MongoDB to be healthy before starting dependent services
4. **Named volumes**: Use named volumes for important data (already configured)
5. **Resource limits**: Consider adding resource limits in production
6. **Environment files**: Use `.env` files for sensitive configuration

---

## 📝 Creating Custom Profiles

You can create your own profile combinations by editing `docker-compose.optimized.yml`:

```yaml
my-service:
  profiles: ["custom", "ui"]  # Add to multiple profiles
  # ... rest of config
```

Then run:

```bash
docker compose -f docker-compose.optimized.yml --profile custom up -d
```

---

## 🎯 Quick Reference

### One-liner Setups

```bash
# Frontend dev
docker compose -f docker-compose.optimized.yml --profile ui up -d

# ML dev
docker compose -f docker-compose.optimized.yml --profile ui --profile ml-ops --profile explainability --profile fairness up -d

# LLM dev
docker compose -f docker-compose.optimized.yml --profile ui --profile llm up -d

# Security dev
docker compose -f docker-compose.optimized.yml --profile ui --profile security up -d

# Full stack
docker compose -f docker-compose.optimized.yml --profile ui --profile ml-ops --profile explainability --profile fairness --profile privacy --profile llm --profile security --profile storage up -d
```

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Compose Profiles](https://docs.docker.com/compose/profiles/)
- [Project README](./README.md)

---

**Last Updated:** 2026-03-27  
**Optimized Compose Version:** 1.0
