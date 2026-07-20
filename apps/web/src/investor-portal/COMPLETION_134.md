# Micro Phase 134 — Investor documents & statements

## Delivered

- Routes `/investor/documents` and `/investor/statements` guarded by `investor_portal.view`
- Data from `GET /investor-portal/projects` then `GET /investor-portal/projects/:projectId` (`agreements[]`, `receipts[]`, `reports[]`) — no staff `/investors/:id/documents`
- Components: `InvestorDocumentList`, `InvestorReceiptDownloads`, `InvestorStatementFilters`
- Permission aliases documented in `permissions.ts`:
  - `investor.document.view` → `investor_portal.view`
  - `investor.document.download` → `investor_portal.view` + `document.download` for S3 ObjectId refs via `GET /documents/:id/download-url`
- Local `uploads/…` agreement/receipt paths are listed but not downloadable (no portal endpoint)
- Sidebar nav entries for INVESTOR role users
- Tests: `aggregateDocuments.test.ts`, `permissions.test.ts`, `documentDownload.test.ts`, `api.test.ts` (empty + 403)

## Integration note

`routes.ts` exports registry-shaped definitions for merge into `navigation/routeRegistry.ts` when that module is on HEAD.

## Out of scope

- Staff investor KYC document UI (`/capital/investors/:id`)
- New Nest list/download endpoints (portal reuses existing investor-portal detail fields)
