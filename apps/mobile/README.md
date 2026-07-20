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
