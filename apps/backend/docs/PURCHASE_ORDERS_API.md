# Purchase Orders API — Luxaria Developers ERP

Base path: `/api/v1/purchase-orders`  
Swagger tag: **Purchase Orders**

## Permissions

| Permission | Usage |
|------------|--------|
| `purchase.view` | List / get / balance / export PDF |
| `purchase.order` | Create, update, submit, revise, close, cancel |
| `purchase.approve` | Approve / reject |
| `grn.create` | Record receipts against PO |

## Numbering

`NumberEntityType.PURCHASE_ORDER` → `PO-YYYY-######` (FY + project-scoped).

## Workflow

```
Draft → Pending Approval → Issued → Partially Received → Fully Received → Closed
                ↘ Rejected (editable as draft after corrections)
Issued → Superseded (on revise) + new Draft revision
Draft / Pending Approval / Issued → Cancelled
```

## Rules

1. **Versioning after approval** — Issued POs cannot be edited in place. Use `POST /:id/revise` to supersede and open a new draft revision (re-approval required).
2. **Receive tolerance** — Cumulative received qty may exceed ordered qty by at most `PO_RECEIVE_TOLERANCE_PERCENT` (default **5%**).
3. **PDF** — `POST /:id/export-pdf` writes under `uploads/purchase-orders/…`.
4. **PO balance** — Line `balanceQuantity` and header `balanceQuantity` / `balanceAmount`; also `GET /:id/balance`.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/purchase-orders` |
| `GET` | `/purchase-orders` |
| `GET` | `/purchase-orders/:id` |
| `GET` | `/purchase-orders/:id/balance` |
| `PATCH` | `/purchase-orders/:id` |
| `POST` | `/purchase-orders/:id/submit-approval` |
| `POST` | `/purchase-orders/:id/approve` |
| `POST` | `/purchase-orders/:id/reject` |
| `POST` | `/purchase-orders/:id/revise` |
| `POST` | `/purchase-orders/:id/receive` |
| `POST` | `/purchase-orders/:id/close` |
| `POST` | `/purchase-orders/:id/cancel` |
| `POST` | `/purchase-orders/:id/export-pdf` |
