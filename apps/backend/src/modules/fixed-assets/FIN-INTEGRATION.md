# Fixed Assets — Finance Integration Checklist (Phase 8)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

## Permissions (add to RBAC catalog + role seeds when wiring)

| Permission | Usage |
|------------|--------|
| `fixed_asset.view` | List / get assets, depreciations, register |
| `fixed_asset.manage` | Create, update, activate, dispose |
| `fixed_asset.depreciate` | Run period depreciation |

```ts
// apps/backend/src/modules/rbac/permissions.catalog.ts
'fixed_asset.view',
'fixed_asset.manage',
'fixed_asset.depreciate',
```

Suggested seeds: Finance (view + manage + depreciate), Accounts (view), Director (all).

## Backend registration

1. **App module** — import and register:

```ts
import { FixedAssetsModule } from './modules/fixed-assets';

@Module({
  imports: [
    // ...
    FixedAssetsModule,
  ],
})
export class AppModule {}
```

2. **Resource ownership** (project-access):

```ts
'fixed-asset': {
  model: FixedAsset.name,
  projectField: 'projectId',
},
```

## API surface — fixed-assets

| Method | Path | Permission |
|--------|------|------------|
| POST | `/fixed-assets` | manage |
| GET | `/fixed-assets/depreciations?assetId=` | view |
| GET | `/fixed-assets` | view |
| GET | `/fixed-assets/:id/register` | view |
| GET | `/fixed-assets/:id` | view |
| PATCH | `/fixed-assets/:id` | manage |
| POST | `/fixed-assets/:id/activate` | manage |
| POST | `/fixed-assets/:id/dispose` | manage |
| POST | `/fixed-assets/:id/depreciate` | **depreciate** |

### Collections

- `fixed_assets` — asset master (gross block, GL account links, status)
- `fixed_asset_depreciations` — period depreciation runs (unique per asset + month + year)

### Workflow

Asset: `draft → active → disposed` (or `written_off` later)  
Depreciation: `draft → posted` (journal optional)

### Depreciation posting

`POST :id/depreciate { periodMonth, periodYear, amount? }`

- SLM default when `amount` omitted: `(grossBlock - salvageValue) / usefulLifeMonths`
- WDV: requires `depreciationRatePercent` or explicit `amount`
- When `glDepExpenseAccountId` + `glAccumDepAccountId` set and `JournalService` available:
  - Dr Depreciation Expense, Cr Accumulated Depreciation (`post: true`, `sourceModule=fixed_asset`)
- If journal fails: `journalEntryId` stays null, `postingNote` set, depreciation still **posted**

### Register summary

`GET /fixed-assets/:id/register` — gross, accumulated, net block, depreciation count/totals, last period.

## Module path

```
apps/backend/src/modules/fixed-assets/
```

## Out of scope (later)

- Capitalization journal on activate (Dr Fixed Asset / Cr Vendor or WIP)
- Disposal gain/loss journal
- Depreciation reversal workflow
- Bulk monthly depreciation run
