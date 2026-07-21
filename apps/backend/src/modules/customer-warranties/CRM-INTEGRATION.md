# Customer Warranties — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `warranty.view` | List / get warranty tickets |
| `warranty.manage` | Create, update, transition, assign, materials, photos |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'warranty.view',
'warranty.manage',
```

Suggested seeds: CRM / After-sales (view + manage), Contractors (view assigned), PM (view).

## Backend registration

1. **App module**:

```ts
import { CustomerWarrantiesModule } from './modules/customer-warranties';

@Module({
  imports: [
    // ...
    CustomerWarrantiesModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership**:

```ts
'customer-warranty': {
  model: CustomerWarranty.name,
  projectField: 'projectId',
},
```

## API surface — customer-warranties

| Method | Path | Permission |
|--------|------|------------|
| POST | `/customer-warranties` | manage |
| GET | `/customer-warranties` | view |
| GET | `/customer-warranties/:id` | view |
| PATCH | `/customer-warranties/:id` | manage |
| POST | `/customer-warranties/:id/transition` | manage |
| POST | `/customer-warranties/:id/assign` | manage |
| POST | `/customer-warranties/:id/add-material` | manage |
| POST | `/customer-warranties/:id/add-photo` | manage |

### Workflow (enforced sequence)

`complaint → inspection → assigned → rectified → verified → closed`  
Also: `complaint|inspection|assigned|rectified → rejected`

Create always starts at `complaint`. Transition to `assigned` requires prior assign (contractor or user).

### Categories

`waterproofing`, `electrical`, `plumbing`, `finishing`, `other`

## Module path

```
apps/backend/src/modules/customer-warranties/
```

## Out of scope (later)

- SLA breach notifications
- Contractor work-order auto-creation
- Link to material issues / inventory
