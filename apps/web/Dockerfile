# Production multi-stage image — static web + unprivileged nginx.
FROM node:22-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-format/package.json packages/shared-format/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig packages/tsconfig/

RUN pnpm install --frozen-lockfile --filter @luxaria/web...

COPY packages packages
COPY apps/web apps/web

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN pnpm --filter @luxaria/shared-types build \
  && pnpm --filter @luxaria/shared-format build \
  && pnpm --filter @luxaria/shared-validation build \
  && pnpm --filter @luxaria/web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
