# Vendor invoices (Micro Phases 075 / 076 match)

Routes:

- `/procurement/vendor-invoices` — list + capture form (Phase **075**)
- `/procurement/vendor-invoices/:invoiceId/match` — three-way match (Phase **076**)

Nav: **Procurement → Vendor Invoices** (`vendor_invoice.view`, `projectScope: required`).

## APIs

Base: `/vendor-invoices` (Swagger tag **Vendor Invoices**)

| Endpoint | Permission |
|----------|------------|
| `GET /` · `GET /:id` | `vendor_invoice.view` |
| `POST /` · `PATCH /:id` · `POST …/submit` · `POST …/cancel` | `vendor_invoice.create` |
| `POST …/verify` | `vendor_invoice.verify` |
| `POST …/match` · `POST …/reject-matching` | `vendor_invoice.match` |
| `POST …/approve` | `vendor_invoice.approve` (exceptions need `exceptionApprovalComment`) |
| `POST …/post` | `vendor_invoice.post` |
| `POST …/mark-paid` | `payment.release` |
| `GET /purchase-orders` (PO selector) | `purchase.view` |
| `GET /goods-receipts` (GRN selector) | `grn.create` |
| `GET /vendors` | `vendor.view` |

Prompt aliases `vendor_invoice.submit` / `vendor_invoice.exception` are **not** Nest codes — submit uses `create`; exception approval uses `approve` + comment.

## UI

| Piece | Role |
|-------|------|
| `InvoiceTable` | List with status / matching filters |
| `InvoiceFormDrawer` | Create / edit draft / view — PO + GRN selectors, tax totals |
| `InvoiceTaxTotals` | taxable + GST + freight = total; net payable |
| `InvoiceDocumentPanel` | Supporting evidence (`invoiceDocument` string) |
| `MatchMatrix` | PO ↔ GRN accepted ↔ invoice lines + variances |
| `ToleranceIndicators` | Match status + severity chips |

## Rules

1. Duplicate `invoiceNumber` per vendor → Nest **409**; client soft-warns from list
2. Invoice qty vs GRN **accepted** qty — client warns; Nest raises match variances
3. Header: `totalAmount` = taxableValue + GST + freight
4. Only **draft** editable; workflow Draft → Submitted → Verification → Matching → Approval → Posted → Paid
5. Payment blocked until matched / matched_with_tolerance, or exception + `exceptionApproved`
6. Active project required (`projectScope: required`)
