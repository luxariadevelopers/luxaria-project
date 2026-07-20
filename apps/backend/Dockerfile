# Production multi-stage image — NestJS API (non-root).
FROM node:22-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig packages/tsconfig/

RUN pnpm install --frozen-lockfile --filter @luxaria/backend...

FROM deps AS build

COPY packages packages
COPY apps/backend apps/backend

RUN pnpm --filter @luxaria/shared-types build \
  && pnpm --filter @luxaria/backend build \
  && pnpm --filter @luxaria/backend deploy --prod /out

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 luxaria \
  && useradd --uid 1001 --gid luxaria --shell /usr/sbin/nologin --create-home luxaria

WORKDIR /app

ENV NODE_ENV=production \
    PORT=9000

COPY --from=build --chown=luxaria:luxaria /out ./

USER luxaria

EXPOSE 9000

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:9000/api/v1/health >/dev/null || exit 1

CMD ["node", "dist/main.js"]
