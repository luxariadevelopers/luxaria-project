# Purchase orders (Micro Phases 065–067)

| Phase | Route | Focus |
|-------|-------|--------|
| **065** | `/procurement/purchase-orders` | Pipeline list |
| **066** | `/procurement/purchase-orders/new` | Create from approved quotation |
| **067** | `/procurement/purchase-orders/:purchaseOrderId` | Detail, approve/issue, revise, receipts, PDF |

Nav: **Procurement → Purchase Orders** (`projectScope: required`)

Legacy `/purchase-orders` redirects to the list (query string preserved). Quick search deep-links to detail.

## Nest APIs (Swagger: Purchase Orders)

Base: `/purchase-orders`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` · `GET /:id/balance` · `POST /:id/export-pdf` | `purchase.view` |
| `POST /` · `PATCH /:id` · submit / revise / close / cancel | `purchase.order` |
| `POST /:id/approve` · `POST /:id/reject` | `purchase.approve` |
| `POST /:id/receive` | `grn.create` |

Prompt aliases `purchase_order.view/create/approve/issue/revise/cancel` are **not** in the Nest catalog.

There is **no** `purchase.issue` — issue occurs when approve completes the approval workflow.

## Detail / revision (067)

| Piece | Role |
|-------|------|
| `PurchaseOrderDetailPage` | Lifecycle summary, actions, tabs, timeline |
| `ReceiptProgressPanel` | Ordered vs received qty/value (traceability) |
| `VersionComparisonPanel` + `RevisionHistoryTable` | rN → rN+1 diffs; chain via PR list filter |
| `RevisePurchaseOrderDialog` | `POST /:id/revise` — supersede + new draft |
| `PurchaseOrderDocumentsPanel` | Attachments + PDF export |
| `assertPurchaseOrderNotSilentlyEditable` | Issued POs cannot be PATCHed in place |

Revision history uses `GET /purchase-orders?purchaseRequestId=` then client-filters by `rootPurchaseOrderId` (Nest has no dedicated history endpoint).

## Rules

1. Received value ≈ `total − balanceAmount` (Nest has no header `receivedAmount`)
2. Status filter must be a Nest `PurchaseOrderStatus` value
3. Route guard + Nest 403 — hiding buttons is not enough
4. Active project required (`ProjectRequiredRoute`)
5. `/new` is registered before `/:purchaseOrderId`
