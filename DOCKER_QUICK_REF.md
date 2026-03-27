# 🚀 Quick Reference - Optimized Docker Setup

## One-Line Commands (Using Helper Script)

```bash
# Make script executable (first time only)
chmod +x rai-docker.sh

# Start UI services
./rai-docker.sh ui

# Start ML services  
./rai-docker.sh ml

# Start LLM services
./rai-docker.sh llm

# Start Security services
./rai-docker.sh security

# Start recommended dev setup
./rai-docker.sh dev

# Start everything
./rai-docker.sh full

# Check status
./rai-docker.sh status

# View logs
./rai-docker.sh logs

# View specific service logs
./rai-docker.sh logs admin

# Restart a service
./rai-docker.sh restart admin

# Open MongoDB shell
./rai-docker.sh shell mongo

# Stop all services
./rai-docker.sh stop

# Remove containers (keeps data)
./rai-docker.sh down

# Remove everything including data
./rai-docker.sh clean
```

## Direct Docker Compose Commands

```bash
# UI only
docker compose -f docker-compose.optimized.yml --profile ui up -d

# UI + ML
docker compose -f docker-compose.optimized.yml --profile ui --profile ml-ops --profile explainability --profile fairness up -d

# UI + LLM
docker compose -f docker-compose.optimized.yml --profile ui --profile llm up -d

# Everything
docker compose -f docker-compose.optimized.yml --profile ui --profile ml-ops --profile explainability --profile fairness --profile privacy --profile llm --profile security --profile storage up -d

# Stop all
docker compose -f docker-compose.optimized.yml down
```

## Service URLs

| Service | URL |
|---------|-----|
| Shell (Main UI) | http://localhost:30010 |
| Admin | http://localhost:30016 |
| Backend | http://localhost:30019 |
| MFE | http://localhost:30055 |
| AI Explain | http://localhost:8002 |
| Fairness | http://localhost:8000 |
| MongoDB | mongodb://localhost:27017 |

## Profiles Cheat Sheet

| Profile | Services | Use Case |
|---------|----------|----------|
| ui | admin, backend, mfe, shell | Frontend work |
| ml-ops | model-detail, reporting-tool | ML infrastructure |
| explainability | ai-explain | Model explainability |
| fairness | fairness | Fairness testing |
| privacy | privacy | Privacy analysis |
| llm | llm-explain, llm-benchmarking | LLM work |
| security | security, moderation* | Security testing |
| storage | file-storage | File management |

## Common Tasks

```bash
# View all running containers
docker ps

# View all RAI containers
docker ps -a | grep rai-

# Check MongoDB connection
docker exec -it rai-mongo mongosh --eval "db.adminCommand('ping')"

# View container resource usage
docker stats

# Follow logs for multiple services
docker compose -f docker-compose.optimized.yml logs -f admin backend

# Rebuild a service after code changes
docker compose -f docker-compose.optimized.yml build admin
docker compose -f docker-compose.optimized.yml up -d admin

# Execute command in container
docker exec -it rai-admin python --version
```

## Troubleshooting Quick Fixes

```bash
# Service won't start - check logs
./rai-docker.sh logs <service-name>

# Port already in use - find process
lsof -i :<port-number>

# Clean slate restart
./rai-docker.sh down
./rai-docker.sh ui

# Complete reset (removes all data)
./rai-docker.sh clean

# Check MongoDB health
docker compose -f docker-compose.optimized.yml ps mongo
```

## Resource Requirements

| Setup | Containers | RAM | CPU |
|-------|-----------|-----|-----|
| UI only | 5 | ~3GB | 2 cores |
| Dev (recommended) | 8 | ~5GB | 3 cores |
| Full stack | 16 | ~12GB | 6 cores |

## Files Reference

| File | Purpose |
|------|---------|
| docker-compose.optimized.yml | Main compose configuration |
| rai-docker.sh | Convenience helper script |
| DOCKER_USAGE_GUIDE.md | Detailed documentation |
| DOCKER_COMPARISON.md | Comparison with original |
| DOCKER_QUICK_REF.md | This file |

---

**Pro Tips:**
- Start small with `./rai-docker.sh ui` and add profiles as needed
- Use `./rai-docker.sh logs` to monitor services during development
- MongoDB is always started automatically (core service)
- All data persists in named volumes even after `down`
