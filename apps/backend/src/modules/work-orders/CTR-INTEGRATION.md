# Work Orders + Amendments — Integration Checklist (Phase 6 / W4)

**Principle (CTR-architecture):** Approved commercial terms are never silently overwritten — amendments create revision history. Bill rates resolve from the active WO revision.

Permissions used (add to RBAC catalog + role seeds when wiring — **not applied in this wave**):

| Permission | Usage |
|------------|--------|
| `work_order.view` | List / get WO, list/get amendments, revision history |
| `work_order.create` | Create, update draft, submit, accept, start, partial, complete, createAmendment |
| `work_order.approve` | Approve WO, approve/reject amendment |
| `work_order.issue` | Issue WO to contractor |
| `work_order.close` | Close completed WO; cancel pre-acceptance WO |

## Backend registration

1. **App module** — import and register (`apps/backend/src/app.module.ts`):

```ts
import { WorkOrdersModule } from './modules/work-orders';

@Module({
  imports: [
    // ...
    WorkOrdersModule,
  ],
})
export class AppModule {}
```

2. **RBAC** — `apps/backend/src/modules/rbac/permissions.catalog.ts`:

```ts
'work_order.view',
'work_order.create',
'work_order.approve',
'work_order.issue',
'work_order.close',
```

Seed onto Site Engineer / PM (view + create), QS / PM lead (approve + issue), Director / Finance (view + close) as appropriate — `role.seed.ts`.

3. **Resource ownership** — `resource-ownership.registry.ts`:

```ts
'work-order': {
  modelName: 'WorkOrder',
  projectIdField: 'projectId',
  siteIdField: 'siteId',
},
```

Optional: register `work-order-amendment` resolving `workOrderId` → parent WO project/site for amendment-by-id routes.

## Web registration

1. Routes (e.g. `apps/web/src/routes/routeElements.tsx` + `routeRegistry.ts`):

```tsx
{ path: 'work-orders', element: <WorkOrdersPage /> }
{ path: 'work-orders/:id', element: <WorkOrderDetailPage /> }
```

2. Navigation — under Contractors / Project Control, label **Work Orders**, permission `work_order.view`.

3. Page + API stubs already at:

- `apps/web/src/work-orders/api.ts`
- `apps/web/src/work-orders/index.ts`
- `apps/web/src/pages/WorkOrdersPage.tsx`
- `apps/web/src/pages/WorkOrderDetailPage.tsx`

## API surface

| Method | Path | Permission |
|--------|------|------------|
| POST | `/work-orders` | create |
| GET | `/work-orders` | view |
| GET | `/work-orders/:id` | view |
| PATCH | `/work-orders/:id` | create (draft only) |
| POST | `/work-orders/:id/submit` | create |
| POST | `/work-orders/:id/approve` | approve → freezes r1 |
| POST | `/work-orders/:id/issue` | issue |
| POST | `/work-orders/:id/accept` | create |
| POST | `/work-orders/:id/start` | create |
| POST | `/work-orders/:id/partially-complete` | create |
| POST | `/work-orders/:id/complete` | create |
| POST | `/work-orders/:id/close` | close |
| POST | `/work-orders/:id/cancel` | close |
| POST | `/work-orders/:id/amendments` | create |
| GET | `/work-orders/:id/amendments` | view |
| GET | `/work-orders/amendments/:amendmentId` | view |
| POST | `/work-orders/amendments/:amendmentId/approve` | approve |
| POST | `/work-orders/amendments/:amendmentId/reject` | approve |

## Lifecycle

```
draft → pending_approval → approved → issued → accepted
  → in_progress → partially_completed → completed → closed
cancel ← draft | pending_approval | approved | issued
```

## Amendment immutability model

- Collections: `work_orders` + `work_order_amendments`
- On WO **approve**: active commercial is copied into append-only `revisions[]` as **r1**
- **createAmendment**: writes a separate amendment document with full **proposed** commercial payload; **does not** mutate WO active fields or prior `revisions[]`
- **approveAmendment**: appends **rN** to `revisions[]`, then updates active commercial from proposed; prior revision rows are never overwritten
- Direct `PATCH` blocked after draft — commercial changes must go through amendments

## Collections

| Collection | Purpose |
|------------|---------|
| `work_orders` | Lifecycle + active commercial + frozen `revisions[]` |
| `work_order_amendments` | Pending/approved/rejected amendment requests |

## Downstream (later waves)

- W5 Measurement Book → link `workOrderId` + active revision
- W6 RA bills → resolve rates from active WO revision only
- Approvals engine: optional `ApprovalsService` wiring for WO / amendment (currently direct permission transitions)
