# Quotation Comparisons API — Luxaria Developers ERP

Base path: `/api/v1/quotation-comparisons`  
Swagger tag: **Quotation Comparisons**

## Permissions

| Permission | Usage |
|------------|--------|
| `quotation.compare` | Generate, list, get, export PDF, cancel |
| `quotation.recommend` | Recommend vendor, submit for approval |

## Numbering

`NumberEntityType.QUOTATION_COMPARISON` → `QC-YYYY-######` (FY + project-scoped).

## Comparison dimensions

Each vendor row snapshots:

| Field | Source |
|-------|--------|
| Base material rate | Weighted avg `Σ(qty×rate)/Σ(qty)` |
| GST | Line taxes + header taxes |
| Freight | Quotation freight |
| Discount | Line discounts + header discount |
| Net landed cost | Quotation `grandTotal` |
| Delivery time | `deliveryDays` |
| Payment terms | Quotation / vendor |
| Vendor rating | Vendor master `rating` |
| Previous quality | Optional override at generate (until GRN history) |
| Previous delivery performance | Optional override at generate (until GRN history) |

## Workflow

```
Draft → Recommended → Pending Approval → (approved via Approvals module)
  ↘ Cancelled
```

1. `POST /generate` — builds statement from latest quotation per vendor (≥2 required)
2. `POST /:id/recommend` — select a quotation
3. If selected vendor is **not** lowest net landed cost → `reason` required (≥10 chars)
4. `POST /:id/submit-approval` — creates Approvals request (`procurement` / `quotation_comparison`)
5. `POST /:id/export-pdf` — writes PDF under `uploads/quotation-comparisons/`

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/quotation-comparisons/generate` |
| `GET` | `/quotation-comparisons` |
| `GET` | `/quotation-comparisons/:id` |
| `POST` | `/quotation-comparisons/:id/recommend` |
| `POST` | `/quotation-comparisons/:id/submit-approval` |
| `POST` | `/quotation-comparisons/:id/export-pdf` |
| `POST` | `/quotation-comparisons/:id/cancel` |
