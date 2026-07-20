# Excel / CSV export (Micro Phase 020)

Reusable export UX for Nest binary downloads and client-side table CSV.

## Endpoints consumed (do not invent others)

| Source | Method / path | Permission | Formats |
|--------|---------------|------------|---------|
| Accounting reports | `GET /accounting-reports/:reportType/export` | `report.export` | `xlsx`, `pdf` |
| Construction reports | `GET /construction-reports/:reportType/export` | `report.export` | `xlsx`, `pdf` |
| Finance dashboard | `GET /finance-dashboard/export` | `report.export` | `xlsx`, `csv` |
| BOQ | `GET /boq/projects/:projectId/export` | `boq.view` | Excel (xlsx MIME) |
| DataTable | Client CSV (no Nest route) | Optional parent permission | `csv` |

## Components

| Export | Role |
|--------|------|
| `ExportDialog` | Format, date range, filters, field selection, progress, 403 / retry |
| `ExportFieldSelection` | Column checkboxes (table CSV) |
| `fetchExportBinary` | Blob GET + safe filename / MIME + JSON-in-blob errors |
| `*ExportDescriptor` helpers | Wire existing APIs without inventing paths |

## Validation (client, aligned with Nest)

- `from` must be on or before `to`
- Optional `maxRangeDays` when the caller sets a product rule
- Finance `horizonDays` 1…**180** (`@Max(180)` on the DTO)
- Required filters (e.g. `projectId` for project cost sheet / P&L / fund flow)

## Security

1. Dialog checks `report.export` or module export permission (`boq.view`).
2. Parent pages keep route / project guards.
3. Backend `403` surfaces via `PermissionDenied` / `RetryPanel`.

## Traceability

Successful downloads show the resolved filename in the dialog; callers can use `onSuccess` for toast / audit UI.

## Demo

`/dev/export` — not in the sidebar.
