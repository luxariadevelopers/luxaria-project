# Quotation comparisons (Micro Phase 064)

Route: `/procurement/quotation-comparisons/:prId`  
Opened from Purchase Requests (`?id=`) when the user has `quotation.compare`.  
(Quotations list is owned by Micro Phase 063 — export `quotationComparisonPath` for linking.)

## APIs

Base: `/quotation-comparisons`  
Swagger tag: **Quotation Comparisons**  
Contract: [`apps/backend/docs/QUOTATION_COMPARISONS_API.md`](../../../backend/docs/QUOTATION_COMPARISONS_API.md)

| Endpoint | Permission |
|----------|------------|
| `POST /generate` · `GET /` · `GET /:id` · `POST /:id/export-pdf` · `POST /:id/cancel` | `quotation.compare` |
| `POST /:id/recommend` · `POST /:id/submit-approval` | `quotation.recommend` |

There is **no** Nest `quotation.approve`. Submit creates an Approvals request (`procurement` / `quotation_comparison`); final decision uses `approval.act` in the Approvals inbox.

## UI

1. **Vendor comparison matrix** — base rate, GST, freight, discount, net landed cost, delivery, payment terms, rating, previous quality/delivery
2. **Recommendation panel** — select quotation; reason required (≥10 chars) when not lowest landed cost
3. **PDF** — `DocumentActionMenu` + `quotationComparisonPdfSource` (`POST …/export-pdf`)
4. **Submit for approval** — then deep-link to `/approvals`

## Workflow

`draft` → `recommended` → `pending_approval` → `approved` / `rejected` (via Approvals) · `cancelled`

## Tests

- `validation.test.ts` — lowest-vendor reason rule
- `workflowActions.test.ts` — recommend / submit-approval gating
- `roleAccess.test.ts` — exact Nest permission codes (no invented `quotation.approve`)
