# Purchase requests (Micro Phases 061–062)

Routes:
- `/procurement/purchase-requests` — list with deep links to detail
- `/procurement/purchase-requests/new` — itemised create form (Phase **061**)
- `/procurement/purchase-requests/:requestId` — detail, review, partial approve, reject, close (Phase **062**)

Legacy `/purchase-requests` redirects (or lands) to the procurement list. Quick search opens the detail route.

## APIs

Base: `/purchase-requests`  
Docs: `apps/backend/docs/PURCHASE_REQUESTS_API.md`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `purchase.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/cancel` | `purchase.request` |
| `POST …/review` · `…/approve` · `…/reject` · `…/return` | `purchase.approve` |
| `POST …/start-sourcing` · `POST …/close` | `purchase.order` |

Supporting lookups for the create form (Phase 061):

| Endpoint | Permission |
|----------|------------|
| `GET /materials` · `GET /materials/:id` | `material.view` |
| `GET /stock-ledger/balance?projectId&materialId` | `stock.view` |
| `GET /boq/projects/:projectId/items` | `boq.view` |

Nest catalog uses `purchase.*` — **not** `purchase_request.review` / `purchase_request.approve` aliases.

## UI (Phase 061)

| Piece | Role |
|-------|------|
| `ItemsGrid` | Material / qty / unit / rate / optional BOQ + current-stock column |
| Estimated total | Sum of `qty × estimatedRate` (Nest mapper rules) |
| Stock warnings | Client preview of Nest `buildQuantityWarnings` |

## UI (Phase 062)

| Piece | Role |
|-------|------|
| `RequestedVsApprovedGrid` | Line requested vs approved qty (+ editable in approve dialog) |
| `ApprovePurchaseRequestDialog` | Partial approval; qty ≤ requested; ≥1 line &gt; 0 |
| `NotesActionDialog` | Review / reject / return notes |
| `buildPurchaseRequestTimeline` | Lifecycle from request fields |
| `PurchaseRequestDocumentsPanel` | `entityType=purchase_request` documents |
| `RequestTable` | Deep link to `/:requestId` |

## Rules

1. At least one item; `requestedQuantity` must be **> 0** (create)
2. Approval requires **reviewed** status first (Nest)
3. `approvedQuantity` ∈ `[0, requestedQuantity]`; `0` rejects the line
4. At least one line must have `approvedQuantity > 0` (else use reject)
5. Lines omitted from the approve payload are treated as rejected (`0`) by Nest
6. Active project required (`projectScope: required`)
7. Route guard + Nest 403 — hiding buttons is not enough
8. Shared types/api under `apps/web/src/purchase-requests/` for both phases

---

## Phase 060 queue additions

# Purchase requests work queue (Micro Phase 060)

Route: `/procurement/purchase-requests`  
Nav: **Procurement → Purchase Requests** (`projectScope: required`)

## APIs

Base: `/purchase-requests`

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `purchase.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/cancel` | `purchase.request` |
| `POST …/review` · `…/approve` · `…/reject` · `…/return` | `purchase.approve` |
| `POST …/start-sourcing` · `POST …/close` | `purchase.order` |
| `GET /materials` (create picker) | `material.view` |

Catalog uses **`purchase.*`** (prompt aliases `purchase_request.view/create/review/approve` do not exist).  
`purchase.request` covers create/submit/cancel; `purchase.approve` covers review + approve.

## UI rules

1. Work queue — list with priority, required-by date, project, status, workflow actions
2. Overdue — client filter: open work statuses + `requiredByDate` before today (UTC day)
3. Filters — Nest `status` / `priority` / `projectId` / `search`; overdue is client-only
4. List approve — full approve (all lines at requested qty); Nest still supports partial via API
5. Route guard + Nest 403 — hiding buttons is not enough; active project required

## Components

`PRTable`, `PurchaseRequestFilters`, priority/status chips, action dialog, create drawer
