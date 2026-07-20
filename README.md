# Luxaria Developers ERP

Accounting-first construction management platform for **Luxaria Developers Pvt. Ltd.**

This repository is a **pnpm + TypeScript monorepo**.

## Apps and packages

| Path | Package | Role |
|------|---------|------|
| `apps/backend` | `@luxaria/backend` | NestJS API |
| `apps/web` | `@luxaria/web` | React + Vite director portal shell |
| `apps/mobile` | `@luxaria/mobile` | Expo React Native site app shell |
| `packages/shared-types` | `@luxaria/shared-types` | Shared TypeScript types |
| `packages/shared-validation` | `@luxaria/shared-validation` | Shared Zod schemas |
| `packages/eslint-config` | `@luxaria/eslint-config` | Shared ESLint configs |
| `packages/tsconfig` | `@luxaria/tsconfig` | Shared TypeScript configs |

The previous Express monorepo lives under [`_reference/`](_reference/) for domain/behavior reference only. Do not import from it in new apps.

## Port map (9000 series only)

| Service | Port |
|---------|------|
| Backend API | `9000` |
| Web (Vite) | `9001` |
| Mobile (Expo Metro) | `9002` |
| Backend (test) | `9003` |
| MongoDB | `9017` |
| Redis | `9018` |
| Mongo Express (optional) | `9019` |

## Prerequisites

- **Node.js** 20+ (24 LTS preferred when available)
- **pnpm** 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- **Docker** (MongoDB `9017`, Redis `9018`; full stack optional — see [docs/DOCKER.md](docs/DOCKER.md))
- Optional for mobile: Android Studio / Expo Go

## Installation

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install
pnpm --filter @luxaria/shared-types build
pnpm --filter @luxaria/shared-validation build
pnpm docker:infra
```

Copy env templates if needed:

```bash
cp apps/backend/.env.example apps/backend/.env
cp .env.docker.example .env.docker   # for docker compose app services
```

## Development commands

```bash
# Start everything (Mongo 9017 + API 9000 + Web 9001 + Mobile 9002)
pnpm dev:all

# Or individually:
pnpm docker:infra   # MongoDB :9017 + Redis :9018
pnpm docker:up      # Full Docker stack (API + web + hot reload)
pnpm docker:tools   # Optional Mongo Express :9019
pnpm dev:mongo      # MongoDB only
pnpm dev:backend    # API :9000  → http://localhost:9000/api/v1
pnpm dev:web        # Web :9001  → http://localhost:9001
pnpm dev:mobile     # Expo :9002 → http://localhost:9002
pnpm dev            # backend + web only

# Quality
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

CI/CD: [docs/CI.md](docs/CI.md) — require the **PR gate** status check before merging.

UI ↔ API contracts (Micro Phase 001): [docs/ui-api-matrix.md](docs/ui-api-matrix.md) — regenerate with `node scripts/audit-api-contracts.mjs`.

### Backend foundation endpoints (Phase 2)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health + MongoDB status |
| GET | `/api/v1/version` | App name, version, environment |
| GET | `/api/docs` | Swagger UI (development) |

Standard success envelope:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

Environment templates: [`apps/backend/.env.example`](apps/backend/.env.example), plus `.env.development`, `.env.test`, `.env.production`.

MongoDB Atlas setup: [`apps/backend/docs/MONGODB_ATLAS.md`](apps/backend/docs/MONGODB_ATLAS.md).

## Phase status

**Phase 1** — Monorepo structure (complete)

**Phase 2** — Backend foundation (complete)

**Phase 2** — Backend foundation (complete)

- NestJS structure: `common/`, `config/`, `database/`, `modules/`, `shared/`
- `/api/v1` prefix, validation pipe, exception filter, logging
- CORS, Helmet, compression, Swagger
- ConfigModule + env validation (dev/test/prod)
- Health + version endpoints, graceful shutdown
- Standard success/error response formats
- **No authentication yet**

**Phase 3** — MongoDB Atlas / Mongoose data layer (complete)

- Connection from `MONGODB_URI` with retry reads/writes
- Masked connection logging
- Health endpoint database status
- Base schema + soft-delete plugins, audit indexes
- Transaction helper + `idempotency_keys` model
- Tests via `mongodb-memory-server` / replica set

**Phase 4** — Numbering / identifiers (complete)

- `counters` collection with atomic `$inc` (never document counts)
- FY-based and project-scoped codes (`PRJ-2026-0001`, `VEN-000001`, `PO-2026-000001`, …)
- Global `NumberingService` for all entity types
- Concurrency tests included (run later with full suite)

**Phase 5** — Authentication (complete)

- Email/mobile login, Argon2, JWT access + refresh rotation
- Sessions, logout / logout-all, forgot/reset password, account lock
- Global JWT guard + login rate limiting
- API docs: [`apps/backend/docs/AUTH_API.md`](apps/backend/docs/AUTH_API.md)

**Phase 6** — User management (complete)

- Full user profile fields, CRUD-style APIs, activate/deactivate
- Role/project assignment, admin password reset, soft delete
- Search/filter + pagination
- API docs: [`apps/backend/docs/USERS_API.md`](apps/backend/docs/USERS_API.md)

**Next** — RBAC (roles & permissions), project-level access, company masters
