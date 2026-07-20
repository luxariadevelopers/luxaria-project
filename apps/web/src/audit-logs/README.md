# Audit log viewer (Micro Phase 030)

Read-only administration viewer at `/administration/audit-logs`
(nav: **Administration → Audit Logs**).

## Permission

| Surface | Permission |
|---------|------------|
| List + get | `audit.view` |

There are **no** Nest create/update/delete audit APIs. The UI has no edit
capability — hiding buttons is not enough; route guards and 403 handling apply.

## APIs consumed

| Endpoint | Use |
|----------|-----|
| `GET /audit-logs` | Query with `userId`, `module`, `projectId`, `action`, `entityType`, `entityId`, `from`, `to`, pagination |
| `GET /audit-logs/:id` | Single entry (available via API client) |

Actions (Nest enum only): `CREATE` · `UPDATE` · `DELETE` · `APPROVE` · `REJECT` ·
`POST` · `REVERSE` · `LOGIN` · `LOGOUT` · `DOWNLOAD` · `EXPORT`.

## Sensitive data

Backend masks `beforeData` / `afterData` on write. The web viewer:

1. Re-applies the same key allow-list (`maskSensitiveData`)
2. Treats values starting with `********` as opaque — **never rehydrates**
3. Renders diffs as read-only

## Components

| Export | Role |
|--------|------|
| `AuditTable` | DataTable + request-id column + view-diff dialog |
| `AuditFilters` | Actor, action, module, project, entity, date range |
| `AuditDiffView` | Before/after field diff + truncated large JSON |
| `validateAuditLogFilters` | ObjectId / action / date validation |

## Navigation

Registry id `audit-logs`: path `/administration/audit-logs`, title **Audit Logs**,
group **Administration**, `anyOf: ['audit.view']`, `projectScope: none`.
