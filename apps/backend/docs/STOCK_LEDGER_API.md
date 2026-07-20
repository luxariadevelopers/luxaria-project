# Stock Ledger API — Luxaria Developers ERP

Base path: `/api/v1/stock-ledger`  
Swagger tag: **Stock Ledger**

## Permissions

| Permission | Usage |
|------------|--------|
| `stock.view` | List, get, balance |
| `stock.adjust` | Post entries, reverse |

## Numbering

`NumberEntityType.STOCK_LEDGER` → `SL-YYYY-######` (FY + project-scoped).

## Rules

1. Ledger entries are **immutable** (no update/delete).
2. Corrections are posted as **reversal** entries (`POST /stock-ledger/:id/reverse`).
3. On-hand quantity is maintained in `material_stock_balances` (material + project + location).
4. Negative stock is blocked unless `STOCK_ALLOW_NEGATIVE=true` or the post sets `allowNegative: true`.

## Transaction types

`opening_stock`, `purchase_receipt`, `transfer_in`, `transfer_out`, `material_issue`, `return_from_work`, `return_to_vendor`, `wastage`, `damage`, `theft_or_shortage`, `adjustment`, `reversal`

## Fields

`transactionNumber`, `projectId`, `materialId`, `transactionType`, `quantityIn`, `quantityOut`, `unit`, `baseUnitQuantity`, `referenceType`, `referenceId`, `transactionDate`, `location`, `batch`, `createdBy`

## Endpoints

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/stock-ledger` | Post immutable entry |
| `POST` | `/stock-ledger/:id/reverse` | Correction via reversal |
| `GET` | `/stock-ledger` | List / filter |
| `GET` | `/stock-ledger/balance` | Calculated on-hand |
| `GET` | `/stock-ledger/:id` | Detail |

## Integration

Goods Receipt **post** writes `purchase_receipt` ledger rows for accepted quantities only (via materials → stock ledger).

Physical stock counts **post** write `adjustment` ledger rows (see Stock Counts API).
