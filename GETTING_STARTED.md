# 🚀 Getting Started - Optimized Docker Setup

## Quick Start (3 Steps)

### 1️⃣ Make the helper script executable
```bash
chmod +x rai-docker.sh
```

### 2️⃣ Start the services you need
```bash
# For UI development (lightweight)
./rai-docker.sh ui

# For ML/AI development
./rai-docker.sh ml

# For LLM development
./rai-docker.sh llm

# For security testing
./rai-docker.sh security

# For everything
./rai-docker.sh full
```

### 3️⃣ Access the application
```bash
# Main UI
http://localhost:30010

# Check service status
./rai-docker.sh status
```

---

## What You Get

### ✨ **15 Services Organized in 8 Profiles**

#### Core (Always Available)
- **MongoDB** - Shared database

#### Profile: `ui` (User Interface)
- **Admin** - Admin API (port 30016)
- **Backend** - Backend API (port 30019)
- **MFE** - Micro Frontend (port 30055)
- **Shell** - Main UI (port 30010) ← **Start here!**

#### Profile: `ml-ops` (ML Operations)
- **Model Detail** - Model management (port 30020)
- **Reporting Tool** - Report generation (port 30021)

#### Profile: `explainability` (AI Explainability)
- **AI Explain** - Model explainability (port 8002)

#### Profile: `fairness` (Fairness Testing)
- **Fairness** - Fairness analysis (port 8000)

#### Profile: `privacy` (Privacy Analysis)
- **Privacy** - Privacy tools (port 30002)

#### Profile: `llm` (Large Language Models)
- **LLM Explain** - LLM explainability (port 8003)
- **LLM Benchmarking** - LLM testing (port 30022)

#### Profile: `security` (Security & Moderation)
- **Security** - Security scanning (port 30023)
- **Moderation Layer** - Content moderation (port 30024)
- **Moderation Model** - ML models for moderation (port 30025)

#### Profile: `storage` (File Storage)
- **File Storage** - File management (port 30026)

---

## Common Scenarios

### Scenario 1: Frontend Developer
**Goal:** Work on UI components

```bash
./rai-docker.sh ui
```

**Access:**
- Main UI: http://localhost:30010
- Admin: http://localhost:30016
- Backend API: http://localhost:30019

**Resources:** ~3GB RAM, 2 CPU cores

---

### Scenario 2: ML Engineer
**Goal:** Develop ML models with explainability

```bash
./rai-docker.sh ml
```

**What you get:**
- All UI services
- Model management
- Report generation
- AI explainability
- Fairness testing

**Resources:** ~6GB RAM, 3 CPU cores

---

### Scenario 3: LLM Developer
**Goal:** Work with Large Language Models

```bash
./rai-docker.sh llm
```

**What you get:**
- All UI services
- LLM explainability tools
- LLM benchmarking suite

**Resources:** ~5GB RAM, 3 CPU cores

---

### Scenario 4: Security Researcher
**Goal:** Test security and content moderation

```bash
./rai-docker.sh security
```

**What you get:**
- All UI services
- Security scanning
- Content moderation layer
- Moderation ML models

**Resources:** ~5GB RAM, 3 CPU cores

---

### Scenario 5: Integration Testing
**Goal:** Run complete system tests

```bash
./rai-docker.sh full
```

**What you get:** Everything!

**Resources:** ~12GB RAM, 6 CPU cores

---

## Helper Script Commands

```bash
# Start services
./rai-docker.sh ui          # UI only
./rai-docker.sh ml          # ML capabilities
./rai-docker.sh llm         # LLM services
./rai-docker.sh security    # Security services
./rai-docker.sh dev         # Recommended dev setup
./rai-docker.sh full        # Everything

# Monitor services
./rai-docker.sh status      # Check what's running
./rai-docker.sh logs        # View all logs
./rai-docker.sh logs admin  # View specific service logs

# Manage services
./rai-docker.sh restart backend    # Restart a service
./rai-docker.sh rebuild admin      # Rebuild a service
./rai-docker.sh rebuild ai-explain # Rebuild explainability
./rai-docker.sh rebuild fairness   # Rebuild fairness
./rai-docker.sh rebuild llm-explain # Rebuild LLM explainability
./rai-docker.sh shell mongo        # Open MongoDB shell
./rai-docker.sh shell admin        # Open service shell

# Stop services
./rai-docker.sh stop        # Stop all (keeps data)
./rai-docker.sh down        # Remove containers (keeps data)
./rai-docker.sh clean       # Remove everything (deletes data!)
```

