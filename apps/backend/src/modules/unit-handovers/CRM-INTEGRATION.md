# Unit Handovers — CRM Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `handover.view` | List / get unit handovers |
| `handover.manage` | Create, update, schedule, start, complete, cancel, snags |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'handover.view',
'handover.manage',
```

Suggested seeds: CRM / Handover team (view + manage), PM (view).

## Backend registration

1. **App module**:

```ts
import { UnitHandoversModule } from './modules/unit-handovers';

@Module({
  imports: [
    // ...
    UnitHandoversModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership**:

```ts
'unit-handover': {
  model: UnitHandover.name,
  projectField: 'projectId',
},
```

## API surface — unit-handovers

| Method | Path | Permission |
|--------|------|------------|
| POST | `/unit-handovers` | manage |
| GET | `/unit-handovers` | view |
| GET | `/unit-handovers/:id` | view |
| PATCH | `/unit-handovers/:id` | manage |
| POST | `/unit-handovers/:id/schedule` | manage |
| POST | `/unit-handovers/:id/start` | manage |
| POST | `/unit-handovers/:id/complete` | manage |
| POST | `/unit-handovers/:id/cancel` | manage |
| POST | `/unit-handovers/:id/add-snag` | manage |
| POST | `/unit-handovers/:id/close-snag/:snagId` | manage |

### Workflow

`draft → scheduled → in_progress → completed`  
Also: `draft|scheduled|in_progress → cancelled`

### Complete rules

- Requires `keysHandedOver === true` and `customerAcknowledged === true`
- On complete: if `UnitStatus` includes `handed_over`, sets unit status; otherwise appends completion note to unit

## Module path

```
apps/backend/src/modules/unit-handovers/
```

## Out of scope (later)

- Customer portal acknowledgement flow
- Auto-create warranty tickets from snag list
- Photo upload service integration
