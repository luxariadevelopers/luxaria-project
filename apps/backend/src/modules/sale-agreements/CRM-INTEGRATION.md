# Sale Agreements — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Purpose

Formal sale agreement lifecycle for CRM bookings: draft → approval → execution, with versioning (`superseded`) and optional booking status sync on execute.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `agreement.view` | List / get |
| `agreement.manage` | Create, update draft, submit, execute, revise, cancel |
| `agreement.approve` | Approve / reject pending agreements |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'agreement.view',
'agreement.manage',
'agreement.approve',
```

Suggested seeds: Sales (view + manage), Sales lead / Director (view + manage + approve).

## Backend registration

1. **App module** — import `SaleAgreementsModule` from `./modules/sale-agreements`.
2. **Resource ownership** (project-access):

```ts
'sale-agreement': {
  model: SaleAgreement.name,
  projectField: 'projectId',
},
```

## API surface — sale-agreements

| Method | Path | Permission |
|--------|------|------------|
| POST | `/sale-agreements` | manage |
| GET | `/sale-agreements` | view |
| GET | `/sale-agreements/:id` | view |
| PATCH | `/sale-agreements/:id` | manage |
| POST | `/sale-agreements/:id/submit` | manage |
| POST | `/sale-agreements/:id/approve` | approve |
| POST | `/sale-agreements/:id/reject` | approve |
| POST | `/sale-agreements/:id/execute` | manage |
| POST | `/sale-agreements/:id/revise` | manage |
| POST | `/sale-agreements/:id/cancel` | manage |

### Workflow

`draft → pending_approval → approved → executed`  
Reject: `pending_approval → draft` (rejection fields retained)  
Revise: source → `superseded`, new row `draft` with `version + 1`  
Cancel: `draft | pending_approval | approved → cancelled`

### Booking integration (soft)

On **execute**, if `Booking` model is available and `BookingStatus.Agreement` exists, booking status is updated. Failures are swallowed so the module works standalone.

## Module path

```
apps/backend/src/modules/sale-agreements/
```

## Out of scope (later)

- Approvals-engine document wiring (`approvalRequestId`)
- PDF generation / e-sign
- Auto-populate payment schedule from booking payment plan
