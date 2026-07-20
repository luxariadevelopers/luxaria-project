# Materials catalogue (web)

Micro Phase 058 — material master UI at `/inventory/materials`.

## Nest API (existing only)

| Method | Path | Permission |
|--------|------|------------|
| `GET` | `/materials/units` | `material.view` |
| `GET` | `/materials` | `material.view` |
| `GET` | `/materials/:id` | `material.view` |
| `POST` | `/materials` | `material.manage` |
| `PATCH` | `/materials/:id` | `material.manage` |

Ledger picker uses `GET /accounts` (`account.view`) filtered to Nest-allowed categories:
`material_purchase`, `work_in_progress`, `direct_expense`, `land_cost`.

Status values: `active` | `inactive`.  
Units: `number`, `bag`, `kilogram`, `ton`, `litre`, `metre`, `square_foot`, `cubic_foot`, `load`, `box`.

Conversion rule: **1 × alternate unit = `factorToBase` × base unit**.

## Permissions

Prompt aliases `material.create` / `material.update` are **not** in the RBAC catalog.
UI capabilities map to Nest codes:

- view → `material.view`
- create / update / status → `material.manage`

Route guard requires `material.view`. Manage actions are hidden without `material.manage`.
403 responses render `PermissionDenied` / `RetryPanel`.

## UI pieces

- `MaterialTable` — list with search, pagination, reorder columns, status
- `MaterialFilters` — status, category, base unit
- `UnitDisplay` — base + alternate conversion summary
- `MaterialFormDrawer` — create/edit with conversion factors and reorder settings
- Client validation in `validation.ts` (unit conversions + stock levels)

## Tests

```bash
pnpm --filter @luxaria/web test:unit -- src/materials/validation.test.ts
```

---

# Materials detail (Micro Phase 059)

Routes:
- `/inventory/materials` — deep-link landing (minimal list; full catalogue is Phase 058)
- `/inventory/materials/:materialId` — specifications, conversions, project stock, usage

Nav: **Projects & site → Materials** (`projectScope: required` for stock context).

## APIs (existing Nest only)

| Endpoint | Permission |
|----------|------------|
| `GET /materials` · `GET /materials/:id` · `GET /materials/units` | `material.view` |
| `PATCH /materials/:id` | `material.manage` (prompt alias `material.update`) |
| `GET /stock-ledger/balance?projectId&materialId` | `stock.view` |
| `GET /stock-ledger?projectId&materialId` | `stock.view` (usage references) |

## Rules

1. `baseUnitLocked` from Nest → base unit field is **read-only**; client omits `baseUnit` on PATCH and blocks unsafe changes
2. Stock cards / usage require active project + `stock.view` (403 → `PermissionDenied`)
3. Route guards: `RegistryRouteGuard` + Nest 403 — hiding buttons is not enough
4. Conversions: `1 × alternate = factorToBase × baseUnit` (from material master)

## UI

| Piece | Role |
|-------|------|
| `MaterialDeepLinkList` | Minimal row links to detail |
| `MaterialSpecSummary` | Specs, brand, thresholds, lock note |
| `MaterialConversionTable` | Alternate unit factors |
| `MaterialStockCards` | On-hand vs min/reorder/max |
| `MaterialUsageTable` | Ledger referenceType / referenceId |
| `EditMaterialDrawer` | Manage update with locked base unit |

Deep-link helper: `materialDetailPath(id)` for Phase 058 catalogue rows.
