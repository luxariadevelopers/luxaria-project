# Docker development & production

Local stack: **Redis**, **backend** (Nest hot reload), **web** (Vite HMR).  
**MongoDB is live Atlas only** — set `MONGODB_URI` in `.env.docker`.

## Ports

| Service     | Host port | Notes             |
|-------------|-----------|-------------------|
| Backend API | `9000`    | `/api/v1/health`  |
| Web         | `9001`    | Vite (dev) / nginx (prod) |
| Redis       | `9018`    | AOF persistence   |

## Prerequisites

- Docker Engine + Compose v2
- Copy env template once and set Atlas URI:

```bash
cp .env.docker.example .env.docker
# edit MONGODB_URI → mongodb+srv://...
```

```bash
pnpm docker:up
# or: docker compose --env-file .env.docker up -d --build
```

## Development (hot reload)

```bash
# Redis only (host pnpm for apps)
pnpm docker:infra

# Full stack: redis + backend + web → Atlas
pnpm docker:up

pnpm docker:logs
pnpm docker:down
```

Source under `apps/*/src` (and shared package `src`) is bind-mounted. Nest `--watch` and Vite HMR pick up edits. After dependency changes, rebuild images:

```bash
docker compose --env-file .env.docker build --no-cache backend web
docker compose --env-file .env.docker up -d backend web
```

Polling is enabled (`CHOKIDAR_USEPOLLING`) so file watching works on Docker Desktop (macOS/Windows).

### Host apps + Docker Redis

```bash
pnpm docker:infra
# Atlas URI in apps/backend/.env.development.local
# REDIS_HOST=127.0.0.1  REDIS_PORT=9018
pnpm dev:backend
pnpm dev:web
```

## Production images

```bash
cp .env.docker.example .env.docker   # Atlas URI + production secrets
pnpm docker:prod
```

Web proxies `/api/` to the `backend` service.

## Volumes

| Volume               | Purpose        |
|----------------------|----------------|
| `luxaria_redis`      | Dev Redis AOF  |
| `luxaria_prod_redis` | Prod Redis AOF |

```bash
docker compose --env-file .env.docker down -v
```

## Health checks

- Backend: `GET http://localhost:9000/api/v1/health` (includes database → Atlas)
- Web: `GET http://localhost:9001/`
