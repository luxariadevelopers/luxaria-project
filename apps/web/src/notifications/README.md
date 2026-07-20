# In-app notification centre (Micro Phase 013)

## APIs (`notification.view`)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/notifications` | Query: `unreadOnly`, `eventType`, `page`, `limit` |
| `PATCH` | `/notifications/:id/read` | Mark one read |
| `POST` | `/notifications/read-all` | Returns `{ modifiedCount }` |

There is **no** dedicated unread-count endpoint. The bell badge uses  
`GET /notifications?unreadOnly=true&page=1&limit=1` → `meta.total`.

## UI

- Header bell + drawer (`NotificationBell`)
- Full page `/notifications` (registry + `RegistryRouteGuard`)
- Profile menu → Notifications
- Sidebar Overview → Notifications

## Entity deep links

`resolveNotificationEntityLink` validates Mongo ObjectIds and only navigates to
**shipped** registry routes when the user has the entity permission  
(`project.view`, `dpr.view`, …). Unknown entity types do not invent paths.

## Severity badge

Display-only mapping from `eventType` — the API has no severity field.
