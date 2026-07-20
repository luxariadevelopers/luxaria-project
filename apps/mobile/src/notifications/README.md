# Mobile notifications

In-app inbox and entity deep links for the site app (Micro Phase 130).

## Nest APIs used

| Method | Path | Permission |
|---|---|---|
| GET | `/notifications` | `notification.view` |
| PATCH | `/notifications/:id/read` | `notification.view` |
| POST | `/notifications/read-all` | `notification.view` |

Push token registration is **not** available on Nest yet; `registerForPushNotificationsAsync` stays local-only.

## Deep links

`resolveNotificationDeepLink` maps `entityType` / `eventType` to existing mobile screens and checks permissions before open. Invalid entity ids, unknown entity types, and missing permissions are rejected (see `__tests__/resolveDeepLink.test.ts`).
