# Units inventory (web)

Micro Phase 097 — unit inventory list at `/sales/units`.  
Micro Phase 098 — unit detail at `/sales/units/:id`.

## Nest API (existing only)

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/units` | `unit.view` |
| `POST` | `/units` | `unit.manage` |
| `GET` | `/units/:id` | `unit.view` |
| `PATCH` | `/units/:id` | `unit.manage` |
| `POST` | `/units/:id/status` | `unit.manage` |
| `DELETE` | `/units/:id` | `unit.manage` (not exposed in UI yet) |
| `GET` | `/bookings?unitId=` | `booking.view` |
| `GET` | `/documents?entityType=unit&entityId=` | `document.view` |

There is **no** Nest unit status-history endpoint. Detail history is built client-side from unit timestamps + linked booking markers (`buildUnitStatusHistory`).

Statuses: `available` → `held` → `reserved` → `booked` → `agreement_executed` → `registered` (+ `cancelled`, `blocked`).

## Permissions

Prompt aliases `unit.create` / `unit.update` / `unit.block` are **not** in the RBAC catalog.
UI capabilities map to Nest codes:

- view → `unit.view`
- create / update / block / status → `unit.manage`

Route guard requires `unit.view`. Manage actions are hidden without `unit.manage`.
403 responses render `PermissionDenied` / `RetryPanel`.

## Rules

1. Unique `(projectId, block, unitNumber)` — client pre-check + Nest `409`
2. Valid status transitions mirrored from Nest `units.validation.ts`
3. Active booking blocks manual status changes (booking workflow owns inventory status)

## UI pieces

| Piece | Role |
|-------|------|
| `UnitTable` | List with pricing + area columns |
| `UnitFilters` | Status / type / block / floor |
| `UnitFormDrawer` | Create / edit |
| `UnitStatusDialog` | Manual status with transition + booking guards |
| `UnitSummary` | Detail identity + areas |
| `UnitPriceBreakup` | Base / charges / tax / total |
| `UnitStatusHistory` | Client timeline |
| `LinkedBookingPanel` | Active / linked booking |
| `UnitDocumentsPanel` | `entityType=unit` documents |

Nav: **Sales → Units** (`projectScope: required`).

Deep-link helper: `unitDetailPath(id)`.

## Tests

```bash
pnpm --filter @luxaria/web test:unit -- src/units/validation.test.ts src/units/statusTransitions.test.ts src/units/bookedRestrictions.test.ts src/units/roleAccess.test.ts
```
