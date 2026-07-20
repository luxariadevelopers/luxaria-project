# Goods Receipts (GRN) API — Luxaria Developers ERP

Base path: `/api/v1/goods-receipts`  
Swagger tag: **Goods Receipts**

## Permissions

| Permission | Usage |
|------------|--------|
| `grn.create` | Create, update, submit, list, get, cancel |
| `grn.approve` | Quality check, accept, post |

## Numbering

`NumberEntityType.GOODS_RECEIPT` → `GRN-YYYY-######` (FY + project-scoped).

## Workflow

```
Draft → Submitted → Quality Check → Accepted | Partially Accepted → Posted
```

- Mobile offline create may set `submit: true` to land as **Submitted**.
- **Photos** (min 1) and **GPS** (`latitude` / `longitude`) are required.
- **Post** writes immutable `purchase_receipt` stock ledger entries for **accepted quantity only**, then updates PO balance.

## Offline

`POST /goods-receipts` accepts `Idempotency-Key`. Offline sync uploads media first; document IDs arrive as `photos` / `photo_*` / `attachments`.

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/goods-receipts` |
| `GET` | `/goods-receipts` |
| `GET` | `/goods-receipts/:id` |
| `PATCH` | `/goods-receipts/:id` |
| `POST` | `/goods-receipts/:id/submit` |
| `POST` | `/goods-receipts/:id/quality-check` |
| `POST` | `/goods-receipts/:id/accept` |
| `POST` | `/goods-receipts/:id/post` |
| `POST` | `/goods-receipts/:id/cancel` |
