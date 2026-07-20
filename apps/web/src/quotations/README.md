# Vendor quotations (Micro Phase 063)

Route: `/procurement/quotations` — list + entry drawer (create / edit draft / revise / view).

Nav: **Procurement → Quotations** (`quotation.view`, `projectScope: required`).

Comparison UI is owned by Micro Phase 064 — do not add a compare page here.

## APIs

Base: `/vendor-quotations` (Swagger tag **Vendor Quotations**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `quotation.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/revise` · `POST …/cancel` · `POST …/document` | `quotation.manage` |
| `POST …/mark-final` | `quotation.finalize` |
| `GET /purchase-requests` · `GET /purchase-requests/:id` (eligible PR + lines) | `purchase.view` |
| `GET /vendors` (vendor picker) | `vendor.view` |

Prompt aliases `quotation.create` / `quotation.revise` are **not** Nest codes — both map to `quotation.manage`.

## UI

| Piece | Role |
|-------|------|
| `QuotationTable` | Register with status / PR filters and row actions |
| `QuotationEntryDrawer` | Create, edit draft, revise, view |
| `QuotationLineItemsEditor` | Select PR lines; rate / tax / discount / line total |
| `QuotationTotalsSummary` | Items subtotal + freight + taxes − discount |
| `QuotationDocumentUpload` | Multipart `file` on draft (`…/document`) |

## Rules

1. Validity date ≥ quotation date (Nest `assertQuotationDates`)
2. Line total = qty × rate − discount + tax; header grand = subtotal + freight + taxes − discount
3. Selected materials must be non-rejected lines from the linked PR
4. Create only against **approved** or **sourcing** PRs
5. Only **draft** is editable in place; revise supersedes submitted/final and opens a new draft
6. Route guard + Nest 403 — hiding buttons is not enough
7. Active project required (`projectScope: required`)
