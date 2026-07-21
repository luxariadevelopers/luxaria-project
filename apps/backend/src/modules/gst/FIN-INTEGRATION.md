# GST Registers & Returns — Integration Checklist (Phase 8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

Permissions `gst.view`, `gst.manage`, and `gst.file` are already listed in `permissions.catalog.ts` and role seeds.

## Permissions

| Permission | Usage |
|------------|--------|
| `gst.view` | List documents / register / returns |
| `gst.manage` | Create documents, sync, compute, cancel |
| `gst.file` | File computed returns |

## Backend registration

1. **App module** — import and register:

```ts
import { GstModule } from './modules/gst';

@Module({
  imports: [
    // ...
    GstModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — when wiring `@ProjectScoped` lookups for document `:id` routes:

```ts
'gst-document': {
  model: GstDocument.name,
  projectField: 'projectId',
},
```

Returns use `@GlobalScope()` (company-level statutory filing).

## API surface — `/gst`

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| POST | `/gst/documents` | manage | project filter |
| GET | `/gst/documents` | view | project filter |
| GET | `/gst/documents/:id` | view | project filter |
| POST | `/gst/documents/:id/cancel` | manage | project filter |
| POST | `/gst/documents/sync-from-source` | manage | project filter |
| GET | `/gst/register` | view | project filter |
| POST | `/gst/returns` | manage | global |
| GET | `/gst/returns` | view | global |
| GET | `/gst/returns/:id` | view | global |
| POST | `/gst/returns/:id/compute` | manage | global |
| POST | `/gst/returns/:id/file` | **file** | global |
| POST | `/gst/returns/:id/cancel` | manage | global |

### Collections

- `gst_documents` — GSTDocument (unique `documentNumber`; idempotent sync on `sourceModule` + `sourceEntityId`)
- `gst_returns` — GstReturn (unique `returnNumber`; unique company + type + period)

### Workflow

Documents: `draft | posted → cancelled`  
Returns: `draft → computed → filed` (or `cancelled` before filed)

`POST …/sync-from-source` — stub upsert keyed by `{ sourceModule, sourceEntityId }` for vendor_invoice / contractor_bill / customer_invoice hooks (later waves populate tax lines from source).

`POST …/returns/:id/compute` — aggregates **posted** documents in `periodMonth` / `periodYear` into outward/inward totals, ITC, and tax payable.

## Module path

```
apps/backend/src/modules/gst/
```

## Out of scope (later)

- Auto-post journal entries on document register
- GSTR JSON export / GSTN portal integration
- Reverse charge / composition scheme rules
