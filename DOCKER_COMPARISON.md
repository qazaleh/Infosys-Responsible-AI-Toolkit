# 📋 Docker Compose Comparison

## Overview Comparison

| Aspect | Original (docker-compose.yml) | Optimized (docker-compose.optimized.yml) |
|--------|-------------------------------|-------------------------------------------|
| **Total Services** | 10 services | 15 services (+5) |
| **Profiles** | 4 (ui, explain, fairness, ops) | 8 (ui, ml-ops, explainability, fairness, privacy, llm, security, storage) |
| **Network** | Default bridge | Dedicated `rai-network` |
| **Container Naming** | Mixed (responsible-ai-*) | Consistent (rai-*) |
| **Volumes** | 3 volumes | 5 volumes |
| **Missing Services** | 13 modules | 8 modules* |
| **Documentation** | Inline comments | Comprehensive + helper script + guide |

*Note: 8 modules truly missing (no Dockerfiles): Hallucination, img-explainability, llm, redteaming, safety, telemetry, upload-doc, workbench

---

## Service Coverage

### ✅ In Both Files

| Service | Original Profile | Optimized Profile | Changes |
|---------|-----------------|-------------------|---------|
| mongo | (core) | (core) | Renamed container: `rai-mongo` |
| admin | ui | ui | Renamed container: `rai-admin` |
| backend | ui | ui | Renamed container: `rai-backend` |
| mfe | ui | ui | Renamed container: `rai-mfe` |
| shell | ui | ui | Renamed container: `rai-shell` |
| model-detail | explain, fairness, ops | ml-ops | Renamed container: `rai-model-detail` |
| reporting-tool | explain, fairness, ops | ml-ops | Renamed container: `rai-reporting-tool` |
| ai-explain | explain | explainability | Renamed container: `rai-explain` |
| fairness | fairness | fairness | Renamed container: `rai-fairness` |
| privacy | ops | privacy | Renamed container: `rai-privacy` |
| llm-benchmarking | ops | llm | Renamed container: `rai-llm-benchmarking` |

### ✨ New in Optimized

| Service | Profile | Port | Description |
|---------|---------|------|-------------|
| llm-explain | llm | 8003 | LLM explainability service |
| security | security | 30023 | Security scanning and analysis |
| moderationlayer | security | 30024 | Content moderation orchestration layer |
| moderationmodel | security | 30025 | Content moderation ML models |
| file-storage | storage | 30026 | File storage and management |

### ❌ Still Missing (No Dockerfiles Available)

These modules don't have Dockerfiles yet and cannot be containerized:

1. **responsible-ai-Hallucination** - Needs Dockerfile creation
2. **responsible-ai-img-explainability** - Needs Dockerfile creation
3. **responsible-ai-llm** - Needs Dockerfile creation  
4. **responsible-ai-redteaming** - Needs Dockerfile creation
5. **responsible-ai-safety** - Needs Dockerfile creation
6. **responsible-ai-telemetry** - Needs Dockerfile creation
7. **responsible-ai-upload-doc** - Needs Dockerfile creation
8. **responsible-ai-workbench** - Needs Dockerfile creation

---

## Profile Logic Comparison

### Original Profiles

```yaml
ui: admin, backend, mfe, shell
explain: model-detail, reporting-tool, ai-explain
fairness: model-detail, reporting-tool, fairness
ops: model-detail, reporting-tool, privacy, llm-benchmarking
```

**Issues:**
- `model-detail` and `reporting-tool` duplicated across 3 profiles
- No clear separation between ML operations and domain services
- "ops" profile is too generic

### Optimized Profiles

```yaml
ui: admin, backend, mfe, shell
ml-ops: model-detail, reporting-tool
explainability: ai-explain (requires ml-ops)
fairness: fairness (requires ml-ops)
privacy: privacy
llm: llm-explain, llm-benchmarking
security: security, moderationlayer, moderationmodel
storage: file-storage
```

**Improvements:**
- ✅ Clear separation of concerns
- ✅ No service duplication across profiles
- ✅ Dependencies explicitly defined
- ✅ Easier to compose capabilities
- ✅ Better scalability

---

## Command Comparison

### Starting UI Services

**Original:**
```bash
docker compose --profile ui up -d
```

**Optimized:**
```bash
# Method 1: Direct
docker compose -f docker-compose.optimized.yml --profile ui up -d

# Method 2: Helper script
./rai-docker.sh ui
```

---

### Starting ML Capabilities

**Original:**
```bash
# Must start multiple overlapping profiles
docker compose --profile explain --profile fairness up -d
# model-detail and reporting-tool start twice (inefficient)
```

