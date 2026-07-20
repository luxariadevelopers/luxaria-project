# Purchase Requests API — Luxaria Developers ERP

Base path: `/api/v1/purchase-requests`  
Swagger tag: **Purchase Requests**

## Permissions

| Permission | Usage |
|------------|--------|
| `purchase.view` | List / get |
| `purchase.request` | Create, update, submit, cancel |
| `purchase.approve` | Review, approve (incl. partial), reject, return |
| `purchase.order` | Start sourcing, close |

## Workflow

```
Draft → Submitted → Reviewed → Approved → Sourcing → Closed
                 ↘ Rejected
                 ↘ Returned (editable)
```

Approval is required: a request must be **Reviewed** before **Approved**.

## Item behaviour

On create/submit each line snapshots:

- `currentStock` (from `material_stock_transactions`, shown in line unit)
- `reorderLevel` / `minimumStock` / `maximumStock` (from material master)

Warnings are raised when requested qty is unusually high vs reorder / max / current stock.

## Partial approval

`POST /:id/approve`:

```json
{
  "items": [
    { "lineId": "...", "approvedQuantity": 60 }
  ],
  "notes": "Approve 60 of 100"
}
```

- `approvedQuantity` may be `< requestedQuantity` (partial) or `0` (reject line)
- At least one line must have `approvedQuantity > 0`
- Lines omitted from the payload are treated as rejected (`0`)
- Header `isPartiallyApproved` is set when any line is partial or rejected

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/purchase-requests` |
| `GET` | `/purchase-requests` |
| `GET` | `/purchase-requests/:id` |
| `PATCH` | `/purchase-requests/:id` |
| `POST` | `/purchase-requests/:id/submit` |
| `POST` | `/purchase-requests/:id/review` |
| `POST` | `/purchase-requests/:id/approve` |
| `POST` | `/purchase-requests/:id/reject` |
| `POST` | `/purchase-requests/:id/return` |
| `POST` | `/purchase-requests/:id/start-sourcing` |
| `POST` | `/purchase-requests/:id/close` |
| `POST` | `/purchase-requests/:id/cancel` |
