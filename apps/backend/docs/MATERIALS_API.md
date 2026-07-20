# Materials API — Luxaria Developers ERP

Base path: `/api/v1/materials`  
Swagger: `http://localhost:9000/api/docs` (Materials tag)

## Permissions

| Permission | Usage |
|------------|--------|
| `material.view` | List, get, search, units |
| `material.manage` | Create, update |

## Units

`number`, `bag`, `kilogram`, `ton`, `litre`, `metre`, `square_foot`, `cubic_foot`, `load`, `box`

Conversion rule: **1 × alternate unit = `factorToBase` × base unit**.  
Example: `baseUnit=kilogram`, alternate `ton` with `factorToBase=1000`.

## Fields

- `materialCode` — auto `MAT-######`
- `name`, `category`, `specification`, `brand`
- `baseUnit`, `alternateUnits[]`, `conversionFactors[]`
- `standardRate`, `minimumStock`, `reorderLevel`, `maximumStock`
- `standardWastagePercentage`
- `ledgerAccountId` — active COA in `material_purchase` / `work_in_progress` / `direct_expense` / `land_cost`
- `status` — `active` | `inactive`
- `baseUnitLocked` — true after any stock ledger entry exists (see Stock Ledger API)

## Endpoints

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/materials/units` | Supported units |
| `POST` | `/materials` | Create |
| `GET` | `/materials` | Search / filter (`search`, `status`, `category`, `baseUnit`, `brand`, `ledgerAccountId`) |
| `GET` | `/materials/:id` | Detail |
| `PATCH` | `/materials/:id` | Update; **base unit blocked** once stock movements exist |

## Base unit lock

After the first row in `material_stock_transactions` for a material, changing `baseUnit` returns `400` unless a dedicated migration is performed later. Inventory/GRN modules should record movements via `MaterialsService.recordStockTransaction`.
