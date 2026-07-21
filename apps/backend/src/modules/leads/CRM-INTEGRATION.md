# CRM Leads — Integration Checklist

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `lead.view` | List / get leads |
| `lead.manage` | Create, update, transition, follow-ups, tasks, attachments |
| `lead.convert` | Convert won lead to customer |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'lead.view',
'lead.manage',
'lead.convert',
```

Suggested seeds: Sales / CRM (view + manage + convert), Director (all).

## Backend registration

1. **App module** — import and register:

```ts
import { LeadsModule } from './modules/leads';

@Module({
  imports: [
    // ...
    LeadsModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — when wiring `@ProjectScoped` resource lookups for `:id` routes, register:

```ts
// resource-ownership.registry.ts (illustrative)
lead: {
  model: Lead.name,
  projectField: 'projectId',
},
```

Until registered, list filters (`companyId`, `projectId`) are the primary scope.

## API surface — leads

| Method | Path | Permission |
|--------|------|------------|
| POST | `/leads` | `lead.manage` |
| GET | `/leads` | `lead.view` |
| GET | `/leads/:id` | `lead.view` |
| PATCH | `/leads/:id` | `lead.manage` |
| POST | `/leads/:id/transition` | `lead.manage` |
| POST | `/leads/:id/follow-ups` | `lead.manage` |
| POST | `/leads/:id/tasks` | `lead.manage` |
| PATCH | `/leads/:id/tasks/:taskId` | `lead.manage` |
| POST | `/leads/:id/convert` | `lead.convert` |
| POST | `/leads/:id/attachments` | `lead.manage` |

### Pipeline

Happy path: `new → contacted → qualified → site_visit → proposal → negotiation → won`

Also allowed:

- `lost` from any non-terminal status (requires `lostReason`)
- `won` via transition only from `proposal` or `negotiation`
- `won` via convert (creates/links customer, sets `convertedCustomerId`, `wonAt`)

Terminal statuses (`won`, `lost`) block further updates and transitions.

### Lead numbering

`LD-{YYYY}-{seq}` — sequence scoped per `companyId` when present, otherwise global. Uses document count + 1 (includes soft-deleted).

### Convert behaviour

- With `customerId`: links existing customer after existence check.
- Without `customerId`: creates minimal `Customer` (draft) from lead contact via `NumberingService` (`CUS-` code) and `InjectModel(Customer)`.

## Module path

```
apps/backend/src/modules/leads/
```

## Out of scope (later)

- File upload endpoint (attachments accept metadata only)
- Booking / unit reservation from lead
- Approvals workflow for high-value leads
- Web CRM UI routes and API client