Use Docker Compose service names with `restart` and `rebuild`. Common names are:
`admin`, `backend`, `mfe`, `shell`, `model-detail`, `reporting-tool`, `ai-explain`, `fairness`, `privacy`, `llm-explain`, `llm-benchmarking`, `security`, `moderationlayer`, `moderationmodel`, `file-storage`, and `mongo`.

---

## Using Docker Compose Directly

If you prefer direct Docker Compose commands:

```bash
# Start UI
docker compose -f docker-compose.optimized.yml --profile ui up -d

# Start UI + ML
docker compose -f docker-compose.optimized.yml \
  --profile ui --profile ml-ops --profile explainability --profile fairness up -d

# Start UI + LLM
docker compose -f docker-compose.optimized.yml --profile ui --profile llm up -d

# View status
docker compose -f docker-compose.optimized.yml ps

# View logs
docker compose -f docker-compose.optimized.yml logs -f

# Stop all
docker compose -f docker-compose.optimized.yml down
```

---

## Troubleshooting

### ❓ Services won't start

```bash
# Check logs
./rai-docker.sh logs

# Check MongoDB health
docker compose -f docker-compose.optimized.yml ps mongo

# Restart MongoDB
docker compose -f docker-compose.optimized.yml restart mongo
```

### ❓ Port already in use

```bash
# Find what's using the port
lsof -i :30010

# Edit docker-compose.optimized.yml to change port mapping
```

### ❓ Out of memory

```bash
# Start with fewer services
./rai-docker.sh ui

# Or stop unused services
./rai-docker.sh stop
```

### ❓ Clean slate restart

```bash
./rai-docker.sh down
./rai-docker.sh ui
```

### ❓ Complete reset (WARNING: Deletes all data!)

```bash
./rai-docker.sh clean
```

---

## Development Workflow

### 1. Start services
```bash
./rai-docker.sh dev
```

### 2. Make code changes
Edit files in your IDE - volumes are mounted, changes reflect immediately

### 3. View logs to debug
```bash
./rai-docker.sh logs admin
```

### 4. Restart service if needed
```bash
./rai-docker.sh restart admin
./rai-docker.sh restart ai-explain
```

### 5. Rebuild after dependency changes
```bash
./rai-docker.sh rebuild admin
./rai-docker.sh rebuild ai-explain
./rai-docker.sh rebuild fairness
./rai-docker.sh rebuild llm-explain
```

---

## Resource Requirements

| Setup | RAM | CPU | Containers |
|-------|-----|-----|------------|
| Minimal (ui) | 3GB | 2 cores | 5 |
| Recommended (dev) | 5GB | 3 cores | 8 |
| Full Stack (full) | 12GB | 6 cores | 16 |

---

## Next Steps

1. ✅ **Start with UI**: `./rai-docker.sh ui`
2. ✅ **Access the app**: http://localhost:30010
3. ✅ **Read the docs**:
   - **DOCKER_QUICK_REF.md** - Quick command reference
   - **DOCKER_USAGE_GUIDE.md** - Comprehensive guide
   - **DOCKER_ARCHITECTURE.md** - Architecture overview
   - **DOCKER_COMPARISON.md** - Comparison with original setup

---

## Support & Documentation

- **Quick Reference**: `DOCKER_QUICK_REF.md`
- **Full Guide**: `DOCKER_USAGE_GUIDE.md`
- **Architecture**: `DOCKER_ARCHITECTURE.md`
- **Comparison**: `DOCKER_COMPARISON.md`

---

## Tips

💡 **Start small** - Begin with `ui` profile and add more as needed  
💡 **Monitor logs** - Use `./rai-docker.sh logs` during development  
💡 **Data persists** - Your data is safe even after stopping containers  
💡 **Use helper script** - It's easier than typing long docker compose commands  

---

**Happy Coding! 🚀**
