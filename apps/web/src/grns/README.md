# Goods Receipts / GRN (Micro Phase 068)

Routes: `/inventory/grns` · `/inventory/grns/:grnId`  
Nav: **Inventory → Goods Receipts** (`projectScope: required`)

## Nest APIs

Base: `/goods-receipts` (Swagger tag **Goods Receipts**)

| Endpoint | Nest permission |
|----------|-----------------|
| `GET /` · `GET /:id` | `grn.create` |
| `POST /:id/quality-check` | `grn.approve` |
| `POST /:id/accept` | `grn.approve` |
| `POST /:id/post` | `grn.approve` |

PO comparison (optional): `GET /purchase-orders/:id` (`purchase.view`).

Phase prompt aliases `grn.view` / `grn.qc` / `grn.accept` / `grn.post` are **not** in the Nest catalog — UI maps them to `grn.create` (view) and `grn.approve` (QC / accept / post).

## Workflow

`draft` → `submitted` → `quality_check` → `accepted` | `partially_accepted` → `posted`

Back-office review focuses on submitted+ receipts: start QC, record line acceptance (full or partial), then **post** (stock increases for accepted qty only).

## Validation

- Client: `accepted + rejected ≤ received` (Phase 068); rejection reason ≥ 3 chars when rejected &gt; 0.
- Nest: `accepted + rejected === received` on accept; at least one line with `acceptedQuantity &gt; 0`.

## UI states

List/detail use shared empty / permission denied / retry patterns. Detail tabs: Overview (items + acceptance), Media, GPS, PO comparison.
