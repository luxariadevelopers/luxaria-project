# Observability API (Micro Phase 140)

Production observability endpoints and operational alert configuration.

## Endpoints

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | `/api/v1/health` | Public | — |
| GET | `/api/v1/health/operations` | Bearer JWT | `audit.view` |

`operations.view` is **not** in the permission catalog; the admin System Health page uses existing `audit.view`.

## Public health (`GET /health`)

Returns overall status (`ok` | `degraded`), uptime, version, and structured checks:

- **database** — MongoDB ready state (credentials masked in `maskedUri`)
- **redis** — ping result when `REDIS_ENABLED=true`, otherwise `disabled`
- **memory** — heap/RSS usage in MB
- **notifications** — delivery log counts for the last 24 hours

When checks fail configured thresholds, `alerts` includes codes such as:

- `database_down`
- `redis_down`
- `notification_delivery_failures_high`

## Operations health (`GET /health/operations`)

Includes everything from public health plus:

- **alertConfig** — threshold and alert toggles with secrets masked
- **errorTracking** — whether `ERROR_TRACKING_ENABLED` + DSN are active
- **backgroundJobs** — cron/BullMQ feature flags from configuration

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ERROR_TRACKING_ENABLED` | `false` | Enable outbound error tracking hook |
| `ERROR_TRACKING_DSN` | — | HTTPS ingest URL (never logged in full) |
| `OPS_ALERT_WEBHOOK_URL` | — | Optional ops webhook (masked in API) |
| `ALERT_DELIVERY_FAILURE_THRESHOLD_24H` | `10` | Failed deliveries before degraded health |
| `ALERT_DATABASE_DOWN_ENABLED` | `true` | Emit `database_down` alert |
| `ALERT_REDIS_DOWN_ENABLED` | `true` | Emit `redis_down` when Redis enabled |

## Logging

HTTP logs are structured JSON with PII/secret redaction (emails, tokens, passwords, Mongo URIs).

5xx exceptions are forwarded to the error tracking hook when enabled.

## Related UI

Web: **Administration → System Health** (`/administration/system-health`) — requires `audit.view`.

Notification delivery detail remains on `GET /api/v1/notifications/delivery-logs` (`notification.manage`).
