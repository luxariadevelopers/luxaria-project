# Opening Balances — Integration Checklist (Phase 8 / FIN)

**Do not edit in this wave (document only):** `app.module.ts`, `permissions.catalog.ts`, `routeRegistry.ts`.

Permissions are already present in RBAC catalog + role seeds:

| Permission | Usage |
|------------|--------|
| `opening_balance.view` | List / get |
| `opening_balance.manage` | Create, update draft, cancel |
| `opening_balance.post` | Post pack → journal |

## Backend registration

```ts
import { OpeningBalancesModule } from './modules/opening-balances';

@Module({
  imports: [
    // ...
    OpeningBalancesModule,
  ],
})
export class AppModule {}
```

Depends on: `JournalModule`, `FinancialYearModule`, `CostCentresModule`, `Account` model.

## API surface — opening-balances

| Method | Path | Permission |
|--------|------|------------|
| POST | `/opening-balances` | manage |
| GET | `/opening-balances` | view |
| GET | `/opening-balances/:id` | view |
| PATCH | `/opening-balances/:id` | manage |
| POST | `/opening-balances/:id/post` | **post** |
| POST | `/opening-balances/:id/cancel` | manage |

### Pack numbering

`OB-{FY start year}-{4-digit seq}` scoped per `companyId` + `financialYearId`.

### Posting

Creates one balanced journal via `JournalService.create` with:

- `sourceModule`: `opening_balance`
- `sourceEntityType`: `opening_balance_pack`
- `postingPurpose`: `opening`
- `post`: `true`
- `journalDate`: financial year `startDate`

Only one **posted** pack per company + financial year (partial unique index).

## Module path

```
apps/backend/src/modules/opening-balances/
```

Collection: `opening_balance_packs`
