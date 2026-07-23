#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORTS=(9000 9001 9002)

echo "Luxaria Developers ERP — starting 9000-series services"
echo "  MongoDB   → Atlas (MONGODB_URI in apps/backend/.env.development.local)"
echo "  Backend   → 9000"
echo "  Web       → 9001"
echo "  Mobile    → 9002"
echo "  S3        → Luxaria bucket via AWS_PROFILE (default: luxaria)"
echo

# Prefer Luxaria AWS login profile (not ClassicCart static keys)
export AWS_PROFILE="${AWS_PROFILE:-luxaria}"
export AWS_REGION="${AWS_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$AWS_REGION}"
# Ensure SDK default chain is not overridden by leftover ClassicCart env keys
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  echo "→ Freeing port ${port} (PIDs: ${pids})"
  # shellcheck disable=SC2086
  kill ${pids} 2>/dev/null || true
  sleep 0.4

  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill -9 ${pids} 2>/dev/null || true
  fi
}

echo "→ Ensuring app ports are free..."
for port in "${PORTS[@]}"; do
  free_port "${port}"
done

if [[ ! -f apps/backend/.env.development.local ]] && [[ ! -f .env.docker ]]; then
  echo "Error: set live Atlas MONGODB_URI in apps/backend/.env.development.local or .env.docker"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  echo "→ Starting Redis (docker compose)..."
  docker compose --env-file .env.docker up -d redis 2>/dev/null || docker compose up -d redis
fi

cleanup() {
  echo
  echo "Stopping Node apps..."
  pids="$(jobs -p || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "→ Starting backend (:9000), web (:9001), mobile (:9002)..."
pnpm --filter @luxaria/backend dev &
pnpm --filter @luxaria/web dev &
pnpm --filter @luxaria/mobile start &

wait
