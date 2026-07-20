#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORTS=(9000 9001 9002)

echo "Luxaria Developers ERP — starting 9000-series services"
echo "  MongoDB   → 9017"
echo "  Backend   → 9000"
echo "  Web       → 9001"
echo "  Mobile    → 9002"
echo

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

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required to start MongoDB on port 9017."
  exit 1
fi

echo "→ Ensuring app ports are free..."
for port in "${PORTS[@]}"; do
  free_port "${port}"
done

echo "→ Starting MongoDB (docker compose)..."
docker compose up -d mongo

echo "→ Waiting for MongoDB..."
for _ in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
    echo "→ MongoDB is ready on :9017"
    break
  fi
  sleep 1
done

cleanup() {
  echo
  echo "Stopping Node apps (MongoDB container left running)..."
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
