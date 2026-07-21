# TDS Sections, Deductions & Returns — Integration Checklist (Phase 8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

Permissions `tds.view`, `tds.manage`, and `tds.file` are already listed in `permissions.catalog.ts` and role seeds.

## Permissions

| Permission | Usage |
|------------|--------|
| `tds.view` | List sections / deductions / register / returns |
| `tds.manage` | CRUD sections, deductions, compute, cancel, deposit, certify |
| `tds.file` | File computed quarterly returns |

## Backend registration

1. **App module** — import and register:

```ts
import { TdsModule } from './modules/tds';

@Module({
  imports: [
    // ...
    TdsModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access) — for deduction `:id` routes:

```ts
'tds-deduction': {
  model: TdsDeduction.name,
  projectField: 'projectId',
},
```

Sections and returns use `@GlobalScope()` (company / master data).

## Seed data

`TdsSeedService` idempotently seeds on module init:

| Code | Rate | Threshold |
|------|------|-----------|
| 194C | 1% | ₹30,000 |
| 194J | 10% | ₹30,000 |
| 194Q | 0.1% | ₹50,00,000 |

Manual re-seed: `POST /tds/sections/seed-defaults` (`tds.manage`).

## API surface — `/tds`

| Method | Path | Permission | Scope |
|--------|------|------------|-------|
| POST | `/tds/sections` | manage | global |
| POST | `/tds/sections/seed-defaults` | manage | global |
| GET | `/tds/sections` | view | global |
| GET | `/tds/sections/:id` | view | global |
| PATCH | `/tds/sections/:id` | manage | global |
| DELETE | `/tds/sections/:id` | manage | global |
| POST | `/tds/deductions` | manage | project filter |
| GET | `/tds/deductions` | view | project filter |
| GET | `/tds/deductions/:id` | view | project filter |
| POST | `/tds/deductions/:id/cancel` | manage | project filter |
| POST | `/tds/deductions/:id/mark-deposited` | manage | project filter |
| POST | `/tds/deductions/:id/mark-certified` | manage | project filter |
| GET | `/tds/register` | view | project filter |
| POST | `/tds/returns` | manage | global |
| GET | `/tds/returns` | view | global |
| GET | `/tds/returns/:id` | view | global |
| POST | `/tds/returns/:id/compute` | manage | global |
| POST | `/tds/returns/:id/file` | **file** | global |
| POST | `/tds/returns/:id/cancel` | manage | global |

### Collections

- `tds_sections` — TdsSection (unique `sectionCode`)
- `tds_deductions` — TdsDeduction (unique `deductionNumber`)
- `tds_returns` — TdsReturn (unique `returnNumber`; unique company + form + FY + quarter)

### Deduction lifecycle

`withheld → deposited → certified`  
Also: `withheld|deposited → cancelled` (not after certified)

### Return workflow

`draft → computed → filed` (or `cancelled` before filed)

`POST …/returns/:id/compute` — aggregates active deductions in FY quarter (Indian FY calendar).

## Module path

```
apps/backend/src/modules/tds/
```

## Out of scope (later)

- Auto TDS on contractor bill / vendor payment post
- TRACES / NSDL e-TDS file generation
- Lower deduction certificate (Form 13) handling
