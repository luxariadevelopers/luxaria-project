# Measurement Book — CTR Integration (Phase 6 / W5)

**Module path:** `apps/backend/src/modules/measurement-book/`  
**Principle:** MB entries (or certified WM linked via `workMeasurementId`) are the billing quantity source for RA bills. Certified quantities are never silently edited — corrections create revision documents.

## Status

Implemented in-module. **No new permissions.** Parent merge must register the Nest module + ownership registry + web route (see below). Shared registration files were intentionally left untouched.

## Permissions (reuse — no catalog change)

| Code | Usage |
|------|--------|
| `measurement.view` | List / get |
| `measurement.create` | Create, update, submit, acknowledge, cancel, revise |
| `measurement.certify` | Verify, certify, reject |

## Workflow

```
Draft → Submitted → Acknowledged? → Verified → Certified
              ↘ Rejected → Draft (after edit) → …
Draft / Rejected → Cancelled
Certified → (revise) → Draft revision → … → Certified
                              ↘ prior Certified → Superseded
```

| Step | Endpoint | Permission | Notes |
|------|----------|------------|--------|
| Create | `POST /measurement-book` | `measurement.create` | Draft |
| Update | `PATCH /measurement-book/:id` | `measurement.create` | Draft / Rejected only |
| Submit | `POST …/:id/submit` | `measurement.create` | Engineer submission |
| Acknowledge | `POST …/:id/acknowledge` | `measurement.create` | Contractor ack |
| Verify | `POST …/:id/verify` | `measurement.certify` | Verifier ≠ measuredBy |
| Certify | `POST …/:id/certify` | `measurement.certify` | Marks prior revision superseded |
| Reject | `POST …/:id/reject` | `measurement.certify` | |
| Cancel | `POST …/:id/cancel` | `measurement.create` | Draft / Rejected |
| Revise | `POST …/:id/revise` | `measurement.create` | Certified only → new draft |

## Quantity rules

1. `formulaQuantity` wins when provided  
2. Else `L × B × H × numberOfUnits` (missing dims → 1 when any dim present)  
3. Else explicit `quantity` / nos-only  

## Key fields

| Field | Notes |
|-------|--------|
| `workOrderId` | Optional ObjectId soft-link (W4 Work Orders — no hard FK yet) |
| `workMeasurementId` | Optional reference to Phase 5 WM sheet |
| `dprId` / `drawingId` | Optional SE links |
| `location` | Site hierarchy: site / phase / block / tower / floor + label |
| `periodFrom` / `periodTo` | Billing / measurement period |
| `revision` / `supersedesId` | Immutable correction trail |

## Backend registration (parent)

1. **App module** — import and register:

```ts
import { MeasurementBookModule } from './modules/measurement-book';

@Module({
  imports: [
    // ...
    MeasurementBookModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** — `resource-ownership.registry.ts`:

```ts
'measurement-book': {
  modelName: 'MeasurementBookEntry',
  projectIdField: 'projectId',
  companyIdField: null,
},
```

3. **RBAC** — already has `measurement.view|create|certify`. No catalog change.

## Web registration (parent)

1. Route element (e.g. `routeElements.tsx`):

```tsx
{ path: 'measurement-book', element: <MeasurementBookPage /> }
```

2. Navigation — under Contractor / Project Control, label **Measurement Book**, permission `measurement.view`.

3. Files already live:

- `apps/web/src/measurement-book/api.ts`
- `apps/web/src/measurement-book/MeasurementBookPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/measurement-book` | create |
| GET | `/measurement-book` | view |
| GET | `/measurement-book/:id` | view |
| PATCH | `/measurement-book/:id` | create |
| POST | `/measurement-book/:id/submit` | create |
| POST | `/measurement-book/:id/acknowledge` | create |
| POST | `/measurement-book/:id/verify` | certify |
| POST | `/measurement-book/:id/certify` | certify |
| POST | `/measurement-book/:id/reject` | certify |
| POST | `/measurement-book/:id/cancel` | create |
| POST | `/measurement-book/:id/revise` | create |

## Relation to work-measurements

WM remains the Phase 5 site measurement sheet. MB is the Phase 6 commercial register. Prefer linking via `workMeasurementId` rather than duplicating certify logic into WM. RA bill engines should prefer certified MB quantities when present.

## Parent follow-ups

1. Wire `workOrderId` FK validation once W4 `work-orders` lands.  
2. RA bill lines (W6) consume certified MB qty and refuse double-billing.  
3. Optional: migrate / promote certified WM into MB entries in bulk.
