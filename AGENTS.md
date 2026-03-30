# AGENTS.md

## Scope
- This repo is a multi-service toolkit; prefer profile-based Docker workflows from the root over running every module manually.
- Source of truth for orchestration is `docker-compose.optimized.yml` and `rai-docker.sh`.

## Big Picture Architecture
- Core dependency is shared MongoDB (`mongo`) seeded from `responsible-ai-admin/Initial DB setup`.
- UI profile (`shell`, `mfe`, `backend`, `admin`) is the main integration path (`http://localhost:30010` shell entrypoint).
- ML profile adds `model-detail` + `reporting-tool`; `ai-explain` and `fairness` depend on both.
- Security profile adds `security`, `moderationlayer`, `moderationmodel`; `moderationlayer` calls `MODERATIONMODEL_URL=http://moderationmodel:8000`.
- Storage profile adds `file-storage`; LLM profile adds `llm-explain` + `llm-benchmarking`.

## Service Boundaries and Data Flow
- Shell routes/auth orchestration: `responsible-ai-shell/src/app/utils/urlList.ts`.
- MFE runtime API targets: `responsible-ai-mfe/src/app/urlList.ts`.
- Backend API is mounted under `/v1/rai/backend` (`responsible-ai-backend/backend-rai/src/main.py`); middleware rejects other prefixes.
- Admin API is mounted under `/api/v1` (`responsible-ai-admin/responsible-ai-admin/src/main.py`).
- Frontend integration pattern: shell consumes MFE remote via module federation (`responsible-ai-shell/webpack.config.js` -> MFE remote entry).

## Critical Workflows
- Recommended start/stop uses helper script:
  - `./rai-docker.sh ui | ml | llm | security | dev | full`
  - `./rai-docker.sh status | logs [service] | restart <service> | rebuild <service> | down`
- Equivalent direct compose commands are documented in `GETTING_STARTED.md` and `DOCKER_USAGE_GUIDE.md`.
- For focused frontend work, module-local flows are valid:
  - `responsible-ai-shell`: `npm install && npm start` (runs `node start`)
  - `responsible-ai-mfe`: `npm install && npm start` (runs `node start`)

## Project-Specific Conventions (Important)
- `start.js` in shell and MFE rewrites tracked files (e.g., `urlList.ts`, env files) from env vars before `ng serve`; review diffs before committing.
- In containers, services use Docker DNS names (for example `http://backend:30019` in optimized compose), not localhost.
- CORS/security headers are configured per service through env + middleware (see `main.py` in admin/backend); keep env key names consistent (`allow_origin`, `allow_method(s)`).
- Frontend style convention uses 2-space indentation and single quotes in TS (`responsible-ai-shell/.editorconfig`, `responsible-ai-mfe/.editorconfig`).

## Agent Operating Guidance
- Start with the smallest profile that satisfies the task (`ui` first, then add profiles).
- When changing contracts between shell/mfe/backend/admin, update both compose env vars and frontend URL list/constants.
- Prefer edits inside module boundaries; only change root compose/script files when cross-module behavior must change.
- Validate affected pieces with local, module-specific commands (e.g., `npm test` for frontend modules) before broad full-stack runs.

