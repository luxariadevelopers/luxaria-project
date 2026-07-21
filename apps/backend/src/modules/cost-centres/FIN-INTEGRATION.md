# Cost Centres — Integration Checklist (Phase 8 / FIN)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

Permissions are already present in RBAC catalog + role seeds:

| Permission | Usage |
|------------|--------|
| `cost_centre.view` | List / get |
| `cost_centre.manage` | Create, update, activate, deactivate |

## Backend registration

1. **App module** — import and register:

```ts
import { CostCentresModule } from './modules/cost-centres';

@Module({
  imports: [
    // ...
    CostCentresModule,
  ],
})
export class AppModule {}
```

2. **Journal module** — import `CostCentresModule` and call `CostCentresService.assertActive(costCentreId)` when validating journal lines that carry `costCentreId`.

## API surface — cost-centres

| Method | Path | Permission |
|--------|------|------------|
| POST | `/cost-centres` | manage |
| GET | `/cost-centres` | view |
| GET | `/cost-centres/:id` | view |
| PATCH | `/cost-centres/:id` | manage |
| POST | `/cost-centres/:id/activate` | manage |
| POST | `/cost-centres/:id/deactivate` | manage |

### Filters (list)

`companyId`, `projectId`, `kind`, `status`, `search` (code/name), pagination.

### Exports

`CostCentresService.assertActive(id)` — throws when centre is missing or inactive.

## Module path

```
apps/backend/src/modules/cost-centres/
```

Collection: `cost_centres`
