# `@luxaria/shared-format`

India-focused display utilities for Luxaria Developers ERP (Micro Phase 005).

## Helpers

| Export | Purpose |
|--------|---------|
| `formatInr` | INR currency (`en-IN`), amounts in **rupees** |
| `formatIndianNumber` | Indian digit grouping without currency symbol |
| `formatPercentage` | `12.50%` style |
| `formatQuantity` | Qty with up to 6 fraction digits |
| `formatDate` / `formatDateTime` / `formatTime` | Display in `Asia/Kolkata` by default |
| `toIsoDateString` | `YYYY-MM-DD` in a timezone (for query params) |
| `getFinancialYear` / `formatFinancialYear` | April–March FY by default (`company.financialYearStartMonth`) |

Null / invalid inputs return `—` (`EMPTY_DISPLAY`), except `toIsoDateString` which returns `''`. Zero and negative values are preserved.

## Usage

```ts
import { formatInr, formatDate, formatFinancialYear } from '@luxaria/shared-format';
// or from apps/web|mobile `src/format`
```

## Tests

```bash
pnpm --filter @luxaria/shared-format test
```
