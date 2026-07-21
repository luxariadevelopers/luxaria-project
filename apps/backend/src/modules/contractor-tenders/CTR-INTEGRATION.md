# Contractor Tenders — Integration Checklist (Phase 6 / W2)

Invite → tech/commercial bid → compare → recommend → award. Links optionally to rate contract (W3) or existing `contractor-agreements`.

Permissions used (**add to RBAC catalog + role seeds when wiring** — not applied in this wave):

| Permission | Usage |
|------------|--------|
| `tender.view` | List, get, compare |
| `tender.manage` | Create, invite, record bid, recommend, cancel, negotiation notes |
| `tender.award` | Award under_evaluation → awarded |

Suggested role seeds: PM / QS (`view` + `manage`), Director / commercial head (`view` + `manage` + `award`), site engineer read-only where needed (`view`).

## Backend registration

1. **App module** — import and register (do **not** auto-wire until wave cutover):

```ts
import { ContractorTendersModule } from './modules/contractor-tenders';

@Module({
  imports: [
    // ...
    ContractorTendersModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'tender.view',
'tender.manage',
'tender.award',
```

Seed onto PM / QS / Director as above in `role.seed.ts`.

3. **Project access resource registry** — `resource-ownership.registry.ts`:

```ts
'contractor-tender': {
  modelName: 'ContractorTender',
  projectIdField: 'projectId',
  companyIdField: null,
},
```

Required for `@ProjectScoped({ resource: { resourceType: 'contractor-tender' } })` on get-by-id routes.

4. **Site access** — service calls `SiteAccessService.assertSiteAccessIfScoped` whenever `siteId` is present on create / mutate / get / filtered list.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx`) — **not wired in this wave**:

```tsx
{ path: 'contractor-tenders', element: <TenderListPage /> }
{ path: 'contractor-tenders/:id/compare', element: <BidComparisonPage /> }
```

2. Navigation — under Contractors / Commercial, label **Tenders**, permission `tender.view`.

3. Page + API already live at:

- `apps/web/src/contractor-tenders/api.ts`
- `apps/web/src/pages/TenderListPage.tsx`
- `apps/web/src/pages/BidComparisonPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/contractor-tenders` | manage |
| GET | `/contractor-tenders` | view |
| GET | `/contractor-tenders/:id` | view |
| POST | `/contractor-tenders/:id/invite` | manage |
| POST | `/contractor-tenders/:id/bids` | manage |
| POST | `/contractor-tenders/:id/compare` | view |
| POST | `/contractor-tenders/:id/recommend` | manage |
| POST | `/contractor-tenders/:id/award` | award |
| POST | `/contractor-tenders/:id/cancel` | manage |
| POST | `/contractor-tenders/:id/negotiation-notes` | manage |

## Workflow

```
draft → invited → bidding → under_evaluation → awarded
                              ↘ cancel (from any open status)
```

- **invite** requires `bidDeadline` + ≥1 contractor; merge-adds to `invitedContractorIds`.
- **record bid** (`POST …/bids`) upserts technical and/or commercial subdocs for an invited contractor; moves to `bidding`.
- **compare** moves `bidding` → `under_evaluation` and returns a ranked commercial matrix (+ technical scores).
- **recommend** stores recommendation subdoc (must be invited).
- **award** sets `awardedContractorId` and optional `awardedRateContractId` / `awardedAgreementId`.

## Downstream (later waves)

- W3 rate contracts: populate `awardedRateContractId` on award.
- W4 work orders: seed WO from awarded tender + agreement/rate contract.
- Approvals engine: optional gate on `recommend` / `award` (reuse `approvals` — not required for W2 MVP).
