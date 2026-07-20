# Docker development & production

Local stack: **MongoDB**, **Redis**, **backend** (Nest hot reload), **web** (Vite HMR). Optional **Mongo Express** via Compose profile `tools`.

## Ports

| Service        | Host port | Notes                          |
|----------------|-----------|--------------------------------|
| Backend API    | `9000`    | `/api/v1/health`               |
| Web            | `9001`    | Vite (dev) / nginx (prod)      |
| MongoDB        | `9017`    | Persistent volume              |
| Redis          | `9018`    | AOF persistence                |
| Mongo Express  | `9019`    | Profile `tools` only           |

## Prerequisites

- Docker Engine + Compose v2
- Copy env template once:

```bash
cp .env.docker.example .env.docker
```

Dev compose works without `.env.docker` (safe local defaults). To override secrets/settings:

```bash
docker compose --env-file .env.docker up -d --build
```

Production compose requires `.env.docker` with real secrets.

## Development (hot reload)

```bash
# Infra only (host pnpm for apps)
pnpm docker:infra

# Full stack: mongo + redis + backend + web
pnpm docker:up

# Follow logs
pnpm docker:logs

# Stop (volumes kept)
pnpm docker:down

# Optional Mongo Express → http://localhost:9019
pnpm docker:tools
```

Equivalent Compose commands:

```bash
docker compose up -d --build
docker compose logs -f backend web
docker compose --profile tools up -d mongo-express
docker compose down
```

Source under `apps/*/src` (and shared package `src`) is bind-mounted. Nest `--watch` and Vite HMR pick up edits. After dependency changes, rebuild images:

```bash
docker compose build --no-cache backend web
docker compose up -d backend web
```

Polling is enabled (`CHOKIDAR_USEPOLLING`) so file watching works on Docker Desktop (macOS/Windows).

### Host apps + Docker infra

Keep using local Node for faster iteration:

```bash
pnpm docker:infra          # mongo :9017, redis :9018
cp apps/backend/.env.example apps/backend/.env
# MONGODB_URI=mongodb://127.0.0.1:9017/luxaria-erp
# REDIS_HOST=127.0.0.1  REDIS_PORT=9018
pnpm dev:backend
pnpm dev:web
```

## Production images

Non-root containers:

- Backend: user `luxaria` (uid 1001), multi-stage `apps/backend/Dockerfile`
- Web: `nginxinc/nginx-unprivileged` on port `8080`, `apps/web/Dockerfile`

```bash
cp .env.docker.example .env.docker   # set production secrets + CORS_ORIGINS
pnpm docker:prod
# or: docker compose -f docker-compose.prod.yml up -d --build
```

Web proxies `/api/` to the `backend` service. Publish only the web port (or put a reverse proxy in front).

Build a single image:

```bash
docker build -f apps/backend/Dockerfile -t luxaria-backend:local .
docker build -f apps/web/Dockerfile -t luxaria-web:local .
```

## Volumes

| Volume                 | Purpose              |
|------------------------|----------------------|
| `luxaria_mongo`        | Dev MongoDB data     |
| `luxaria_redis`        | Dev Redis AOF        |
| `luxaria_prod_mongo`   | Prod MongoDB data    |
| `luxaria_prod_redis`   | Prod Redis AOF       |

Reset local data:

```bash
docker compose down -v
```

## Health checks

All services define Compose `healthcheck`s. Backend probes `GET /api/v1/health`. Web probes `/`. App containers wait on Mongo/Redis (and web waits on a healthy backend).

## Files

| Path                         | Role                                      |
|------------------------------|-------------------------------------------|
| `docker-compose.yml`         | Development stack                         |
| `docker-compose.prod.yml`    | Production stack                          |
| `.env.docker.example`        | Env template for Compose                  |
| `apps/backend/Dockerfile.dev`| Nest watch image                          |
| `apps/backend/Dockerfile`    | Production API image                      |
| `apps/web/Dockerfile.dev`    | Vite HMR image                            |
| `apps/web/Dockerfile`        | Static + nginx (non-root)                 |
| `apps/web/nginx.conf`        | SPA + `/api` proxy                        |
| `.dockerignore`              | Build context exclusions                  |
