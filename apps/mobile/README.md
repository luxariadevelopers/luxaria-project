# Luxaria Site (mobile)

React Native (Expo) foundation for site engineers. Android-first, iOS-compatible.

## Stack

- Expo SDK 57 + TypeScript
- React Navigation (stack + bottom tabs)
- TanStack Query + Axios
- Secure token storage (`expo-secure-store`)
- SQLite offline transaction engine (`expo-sqlite`)
- Camera / location / network / notifications (Expo modules)

## Offline sync engine

Local queue in SQLite (`src/offline`):

- UUID per offline transaction + stable `Idempotency-Key`
- Statuses: `pending` → `uploading` → `synced` | `failed` | `conflict`
- Local media paths; media uploads before transaction sync
- Safe retry with backoff; manual retry on Failed/Conflict
- Device timestamp + server timestamp recorded on each row

Pending Sync screen shows errors and Retry. Expense capture will enqueue into this engine later.

## Screens

- Login
- Home
- Projects (+ project selection flow)
- Pending Sync
- Profile (permissions + push placeholder)
- Goods receipt (offline GRN)
- Daily progress report (offline DPR)
- Material issue hub → Material return (unused stock back to store)

## Material return (Micro Phase 126)

Return unused material against a **confirmed** issue.

| Item | Value |
|------|--------|
| Nested nav | Home → Material issue → Return |
| Nest permission | `stock.issue` (prompt alias `material_issue.return` is not in the catalog) |
| List / load issue | `GET /material-issues`, `GET /material-issues/:id` (`stock.view`) |
| Post return | `POST /material-issues/:id/returns` |
| Offline type | `material_return.create` (photos upload first; doc IDs folded into `notes`) |

Client validation blocks return qty above `remainingBaseQuantity` before enqueue.

## API

Set `EXPO_PUBLIC_API_BASE_URL`:

- Android emulator default: `http://10.0.2.2:9000/api/v1`
- Physical device: `http://<your-lan-ip>:9000/api/v1`

## Scripts

```bash
pnpm --filter @luxaria/mobile start
pnpm --filter @luxaria/mobile android
pnpm --filter @luxaria/mobile ios
pnpm --filter @luxaria/mobile typecheck
pnpm --filter @luxaria/mobile test
```
