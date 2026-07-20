# Vendor Quotations API — Luxaria Developers ERP

Base path: `/api/v1/vendor-quotations`  
Swagger tag: **Vendor Quotations**

## Permissions

| Permission | Usage |
|------------|--------|
| `quotation.view` | List / get / compare |
| `quotation.manage` | Create, update, submit, revise, upload document, cancel |
| `quotation.finalize` | Mark final quotation |

## Numbering

`NumberEntityType.VENDOR_QUOTATION` → `VQ-YYYY-######` (FY + project-scoped from the linked purchase request).

## Workflow

```
Draft → Submitted → Final
          ↓ revise
       Superseded (previous) + new Draft revision
Draft/Submitted → Cancelled
```

- Quotations can only be created against **Approved** or **Sourcing** purchase requests.
- Only **draft** quotations are editable in place.
- **Revise** supersedes the previous submitted/final quote and opens a new draft revision.
- **Mark final** selects one submitted quote per purchase request (any prior final is demoted to submitted).

## Line totals

`total = quantity × rate − discount + tax` (amounts in ₹)

Header: `grandTotal = itemsSubtotal + freight + taxes − discount`

## Compare

`GET /vendor-quotations/compare?purchaseRequestId=...`

Returns latest revision per vendor with:

- side-by-side line rates
- `lowestRate` per material
- `lowestGrandTotalQuotationId`
- `fastestDeliveryQuotationId`

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/vendor-quotations` |
| `GET` | `/vendor-quotations` |
| `GET` | `/vendor-quotations/compare` |
| `GET` | `/vendor-quotations/:id` |
| `PATCH` | `/vendor-quotations/:id` |
| `POST` | `/vendor-quotations/:id/submit` |
| `POST` | `/vendor-quotations/:id/revise` |
| `POST` | `/vendor-quotations/:id/mark-final` |
| `POST` | `/vendor-quotations/:id/cancel` |
| `POST` | `/vendor-quotations/:id/document` (multipart `file`) |
