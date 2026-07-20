# COMPLETION — Micro Phase 136: Mobile Push Notifications

## Summary

Wired end-to-end mobile push: Expo token registration on the backend, preference-aware delivery through `PushChannel`, and mobile token lifecycle + Profile notification preferences UI.

## Backend — new push token API

No device-token API existed previously. Added minimal Nest endpoints under the existing `notifications` module:

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| `POST` | `/api/v1/notifications/push-tokens` | `notification.view` | Register/update Expo token for current user |
| `DELETE` | `/api/v1/notifications/push-tokens` | `notification.view` | Unregister token (body: `{ token }`) — owner only |
| `GET` | `/api/v1/notifications/push-tokens/mine` | `notification.view` | List active tokens for current user |
| `GET` | `/api/v1/notifications/push-tokens` | `notification.manage` | Admin list (optional `userId`, pagination) |
| `DELETE` | `/api/v1/notifications/push-tokens/:id` | `notification.manage` | Admin revoke token by id |

Existing preference endpoints unchanged:

- `GET/PUT /api/v1/notifications/preferences` (`notification.view`)

### Storage

- Collection: `push_device_tokens`
- Schema: `PushDeviceToken` (`userId`, unique `token`, `platform`, `deviceName`, `invalidatedAt`, `lastUsedAt`)
- Re-registering the same token reassigns it to the current user (device handoff)

### Push delivery adapter

- `PushAdapter` uses `expo-server-sdk` when `PUSH_ENABLED=true`
- Default (`PUSH_ENABLED=false`): stub logging (existing test/dev behaviour preserved)
- `PushChannel` loads active tokens per user, sends via Expo, **invalidates** tokens reported as `DeviceNotRegistered` / malformed
- Opt-out respected via existing `NotificationsDispatcher.resolveChannelsForUser` (push skipped when muted/disabled in preferences)

### Config

| Env | Default | Purpose |
|-----|---------|---------|
| `PUSH_ENABLED` | `false` | Enable real Expo delivery |
| `EXPO_ACCESS_TOKEN` | empty | Optional Expo access token |

## Mobile

### API client

- `apps/mobile/src/api/notifications.ts` — preferences + push token calls
- Added `apiPut` / extended `apiDelete` in `api/client.ts`

### Token lifecycle

- `pushNotifications.ts` — permission + Expo token fetch, foreground handler
- `pushLifecycle.ts` — register/unregister with backend, tracks active token
- `PushNotificationContext.tsx` — auto-register on auth, foreground listener, tap/deep-link routing
- Logout unregisters token via `unregisterPushFromBackend()`

### UI

- **Profile → Notification preferences** (`NotificationPreferencesScreen`)
  - Mute all toggle
  - Push notifications toggle (updates push channel across all event types)
  - Saves to `PUT /notifications/preferences` and re-syncs device token when push enabled

### Deep links / notification taps

- `notificationNavigation.ts` maps payload `entityType` / `eventType` to app screens (GRN, DPR, or Tabs fallback)

## Tests

- Backend: `push-token.service.spec.ts`, updated `notifications.service.spec.ts` (14 tests passing)
- Mobile: `src/notifications/__tests__/pushNotifications.test.ts` (preferences helpers + routing)

## Permissions model

- **User**: `notification.view` — own tokens + preferences only; unregister forbidden for another user's token (`403`)
- **Admin**: `notification.manage` — list/revoke any push token

## Worktree

Implemented in isolated worktree `luxaria-phase136-c0cb4dc1` (merge back with `/apply-worktree`).