**Optimized:**
```bash
# Method 1: Clear dependencies
docker compose -f docker-compose.optimized.yml \
  --profile ui \
  --profile ml-ops \
  --profile explainability \
  --profile fairness \
  up -d

# Method 2: Helper script
./rai-docker.sh ml
```

**Benefits:**
- No duplicate service starts
- Clear which services run
- More predictable behavior

---

### Starting Everything

**Original:**
```bash
docker compose --profile ui --profile explain --profile fairness --profile ops up -d
# Only starts 10 services, missing 5 containerizable modules
```

**Optimized:**
```bash
# Method 1: All profiles
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

# Method 2: Helper script
./rai-docker.sh full
```

**Benefits:**
- Starts all 15 containerizable services
- Clear what's running
- Complete feature coverage

---

## Network Configuration

### Original
```yaml
# Uses default Docker bridge network
# Services communicate via localhost URLs
```

**Issues:**
- Less isolation
- Potential port conflicts with host
- Harder to debug network issues

### Optimized
```yaml
networks:
  rai-network:
    name: rai-network
    driver: bridge

# All services connect to rai-network
```

**Benefits:**
- ✅ Better service isolation
- ✅ Services can use container names for DNS
- ✅ Easier to debug and monitor
- ✅ Can connect external services to same network

---

## Volume Management

### Original
```yaml
volumes:
  shared_mongo_data:
  mfe_node_modules:
  shell_node_modules:
```

### Optimized
```yaml
volumes:
  mongo_data:
    name: rai-mongo-data
  mfe_node_modules:
    name: rai-mfe-node-modules
  shell_node_modules:
    name: rai-shell-node-modules
  moderation_models:
    name: rai-moderation-models
  file_storage_data:
    name: rai-file-storage-data
```

**Improvements:**
- Named volumes for better management
- Additional volumes for new services
- Clearer purpose and organization

---

## Resource Usage Comparison

### Original Setup (All Profiles)
```
Services: 10
Estimated Memory: ~8GB
Estimated CPU: 4-5 cores
```

### Optimized Setup (All Profiles)
```
Services: 15 (+50%)
Estimated Memory: ~12GB (+50%)
Estimated CPU: 6 cores (+20%)
```

### Optimized Setup (UI Only)
```
Services: 5
Estimated Memory: ~3GB
Estimated CPU: 2 cores
```

**Note:** You can now run lightweight configurations more efficiently!

---

## Migration Guide

### Step 1: Backup Current Setup
```bash
# Export current data if needed
docker compose ps
docker compose down  # This preserves volumes
```

### Step 2: Switch to Optimized
```bash
# Start with UI profile
docker compose -f docker-compose.optimized.yml --profile ui up -d

# Or use helper script
./rai-docker.sh ui
```

### Step 3: Verify Services
```bash
# Check status
./rai-docker.sh status

# Check logs
./rai-docker.sh logs
```

### Step 4: Add More Profiles as Needed
```bash
# Add ML capabilities
./rai-docker.sh ml

# Add LLM services
./rai-docker.sh llm
```

---

## When to Use Which?

### Use Original (docker-compose.yml)
- ❓ You only need the 10 original services
- ❓ You're already familiar with the current setup
- ❓ You have automation built around it

### Use Optimized (docker-compose.optimized.yml)
- ✅ You want to run ALL available services
- ✅ You need LLM, Security, or Storage services
- ✅ You want better organization and flexibility
- ✅ You want to run lightweight configurations
- ✅ You're starting fresh or doing new development

---

## Recommendation

**For most users: Use the optimized setup**

Benefits:
1. ✅ Access to 5 additional services
2. ✅ Better organized with clearer profiles
3. ✅ More flexible - run only what you need
4. ✅ Better performance (no duplicate services)
5. ✅ Comprehensive documentation and helper scripts
6. ✅ Future-proof design

---

## Quick Start Examples

### Optimized for Different Use Cases

```bash
# Frontend Development
./rai-docker.sh ui

# ML/AI Research
./rai-docker.sh ml

# LLM Development
./rai-docker.sh llm

# Security Testing
./rai-docker.sh security

# Full Stack Testing
./rai-docker.sh full
```

---

## Summary

The **optimized setup** provides:
- 🎯 **50% more services** (15 vs 10)
- 🎯 **Better organization** (8 logical profiles)
- 🎯 **More flexibility** (compose only what you need)
- 🎯 **Better performance** (no service duplication)
- 🎯 **Better documentation** (comprehensive guides + helper script)
- 🎯 **Future-ready** (easy to add more services)

**Bottom line:** Start with optimized unless you have specific reasons to use the original.
