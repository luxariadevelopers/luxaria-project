# Vendor Invoices API — Luxaria Developers ERP

Base path: `/api/v1/vendor-invoices`  
Swagger tag: **Vendor Invoices**

## Permissions

| Permission | Usage |
|------------|--------|
| `vendor_invoice.view` | List, get |
| `vendor_invoice.create` | Create, update, submit, cancel |
| `vendor_invoice.verify` | Verification step |
| `vendor_invoice.match` | PO/GRN matching |
| `vendor_invoice.approve` | Approval (exceptions need comment) |
| `vendor_invoice.post` | Post AP journal |
| `payment.release` | Mark paid |

## Numbering

| Field | Meaning |
|-------|---------|
| `documentNumber` | System `VI-YYYY-######` |
| `invoiceNumber` | Vendor’s invoice number (unique per vendor) |

## Workflow

```
Draft → Submitted → Verification → Matching → Approval → Posted → Paid
```

## Three-way matching

See [`THREE_WAY_MATCHING.md`](./THREE_WAY_MATCHING.md).

1. Duplicate `invoiceNumber` for the same vendor is rejected.
2. Match validates material, quantity, rate, tax, freight, discount, total.
3. Variances are explained; exceptions need approval before payment.
4. `mark-paid` is blocked until matched (or exception-approved).

## Endpoints

| Method | Path |
|--------|------|
| `POST` | `/vendor-invoices` |
| `GET` | `/vendor-invoices` |
| `GET` | `/vendor-invoices/:id` |
| `PATCH` | `/vendor-invoices/:id` |
| `POST` | `/vendor-invoices/:id/submit` |
| `POST` | `/vendor-invoices/:id/verify` |
| `POST` | `/vendor-invoices/:id/match` |
| `POST` | `/vendor-invoices/:id/reject-matching` |
| `POST` | `/vendor-invoices/:id/approve` |
| `POST` | `/vendor-invoices/:id/post` |
| `POST` | `/vendor-invoices/:id/mark-paid` |
| `POST` | `/vendor-invoices/:id/cancel` |

## Env

| Variable | Default |
|----------|---------|
| `VENDOR_INVOICE_QTY_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_RATE_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_TAX_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_FREIGHT_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_DISCOUNT_TOLERANCE_PERCENT` | `0` |
| `VENDOR_INVOICE_TOTAL_TOLERANCE_PERCENT` | `0` |
