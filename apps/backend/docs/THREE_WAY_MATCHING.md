# Three-Way Matching — Luxaria Developers ERP

Compares **Purchase Order ↔ Goods Receipt (accepted qty) ↔ Vendor Invoice**.

Implemented on vendor invoices (`POST /api/v1/vendor-invoices/:id/match`).

## Dimensions validated

| Dimension | Sources |
|-----------|---------|
| Material | Invoice line must exist on PO |
| Quantity | Invoice qty vs remaining GRN **accepted** qty |
| Rate | Invoice rate vs PO line rate |
| Tax | Line tax vs PO line tax (pro-rata); header GST vs PO taxes (pro-rata) |
| Freight | Invoice freight vs PO freight (pro-rata) |
| Discount | Invoice discount vs PO discount (pro-rata) |
| Total | Invoice total vs PO total (pro-rata for partial invoices) |

Every mismatch stores `message`, `expected`, `actual`, and `severity`.

## Statuses

| Status | Meaning |
|--------|---------|
| `matched` | No variances |
| `matched_with_tolerance` | Variances only within configured % |
| `exception` | One or more out-of-tolerance variances |
| `rejected` | Matcher explicitly rejected the result |

## Requirements

1. **Exceptions require approval** — `exceptionApprovalComment` on approve; sets `exceptionApproved`.
2. **Explain every mismatch** — `variances[]` on the invoice.
3. **Prevent payment** until `matched` / `matched_with_tolerance`, or `exception` + `exceptionApproved`. Rejected/pending block payment.
4. **Reject** via `POST /vendor-invoices/:id/reject-matching`.

## Configurable tolerances (%)

| Env | Default |
|-----|---------|
| `VENDOR_INVOICE_QTY_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_RATE_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_TAX_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_FREIGHT_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_DISCOUNT_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_TOTAL_TOLERANCE_PERCENT` | `0` |

## Related endpoints

| Method | Path |
|--------|------|
| `POST` | `/vendor-invoices/:id/match` |
| `POST` | `/vendor-invoices/:id/reject-matching` |
| `POST` | `/vendor-invoices/:id/approve` |
| `POST` | `/vendor-invoices/:id/mark-paid` |
