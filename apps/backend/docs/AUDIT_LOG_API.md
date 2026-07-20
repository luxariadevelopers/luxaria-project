# Audit Log API — Luxaria Developers ERP

Base path: `/api/v1/audit-logs`  
Auth: Bearer access token  
Swagger tag: **Audit Log**

Immutable append-only audit trail. Entries are written by services via `AuditLogService.record()` — there are **no** public create/update/delete endpoints.

## Captured fields

| Field | Notes |
|-------|--------|
| `userId` | Actor (nullable for anonymous events) |
| `action` | See actions below |
| `module` | e.g. `investors`, `auth` |
| `entityType` | e.g. `investor`, `session` |
| `entityId` | String id of the entity |
| `projectId` | Optional project scope |
| `beforeData` / `afterData` | Snapshots (sensitive fields masked) |
| `ipAddress` | From `x-forwarded-for` or socket |
| `userAgent` | Request UA |
| `requestId` | `x-request-id` |
| `deviceId` | `x-device-id` |
| `timestamp` | Event time (UTC) |

## Actions

`CREATE` · `UPDATE` · `DELETE` · `APPROVE` · `REJECT` · `POST` · `REVERSE` · `LOGIN` · `LOGOUT` · `DOWNLOAD` · `EXPORT`

## Permissions

| Permission | Use |
|------------|-----|
| `audit.view` | List and get audit entries |

## Query

`GET /audit-logs`

Filters:

- `userId`
- `module`
- `projectId`
- `action`
- `entityType` / `entityId`
- `from` / `to` (ISO 8601 on `timestamp`)
- Standard pagination: `page`, `limit`, `sortOrder`

`GET /audit-logs/:id` — single entry.

## Immutability

1. No REST write/update/delete routes
2. Mongoose `update*` / `delete*` hooks throw
3. `save` on existing documents is rejected

## Sensitive data masking

Before persist, `beforeData` / `afterData` mask:

- passwords / password hashes
- tokens (`accessToken`, `refreshToken`, …)
- bank account numbers / encrypted account fields

Last-4 may remain visible on masked string values for supportability.

## Writing from other modules

```ts
await this.auditLogService.record({
  userId: actor.id,
  action: AuditAction.UPDATE,
  module: 'investors',
  entityType: 'investor',
  entityId: id,
  projectId,
  beforeData,
  afterData,
  request, // optional Express request for IP / UA / requestId / deviceId
});
```

`AuditLogModule` is global — inject `AuditLogService` anywhere after app bootstrap.
