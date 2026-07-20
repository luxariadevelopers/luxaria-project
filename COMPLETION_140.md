# Micro Phase 140 — Production observability & operational alerts

## Delivered

### Backend

- Structured HTTP logging with PII/secret redaction (`log-redaction.ts`)
- Env-gated error tracking hook wired into the global exception filter
- Extended `GET /api/v1/health` with database, Redis, memory, and notification delivery checks
- New `GET /api/v1/health/operations` (`audit.view`) exposing masked alert config and job flags
- Alert env vars documented in `.env.example`

### Web

- **Administration → System Health** page at `/administration/system-health`
- Route guarded by `audit.view` (no `operations.view` in catalog)

### Shared validation

- Extended `@luxaria/shared-validation` health schemas for degraded status and operations payload

### Tests

- `log-redaction.spec.ts`
- `alert-config.spec.ts`
- `error-tracking.service.spec.ts`
- Updated `health.controller.spec.ts`, added `health.service.spec.ts`

## Permission note

`operations.view` does not exist in `permissions.catalog.ts`. System Health uses **`audit.view`**, consistent with audit/operational visibility elsewhere in the catalog.

## Docs

- [`apps/backend/docs/OBSERVABILITY_API.md`](../apps/backend/docs/OBSERVABILITY_API.md)
- README foundation endpoints table updated

## Verify

```bash
pnpm --filter @luxaria/backend test -- log-redaction alert-config error-tracking health
curl -s http://localhost:9000/api/v1/health | jq .
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:9000/api/v1/health/operations | jq .
```

Web: sign in as a user with `audit.view` → Administration → System Health.
