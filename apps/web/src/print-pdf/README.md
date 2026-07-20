# Print / PDF actions (Micro Phase 019)

Reusable UI for backend-generated PDFs: preview dialog, download, print, and regenerate where the API supports it.

## Endpoints consumed (do not invent others)

| Source | Method / path | Permission |
|--------|---------------|------------|
| Documents | `GET /documents/:id/download-url` | `document.download` |
| Documents meta | `GET /documents/:id` | `document.view` (status gate) |
| Purchase order | `POST /purchase-orders/:id/export-pdf` | `purchase.view` |
| Quotation comparison | `POST /quotation-comparisons/:id/export-pdf` | `quotation.compare` |
| Customer receipt | `POST /customer-receipts/:id/regenerate-pdf` | `collection.view` |
| DPR | `POST /daily-progress-reports/:id/regenerate-pdf` | `dpr.review` |
| Accounting report | `GET /accounting-reports/:reportType/export?format=pdf` | `report.export` |
| Construction report | `GET /construction-reports/:reportType/export?format=pdf` | `report.export` |

**Goods receipts** have no PDF export route. When `photos` / `challanDocument` / `weighbridgeDocument` hold document ObjectIds, download via the documents API.

## Components

| Export | Role |
|--------|------|
| `DocumentActionMenu` | Preview / Download / Print / Regenerate menu |
| `PdfPreviewDialog` | Loading, iframe preview, error + retry |
| `usePdfActions` | Resolve URL, popup-blocked handling |
| `*PdfSource` helpers | Entity-specific status + API wiring |

## Permissions

1. Parent passes `canViewEntity` from the entity view permission (`payment.view`, `purchase.view`, `collection.view`, `dpr.view`, `grn.create`, …).
2. Menu also requires `document.download` (document / path sources) or `report.export` (report blobs).
3. Route/action guards on the parent page remain mandatory; backend `403` surfaces via `ErrorAlert` / `RetryPanel`.

## Status rules (from backend)

- Signed payment voucher PDF: after approve (`voucherPdfDocumentId`).
- DPR: `submitted` \| `reviewed` (`pdfDocumentId` / regenerate).
- Customer receipt regenerate: `posted`.
- PO: UI skips `cancelled` / `superseded` (export API itself is not status-gated).
- Document download: status `active` or `replaced` only.

## Path-based PDFs (`uploads/…`)

PO / receipt export returns a relative filesystem path. Nest does not expose an authenticated file route for those paths. Set `VITE_UPLOADS_BASE_URL` (or reverse-proxy `/uploads` on the web origin) so Preview/Download can open the file after generate.

## Demo

`/dev/print-pdf` — not in the sidebar.
