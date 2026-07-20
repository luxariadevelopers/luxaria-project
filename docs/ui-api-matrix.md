# UI / API matrix — Luxaria Developers ERP

**Micro Phase 001** — verified contract map.

Generated: `2026-07-20T06:32:35.399Z` via `node scripts/audit-api-contracts.mjs`.

## How to use this document

- Later UI phases must consume **exact** paths, permissions and status values listed here (or in the linked inventories).
- Do **not** invent endpoint paths, DTO fields, permissions or statuses.
- Authoritative HTTP surface: Nest controllers under `apps/backend/src/modules/**/**.controller.ts` + Swagger UI at `/api/docs` (when enabled).
- Machine-readable full route list: [`docs/inventories/route-inventory.json`](./inventories/route-inventory.json).
- Permissions: [`docs/inventories/permission-inventory.md`](./inventories/permission-inventory.md).
- Status enums: [`docs/inventories/status-enum-inventory.md`](./inventories/status-enum-inventory.md).
- Full audit dump: [`docs/inventories/api-audit.json`](./inventories/api-audit.json).

## Global contracts

| Item | Value |
|---|---|
| API prefix | `/api/v1` |
| Swagger UI | `/api/docs (when swaggerEnabled)` |
| Success envelope | `{ success: true, message: string, data: T, meta?: Record<string, unknown> }` |
| Error envelope | `{ success: false, message: string, error?: { code, details }, meta?: object }` |
| Auth | JWT Bearer (`Authorization`) + refresh rotation |
| Project scope header | `X-Project-Id` (clients already send when selected) |
| Idempotency | `Idempotency-Key` header (where backend supports it) |

## Totals

| Metric | Count |
|---|---|
| Backend modules | 70 |
| Controllers | 68 |
| HTTP routes | 614 |
| Permission catalog | 193 |
| Permissions used on routes | 185 |
| Status enums | 81 |
| Backend API markdown docs | 55 |

## Backend module coverage

Every backend module must appear below with route/method/permission/response-shape entries (or an explicit internal-only note).

| Module | Routes | Methods | Permissions (sample / note) | Response shape | API doc | Controllers |
|---|---:|---|---|---|---|---|
| `accounting-period-closure` | 11 | POST, GET | `period_closure.manage`, `period_closure.view`, `period_closure.reopen`, `period_closure.approve_reopen` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/accounting-period-closure/accounting-period-closure.controller.ts` |
| `accounting-reports` | 3 | GET | `report.view`, `report.export` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/accounting-reports/accounting-reports.controller.ts` |
| `approvals` | 12 | PUT, GET, POST | `approval.configure`, `approval.act`, `approval.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`APPROVALS_API.md`](../apps/backend/docs/APPROVALS_API.md) | `apps/backend/src/modules/approvals/approvals.controller.ts` |
| `audit-log` | 2 | GET | `audit.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`AUDIT_LOG_API.md`](../apps/backend/docs/AUDIT_LOG_API.md) | `apps/backend/src/modules/audit-log/audit-log.controller.ts` |
| `auth` | 8 | POST, GET | Public and/or authenticated routes; see route inventory for per-route RequirePermissions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`AUTH_API.md`](../apps/backend/docs/AUTH_API.md) | `apps/backend/src/modules/auth/auth.controller.ts` |
| `bank-reconciliation` | 14 | POST, GET, PATCH | `bank_reconciliation.manage`, `bank_reconciliation.view`, `bank_reconciliation.import`, `bank_reconciliation.match`, `bank_reconciliation.post` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/bank-reconciliation/bank-reconciliation.controller.ts` |
| `booking-cancellations` | 10 | POST, GET | `booking.cancel`, `booking.view`, `booking.approve`, `collection.refund` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/booking-cancellations/booking-cancellations.controller.ts` |
| `bookings` | 10 | POST, GET, PATCH | `booking.create`, `booking.view`, `booking.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/bookings/bookings.controller.ts` |
| `boq` | 28 | POST, GET, PATCH | `boq.manage`, `boq.view`, `boq.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`BOQ_API.md`](../apps/backend/docs/BOQ_API.md); Web Phases 077–078 | `apps/backend/src/modules/boq/boq.controller.ts` |
| `cash-accounts` | 10 | POST, GET | `cash.manage`, `cash.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CASH_ACCOUNTS_API.md`](../apps/backend/docs/CASH_ACCOUNTS_API.md); Web Phase 047 | `apps/backend/src/modules/cash-accounts/cash-accounts.controller.ts` |
| `chart-of-accounts` | 11 | POST, GET, PATCH, DELETE | `account.manage`, `account.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CHART_OF_ACCOUNTS_API.md`](../apps/backend/docs/CHART_OF_ACCOUNTS_API.md) | `apps/backend/src/modules/chart-of-accounts/chart-of-accounts.controller.ts` |
| `company` | 8 | GET, PATCH, POST | `company.view`, `company.update`, `company.upload_logo` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`COMPANY_API.md`](../apps/backend/docs/COMPANY_API.md) | `apps/backend/src/modules/company/company.controller.ts` |
| `company-bank-accounts` | 9 | POST, GET, PATCH | `bank.manage`, `bank.view` (+ `bank.view_sensitive` for decrypt) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`COMPANY_BANK_ACCOUNTS_API.md`](../apps/backend/docs/COMPANY_BANK_ACCOUNTS_API.md); Web Phase 046 | `apps/backend/src/modules/company-bank-accounts/company-bank-accounts.controller.ts` |
| `construction-reports` | 3 | GET | `report.view`, `report.export` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/construction-reports/construction-reports.controller.ts` |
| `contractor-agreements` | 13 | POST, GET, PATCH | `contractor_agreement.manage`, `contractor_agreement.view`, `contractor_agreement.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_AGREEMENTS_API.md`](../apps/backend/docs/CONTRACTOR_AGREEMENTS_API.md) | `apps/backend/src/modules/contractor-agreements/contractor-agreements.controller.ts` |
| `contractor-bills` | 13 | POST, GET, PATCH | `running_bill.create`, `running_bill.view`, `running_bill.verify`, `running_bill.certify`, `running_bill.finance_verify`, `running_bill.approve`, … (+2) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_BILLS_API.md`](../apps/backend/docs/CONTRACTOR_BILLS_API.md); Web Phases 093–095 | `apps/backend/src/modules/contractor-bills/contractor-bills.controller.ts` |
| `contractor-payments` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_PAYMENTS_API.md`](../apps/backend/docs/CONTRACTOR_PAYMENTS_API.md); Web Phase 096 | `apps/backend/src/modules/contractor-payments/contractor-payments.controller.ts` |
| `contractors` | 13 | POST, GET, PATCH, DELETE | `contractor.manage`, `contractor.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTORS_API.md`](../apps/backend/docs/CONTRACTORS_API.md) | `apps/backend/src/modules/contractors/contractors.controller.ts` |
| `contribution-receipts` | 9 | POST, GET | `contribution_receipt.create`, `contribution_receipt.view`, `contribution_receipt.submit`, `contribution_receipt.verify`, `contribution_receipt.post`, `contribution_receipt.cancel`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRIBUTION_RECEIPTS_API.md`](../apps/backend/docs/CONTRIBUTION_RECEIPTS_API.md); Web Phase 039 | `apps/backend/src/modules/contribution-receipts/contribution-receipts.controller.ts` |
| `customer-receipts` | 7 | POST, GET, PATCH | `collection.create`, `collection.view`, `collection.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/customer-receipts/customer-receipts.controller.ts` |
| `customers` | 10 | POST, GET, PATCH | `customer.manage`, `customer.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | Web Phases 099/100 | `apps/backend/src/modules/customers/customers.controller.ts` |
| `daily-director-digest` | 4 | GET, POST | `director_digest.view`, `director_digest.send` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/daily-director-digest/daily-director-digest.controller.ts` |
| `daily-progress-reports` | 11 | POST, GET, PATCH | `dpr.create`, `dpr.view`, `dpr.review` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DPR_API.md`](../apps/backend/docs/DPR_API.md) | `apps/backend/src/modules/daily-progress-reports/dpr.controller.ts` |
| `director-command-centre` | 1 | GET | `dashboard.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | Web Phase 021 | `apps/backend/src/modules/director-command-centre/director-command-centre.controller.ts` |
| `directors` | 12 | POST, GET, PATCH | `director.create`, `director.view`, `director.update`, `director.upload_document`, `shareholding.view`, `shareholding.propose`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DIRECTORS_API.md`](../apps/backend/docs/DIRECTORS_API.md); Web Phase 031; shareholding history Web Phase 032 | `apps/backend/src/modules/directors/directors.controller.ts` |
| `documents` | 7 | POST, GET | `document.upload`, `document.download`, `document.replace`, `document.archive`, `document.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DOCUMENTS_S3_API.md`](../apps/backend/docs/DOCUMENTS_S3_API.md) | `apps/backend/src/modules/documents/documents.controller.ts` |
| `expense-categories` | 12 | POST, GET, PATCH, DELETE | `expense_category.manage`, `expense_category.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`EXPENSE_CATEGORIES_API.md`](../apps/backend/docs/EXPENSE_CATEGORIES_API.md) | `apps/backend/src/modules/expense-categories/expense-categories.controller.ts` |
| `finance-dashboard` | 2 | GET | `dashboard.view`, `report.export` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | Web Phase 023 | `apps/backend/src/modules/finance-dashboard/finance-dashboard.controller.ts` |
| `financial-year` | 11 | POST, GET | `financial_year.manage`, `financial_year.view`, `financial_year.unlock` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`FINANCIAL_YEAR_API.md`](../apps/backend/docs/FINANCIAL_YEAR_API.md) | `apps/backend/src/modules/financial-year/financial-year.controller.ts` |
| `goods-receipts` | 9 | POST, GET, PATCH | `grn.create`, `grn.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`GOODS_RECEIPTS_API.md`](../apps/backend/docs/GOODS_RECEIPTS_API.md); Web Phase 068 | `apps/backend/src/modules/goods-receipts/goods-receipts.controller.ts` |
| `health` | 1 | GET | Public and/or authenticated routes; see route inventory for per-route RequirePermissions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/health/health.controller.ts` |
| `investor-portal` | 6 | GET, POST, PATCH | `investor_portal.view`, `investor_portal.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/investor-portal/investor-portal.controller.ts` |
| `investors` | 9 | POST, GET, PATCH | `investor.create`, `investor.view`, `investor.update`, `investor.verify_kyc`, `investor.activate`, `investor.upload_document` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`INVESTORS_API.md`](../apps/backend/docs/INVESTORS_API.md); Web Phase 033; detail/KYC Web Phase 034 | `apps/backend/src/modules/investors/investors.controller.ts` |
| `journal` | 8 | POST, GET, PATCH | `journal.create`, `journal.view`, `journal.post`, `journal.reverse` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`JOURNAL_API.md`](../apps/backend/docs/JOURNAL_API.md) | `apps/backend/src/modules/journal/journal.controller.ts` |
| `labour-attendance` | 7 | POST, GET, PATCH | `attendance.create`, `attendance.view`, `attendance.confirm` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`LABOUR_ATTENDANCE_API.md`](../apps/backend/docs/LABOUR_ATTENDANCE_API.md) | `apps/backend/src/modules/labour-attendance/labour-attendance.controller.ts` |
| `labour-categories` | 12 | POST, GET, PATCH | `labour_category.manage`, `labour_category.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`LABOUR_CATEGORIES_API.md`](../apps/backend/docs/LABOUR_CATEGORIES_API.md) | `apps/backend/src/modules/labour-categories/labour-categories.controller.ts` |
| `manpower-planning` | 8 | POST, GET, PATCH | `manpower_plan.manage`, `manpower_plan.view`, `manpower_shortfall.view`, `manpower_shortfall.acknowledge` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MANPOWER_PLANNING_API.md`](../apps/backend/docs/MANPOWER_PLANNING_API.md) | `apps/backend/src/modules/manpower-planning/manpower-planning.controller.ts` |
| `material-consumption` | 8 | GET, POST, PATCH | `material_consumption.view`, `material_consumption.manage`, `material_consumption.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_CONSUMPTION_API.md`](../apps/backend/docs/MATERIAL_CONSUMPTION_API.md) | `apps/backend/src/modules/material-consumption/material-consumption.controller.ts` |
| `material-consumption-standards` | 9 | POST, GET, PATCH | `material_consumption.manage`, `material_consumption.view`, `material_consumption.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_CONSUMPTION_STANDARDS_API.md`](../apps/backend/docs/MATERIAL_CONSUMPTION_STANDARDS_API.md) | `apps/backend/src/modules/material-consumption-standards/material-consumption-standard.controller.ts` |
| `material-issues` | 9 | POST, GET, PATCH | `stock.issue`, `stock.view`, `stock.adjust` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_ISSUES_API.md`](../apps/backend/docs/MATERIAL_ISSUES_API.md); Web Phase 073 | `apps/backend/src/modules/material-issues/material-issues.controller.ts` |
| `material-master` | 5 | GET, POST, PATCH | `material.view`, `material.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIALS_API.md`](../apps/backend/docs/MATERIALS_API.md) | `apps/backend/src/modules/material-master/materials.controller.ts` |
| `notifications` | 13 | GET, PATCH, POST, PUT | `notification.view`, `notification.send`, `notification.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/notifications/notifications.controller.ts` |
| `numbering` | 0 | — | Internal service (no HTTP controller); used by other modules | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | n/a | — |
| `payment-schedules` | 11 | POST, GET | `collection.create`, `collection.view`, `collection.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/payment-schedules/payment-schedules.controller.ts` |
| `petty-cash-fund-transfers` | 8 | POST, GET, PATCH | `petty_cash.fund`, `petty_cash.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PETTY_CASH_FUND_TRANSFERS_API.md`](../apps/backend/docs/PETTY_CASH_FUND_TRANSFERS_API.md); Web Phase 050 | `apps/backend/src/modules/petty-cash-fund-transfers/petty-cash-fund-transfers.controller.ts` |
| `petty-cash-requirements` | 12 | POST, GET, PATCH | `petty_cash.request`, `petty_cash.view`, `petty_cash.approve`, `petty_cash.fund` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PETTY_CASH_REQUIREMENTS_API.md`](../apps/backend/docs/PETTY_CASH_REQUIREMENTS_API.md); Web Phases 048/049 | `apps/backend/src/modules/petty-cash-requirements/petty-cash-requirements.controller.ts` |
| `project-access` | 12 | GET, POST, PATCH | `project_access.view`, `project_access.assign`, `project_access.manage`, `project_access.audit_view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_ACCESS_API.md`](../apps/backend/docs/PROJECT_ACCESS_API.md) | `apps/backend/src/modules/project-access/project-access.controller.ts` |
| `project-commitments` | 10 | POST, GET | `contribution_commitment.create`, `contribution_commitment.view`, `contribution_commitment.submit`, `contribution_commitment.approve`, `contribution_commitment.amend`, `contribution_commitment.cancel`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_COMMITMENTS_API.md`](../apps/backend/docs/PROJECT_COMMITMENTS_API.md); Web Phases 037/038 | `apps/backend/src/modules/project-commitments/project-commitments.controller.ts` |
| `project-dashboard` | 1 | GET | `dashboard.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | Web Phases 022/024 | `apps/backend/src/modules/project-dashboard/project-dashboard.controller.ts` |
| `project-participants` | 14 | POST, GET, PATCH | `project_participant.create`, `project_participant.view`, `project_participant.finalize`, `project_participant.update`, `project_participant.submit`, `project_participant.approve`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_PARTICIPANTS_API.md`](../apps/backend/docs/PROJECT_PARTICIPANTS_API.md); Web Phases 035/036 | `apps/backend/src/modules/project-participants/project-participants.controller.ts` |
| `projects` | 9 | POST, GET, PATCH | `project.create`, `project.view`, `project.update`, `project.upload_document` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECTS_API.md`](../apps/backend/docs/PROJECTS_API.md) | `apps/backend/src/modules/projects/projects.controller.ts` |
| `purchase-orders` | 13 | POST, GET, PATCH | `purchase.order`, `purchase.view`, `purchase.approve`, `grn.create` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PURCHASE_ORDERS_API.md`](../apps/backend/docs/PURCHASE_ORDERS_API.md); Web Phases 025/065–067 | `apps/backend/src/modules/purchase-orders/purchase-orders.controller.ts` |
| `purchase-requests` | 12 | POST, GET, PATCH | `purchase.request`, `purchase.view`, `purchase.approve`, `purchase.order` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PURCHASE_REQUESTS_API.md`](../apps/backend/docs/PURCHASE_REQUESTS_API.md); Web Phases 025/061/062 | `apps/backend/src/modules/purchase-requests/purchase-requests.controller.ts` |
| `quality-inspections` | 7 | POST, GET, PATCH | `quality.inspect`, `quality.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`QUALITY_INSPECTIONS_API.md`](../apps/backend/docs/QUALITY_INSPECTIONS_API.md); Web Phase 069 | `apps/backend/src/modules/quality-inspections/quality-inspections.controller.ts` |
| `quotation-comparisons` | 7 | POST, GET | `quotation.compare`, `quotation.recommend` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`QUOTATION_COMPARISONS_API.md`](../apps/backend/docs/QUOTATION_COMPARISONS_API.md); Web Phase 064 | `apps/backend/src/modules/quotation-comparisons/quotation-comparisons.controller.ts` |
| `rbac` | 11 | GET, POST, PATCH | `permission.view`, `role.view`, `role.create`, `role.update`, `role.assign` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`RBAC_API.md`](../apps/backend/docs/RBAC_API.md) | `apps/backend/src/modules/rbac/rbac.controller.ts` |
| `sessions` | 0 | — | Internal session store (no dedicated HTTP controller); auth routes manage sessions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | n/a | — |
| `signed-payment-vouchers` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`SIGNED_PAYMENT_VOUCHERS_API.md`](../apps/backend/docs/SIGNED_PAYMENT_VOUCHERS_API.md) | `apps/backend/src/modules/signed-payment-vouchers/signed-payment-vouchers.controller.ts` |
| `site-expense-vouchers` | 11 | POST, GET, PATCH | `expense.create`, `expense.view`, `expense.approve`, `expense.post` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`SITE_EXPENSE_VOUCHERS_API.md`](../apps/backend/docs/SITE_EXPENSE_VOUCHERS_API.md) | `apps/backend/src/modules/site-expense-vouchers/site-expense-vouchers.controller.ts` |
| `stock-counts` | 9 | POST, GET, PATCH | `stock.adjust`, `stock.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_COUNTS_API.md`](../apps/backend/docs/STOCK_COUNTS_API.md); Web Phase 072 | `apps/backend/src/modules/stock-counts/stock-counts.controller.ts` |
| `stock-ledger` | 5 | POST, GET | `stock.adjust`, `stock.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_LEDGER_API.md`](../apps/backend/docs/STOCK_LEDGER_API.md); Web Phase 070 (balance); Web Phase 071 (ledger) | `apps/backend/src/modules/stock-ledger/stock-ledger.controller.ts` |
| `stock-reorder` | 3 | GET, POST | `stock.view`, `stock.adjust` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_REORDER_API.md`](../apps/backend/docs/STOCK_REORDER_API.md); Web Phase 070 (forecast); Web Phase 074 (alerts) | `apps/backend/src/modules/stock-reorder/stock-reorder.controller.ts` |
| `units` | 6 | POST, GET, PATCH, DELETE | `unit.manage`, `unit.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`UNITS_API.md`](../apps/backend/docs/UNITS_API.md); Web Phases 097–098 | `apps/backend/src/modules/units/units.controller.ts` |
| `users` | 11 | POST, GET, PATCH, DELETE | `user.create`, `user.view`, `user.update`, `user.activate`, `user.deactivate`, `user.reset_password`, … (+3) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`USERS_API.md`](../apps/backend/docs/USERS_API.md) | `apps/backend/src/modules/users/users.controller.ts` |
| `vendor-invoices` | 12 | POST, GET, PATCH | `vendor_invoice.create`, `vendor_invoice.view`, `vendor_invoice.verify`, `vendor_invoice.match`, `vendor_invoice.approve`, `vendor_invoice.post`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_INVOICES_API.md`](../apps/backend/docs/VENDOR_INVOICES_API.md); Web Phases 025/075/076 (match) | `apps/backend/src/modules/vendor-invoices/vendor-invoices.controller.ts` |
| `vendor-payments` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_PAYMENTS_API.md`](../apps/backend/docs/VENDOR_PAYMENTS_API.md); Web Phase 076 | `apps/backend/src/modules/vendor-payments/vendor-payments.controller.ts` |
| `vendor-quotations` | 10 | POST, GET, PATCH | `quotation.manage`, `quotation.view`, `quotation.finalize` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_QUOTATIONS_API.md`](../apps/backend/docs/VENDOR_QUOTATIONS_API.md); Web Phase 063 | `apps/backend/src/modules/vendor-quotations/vendor-quotations.controller.ts` |
| `vendors` | 13 | POST, GET, PATCH, DELETE | `vendor.manage`, `vendor.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDORS_API.md`](../apps/backend/docs/VENDORS_API.md) | `apps/backend/src/modules/vendors/vendors.controller.ts` |
| `version` | 1 | GET | Public and/or authenticated routes; see route inventory for per-route RequirePermissions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/version/version.controller.ts` |
| `work-measurements` | 8 | POST, GET, PATCH | `measurement.create`, `measurement.view`, `measurement.certify` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`WORK_MEASUREMENTS_API.md`](../apps/backend/docs/WORK_MEASUREMENTS_API.md) | `apps/backend/src/modules/work-measurements/work-measurement.controller.ts` |

## Frontend capability map (current)

### Web portal (`apps/web`)

| Area | Status | Notes |
|---|---|---|
| Shell / auth / layout | Present | Login, JWT refresh, permission guard, project selector |
| Routes | Partial | `/login`, `/`, `/users`, `/projects`, `/daily-progress-reports`, `/settings`, `/forbidden` |
| Users page | Placeholder | Guarded by `user.view`; **does not call** `/users` API yet |
| Projects page | Shell | Lists via project context `/projects` |
| DPR page | Partial | `GET /daily-progress-reports` |
| Dashboard / Settings | Shell | Minimal UI |
| Domain modules (finance, procurement, sales, …) | Missing | No pages/clients yet |
| Investor portal UI | Missing | Backend `investor-portal` exists |

**Web API calls found:**

| Method | Path | File |
|---|---|---|
| POST | `/auth/login` | `apps/web/src/api/auth.ts` |
| POST | `/auth/logout` | `apps/web/src/api/auth.ts` |
| GET | `/auth/me` | `apps/web/src/api/auth.ts` |
| GET | `/daily-progress-reports` | `apps/web/src/pages/DprPage.tsx` |
| GET | `/projects` | `apps/web/src/context/ProjectContext.tsx` |
| GET | `/rbac/me/permissions` | `apps/web/src/api/auth.ts` |

### Mobile site app (`apps/mobile`)

| Area | Status | Notes |
|---|---|---|
| Auth / project select / offline shell | Present | JWT, project context, sync queue |
| Screens | Partial | Login, Home, Projects, Profile, PendingSync, GRN, DPR |
| GRN offline enqueue | Partial | Posts to `/goods-receipts` via sync transport |
| DPR offline enqueue | Partial | Posts to `/daily-progress-reports` |
| Purchase orders | Partial | `GET /purchase-orders` helpers |
| Broader site workflows | Missing | Stock issue, attendance, petty cash UI, etc. |

**Mobile API / offline endpoints found:**

| Method | Path | File |
|---|---|---|
| POST | `/auth/login` | `apps/mobile/src/api/auth.ts` |
| POST | `/auth/logout` | `apps/mobile/src/api/auth.ts` |
| GET | `/auth/me` | `apps/mobile/src/api/auth.ts` |
| POST? | `/daily-progress-reports` | `apps/mobile/src/features/dpr/buildDprOfflineEnqueue.ts` |
| POST? | `/goods-receipts` | `apps/mobile/src/features/grn/buildGrnOfflineEnqueue.ts` |
| POST? | `/health` | `apps/mobile/src/offline/OfflineSyncContext.tsx` |
| GET | `/projects` | `apps/mobile/src/context/ProjectContext.tsx` |
| GET | `/purchase-orders` | `apps/mobile/src/api/purchaseOrders.ts` |
| GET | `/purchase-orders/${id}` | `apps/mobile/src/api/purchaseOrders.ts` |
| GET | `/rbac/me/permissions` | `apps/mobile/src/api/auth.ts` |

### Shared packages

| Package | Status | Gap |
|---|---|---|
| `@luxaria/shared-types` | **Phase 002–003 + 006** | Envelopes (`ApiResponse`, `ApiError`, …) + workflow status catalogs + `normalizeAppError` / sanitisation helpers. Domain DTOs still local. |
| `@luxaria/shared-validation` | **Phase 004** | Zod schemas for money, quantity, dates, PAN/GSTIN, email/mobile, IFSC/account, attachments (MIME/size/checksum). Web/mobile re-export via `src/validation`. |
| `@luxaria/shared-format` | **Phase 005** | India-focused display helpers: `formatInr`, Indian grouping, percentage, quantity, date/time (default `Asia/Kolkata`), financial year (default April start). Web/mobile re-export via `src/format`. |

#### Web DataTable pattern (Phase 007)

| Piece | Location | Notes |
|---|---|---|
| `DataTable` | `apps/web/src/components/data-table` | Server/client pagination, sort allow-list, search, column visibility, saved filters (localStorage), bulk select, row actions, CSV export |
| `useListQueryState` / `buildListQueryParams` | same | Nest `page`/`limit`/`sortBy`/`sortOrder`/`search` (+ filter keys); `limit` clamped 1–100 |
| Demo page | `/dev/data-table` | Story only — **not** in sidebar |

#### Table preferences (Phase 018)

| Piece | Location | Notes |
|---|---|---|
| Storage | `localStorage` key `luxaria.table-prefs.<scope>` | No table preference API (only `GET/PUT /notifications/preferences` exists — unrelated) |
| Schema | `schemaVersion: 1` via `tablePreferences.ts` | Invalid / unknown versions migrated or reset; legacy `luxaria.data-table.filters.*` arrays migrated |
| `TableSettingsPanel` | `apps/web/src/components/data-table` | Saved filters, column preferences, reset |
| Sanitization | `allowedSortKeys` / `allowedFilterKeys` / column field allow-list | Preferences cannot invent sort/filter/columns or bypass permissions |

#### Web form patterns (Phase 008)

| Piece | Location | Notes |
|---|---|---|
| `FormSection`, `MoneyInput`, `DateInput`, `AsyncSelect`, `DocumentPicker` | `apps/web/src/components/forms` | RHF + shared Zod schemas; MIME/size from documents constants |
| `UnsavedChangesDialog` / `useUnsavedChangesGuard` | same | Dirty navigation + `beforeunload` |
| `shapeCreatePayload` / `applyServerFieldErrors` | same | Create/PATCH shaping + API field errors |
| Demo page | `/dev/forms` | Story only — **not** in sidebar |

#### Audit log viewer (Phase 030)

| Piece | Location | Notes |
|---|---|---|
| List / get | `GET /audit-logs`, `GET /audit-logs/:id` | Permission **`audit.view`**; no write endpoints |
| UI | `/administration/audit-logs` — `AuditTable`, `AuditFilters`, `AuditDiffView` | Actor / action / module / project / entity / date filters; request-id column |
| Masking | Nest on write + web `maskSensitiveData` | Never rehydrate `********` values; read-only diffs |
| Nav | Registry `audit-logs` — **Administration → Audit Logs** | `RegistryRouteGuard`; 403 → `PermissionDenied` |

#### Document upload + library (Phases 009 + 029)

| Piece | Location | Notes |
|---|---|---|
| `executeDocumentUpload` | `@luxaria/shared-types` | Presign → private PUT → confirm; only `active` returned |
| Web upload panels | `DocumentUploadPanel` / `DocumentListPanel` | Queue, progress, retry, metadata, archive |
| Library UI | `/documents` — `DocumentTable`, filters, preview, entity links | Entity-scoped Nest list (`entityType` + `entityId` required); **no S3 key columns** |
| Download | `GET /documents/:id/download-url` | `document.download`; refresh when `expiresIn` elapses (`usePresignedDownload`) |
| Archive | `POST /documents/:id/archive` | `document.archive`; 403 → `PermissionDenied` |
| Mobile `AttachmentSheet` | `apps/mobile/src/documents` | Camera / library / files sheet |
| Nav | Registry `documents` — **Administration → Documents** | `document.view`; `RegistryRouteGuard` |
| Demo | `/dev/documents` | Story only — **not** in sidebar |

#### Workflow timeline (Phase 016)

| Piece | Location | Notes |
|---|---|---|
| `normalizeApprovalTimelineEntries` / `normalizeAuditLogEntries` / `normalizeLegacyTimelineEvents` | `@luxaria/shared-types` (`workflow-timeline`) | Maps API payloads → `WorkflowTimelineEvent`; missing actor → Unknown actor; legacy actions tolerated |
| Web `WorkflowTimeline` / `TimelineItem` | `apps/web/src/workflow-timeline` | Actor, timestamp, comment, documents, status transition; loading / empty / error / 403 / permission-denied |
| Hooks | `useApprovalTimeline`, `useEntityAuditTimeline` | Gate with entity view (+ `approval.view` / `audit.view`); backend still enforces project access |
| APIs | `GET /projects/:projectId/approvals/:id/timeline`, `GET /audit-logs?entityType=&entityId=` | Actions from `ApprovalHistoryAction` / `AuditAction` only |
| Demo | `/dev/workflow-timeline` | Story only — **not** in sidebar |

#### Global quick search (Phase 017)

| Piece | Location | Notes |
|---|---|---|
| `CommandDialog` / `QuickSearchProvider` | `apps/web/src/quick-search` | ⌘K / Ctrl+K / `/`; header search icon; grouped results; ↑↓ Enter Esc |
| Debounce / min length | `QUICK_SEARCH_DEBOUNCE_MS=300`, `QUICK_SEARCH_MIN_LENGTH=2` | No query until min length |
| Permission filter | `filterPermittedSources` | Only query modules the user may view; API still enforces 403 |
| APIs | `GET /projects\|vendors\|contractors\|customers\|purchase-orders\|purchase-requests\|bookings?search=` | Journals omitted (no `search` on `GET /journals`) |
| Targets | `/vendors` … `/bookings` (+ `/projects`) | `showInNav: false`; `RegistryRouteGuard` + view permissions |

#### Print / PDF actions (Phase 019)

| Piece | Location | Notes |
|---|---|---|
| `DocumentActionMenu` / `PdfPreviewDialog` | `apps/web/src/print-pdf` | Preview / download / print / regenerate; loading + 403 + retry; popup-blocked detection |
| Source helpers | `signedPaymentVoucherPdfSource`, `purchaseOrderPdfSource`, `goodsReceiptPdfSource`, `customerReceiptPdfSource`, `dprPdfSource`, `*ReportPdfSource` | Status-gated; no invented paths |
| Document download | `GET /documents/:id/download-url` | `document.download`; vouchers / DPR / GRN attachment ids |
| Generate / export | `POST …/export-pdf`, `POST …/regenerate-pdf`, `GET …/export?format=pdf` | PO, quotation comparison, receipts, DPR, accounting/construction reports |
| GRN | No PDF export route | Uses document ObjectIds on photos/challan/weighbridge when present |
| Path PDFs | `uploads/…` via `VITE_UPLOADS_BASE_URL` | Nest has no authenticated file route for filesystem PDFs |
| Demo | `/dev/print-pdf` | Story only — **not** in sidebar |

#### Excel / CSV export (Phase 020)

| Piece | Location | Notes |
|---|---|---|
| `ExportDialog` / `ExportFieldSelection` | `apps/web/src/export` | Format, date range, required filters, field selection, progress, 403 / retry |
| Binary helper | `fetchExportBinary` | Safe filename (Content-Disposition + sanitize) + MIME; JSON-in-blob errors |
| Descriptors | accounting / construction / finance-dashboard / BOQ / table CSV | No invented paths |
| APIs | `GET /accounting-reports/:type/export`, `GET /construction-reports/:type/export`, `GET /finance-dashboard/export`, `GET /boq/projects/:projectId/export` | `report.export` or `boq.view` |
| Validation | `from ≤ to`; optional `maxRangeDays`; `horizonDays` ≤ **180** | Required filters e.g. `projectId` for project reports |
| DataTable | `ExportButton` opens `ExportDialog` | Client CSV with column selection |
| Demo | `/dev/export` | Story only — **not** in sidebar |

#### Web application shell (Phase 011)

| Piece | Location | Notes |
|---|---|---|
| `AppLayout` / `Header` / `Sidebar` / `PageHeader` / `ProfileMenu` | `apps/web/src/layouts` | Desktop-first shell; collapsible sidebar; mobile drawer |
| Module groups | `apps/web/src/navigation/routeRegistry.ts` | Overview, Projects & site, Organisation, System |
| Permission filter | `navigation/filterNav.ts` | Same `evaluateRouteAccess` as route guards |
| Persistence | `shellStorage.ts` | `luxaria.sidebarCollapsed` |
| Tests | `layouts/shell.test.tsx`, `navigation/filterNav.test.ts`, e2e smoke | Visual/route + narrow viewport login |

#### Notification centre (Phase 013)

| Piece | Location | Notes |
|---|---|---|
| Inbox APIs | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` | Permission `notification.view` |
| Unread badge | `GET /notifications?unreadOnly=true&page=1&limit=1` → `meta.total` | No dedicated count endpoint |
| UI | `apps/web/src/notifications` + `/notifications` page | Drawer (bell), filters, pagination, mark read |
| Severity badge | Display-only from `eventType` | API has no severity field |
| Entity links | `entityLinks.ts` | Validates ObjectId + entity permission; only shipped routes |
| Nav | Registry `notifications` + header bell + profile menu | Guarded by `RegistryRouteGuard` |

#### Approval inbox / work queue (Phases 014 + 027 + 028)

| Piece | Location | Notes |
|---|---|---|
| List API | `GET /projects/:projectId/approvals` | Query: `status`, `module`, `entityType`, `page`, `limit` only; permission `approval.view` + project access |
| Pending badge / chip | Same list with `status=pending&page=1&limit=1` → `meta.total` | No dedicated global/count inbox endpoint |
| Detail | `GET /projects/:projectId/approvals/:id` (+ timeline) | `ApprovalHeader`, entity summary, documents, timeline |
| Actions | `POST .../approve\|reject\|return\|cancel` | Body: `{ comment? }` / cancel `{ reason? }`; permissions **`approval.act`** / **`approval.cancel`** (no `approval.approve` etc. in catalog) |
| Action UX | `ApprovalActionDialog` + `useApprovalActions` | Reject/return require comment; **no optimistic updates**; 409 conflict → refetch; self-approve → Nest 403 |
| Inbox UI | `apps/web/src/approvals` + `/approvals` | `ApprovalTable`, saved filters, summary chips; amount/ageing **client-side** |
| Filters | `validateApprovalInboxFilters` | Status allow-list from `ApprovalStatus`; pagination clamped 1…100 |
| Project filter | `ProjectContext` → path `:projectId` | Switching project reloads that project’s inbox |
| Nav | Registry `approvals` title **Pending**, group **Approvals**, `projectScope: required` | Deep link from inbox → `/approvals/:id`; guards + 403 → `PermissionDenied` |

#### Entity detail layout (Phase 015)

| Piece | Location | Notes |
|---|---|---|
| `EntityDetailLayout` | `apps/web/src/components/entity-detail` | Shared IA: header → status → actions → summary → tabs → timeline |
| `DetailHeader`, `StatusStrip`, `SummaryCards`, `EntityDetailTabs`, `EntityActionBar` | same | Status chips via domain catalogs; timeline slot composes `WorkflowTimeline` |
| Action rules | `resolveVisibleActions` / `assertActionAllowed` | Each action requires `permission` + explicit `allowedStatuses` |
| States | layout shell | Loading / empty / not-found / permission-denied / retry / project-missing |
| Demo | `/dev/entity-detail` | Story only — **not** in sidebar; no API |

#### Director Command Centre (Phase 021)

| Piece | Location | Notes |
|---|---|---|
| Summary API | `GET /director-command-centre/summary` | Query: `date`, `projectId`, `directorId`, `financialYearId`; permission **`dashboard.view`** (no `dashboard.director.view` in catalog) |
| Filter APIs | `GET /projects` (context), `GET /directors`, `GET /financial-years` | Directors / FY filters gated by `director.view` / `financial_year.view` |
| UI | `apps/web/src/director-command-centre` + `/dashboard/director` | KPI cards, pending PR approvals, critical alerts, cash position, project summary |
| Metrics | `formatOptionalMoney` / count | Missing → `—`; real API `0` shown (no fake zeros while loading) |
| Drill-down | `drillDownLinks.ts` | Only maps API hrefs to shipped portal routes + permission |
| Nav | Registry `director-command-centre` under Overview | `RegistryRouteGuard`; backend still enforces project access / 403 |

#### Director project performance (Phase 022)

| Piece | Location | Notes |
|---|---|---|
| API | `GET /projects/:projectId/dashboard` | Per accessible project; `dashboard.view` + `RequireProjectAccess` |
| UI | `ProjectPerformanceSection` / `ProjectPerformanceTable` on `/dashboard/director` | Progress bars, cost variance, alert counts |
| Stale | `stale.ts` | Highlights as-of before today (UTC); labour as-of mismatch |
| States | section | Loading / empty (no projects) / per-row retry / 403 via RetryPanel |
| Nav | No new menu | Reuses Director Command Centre route |

#### Finance dashboard (Phase 023)

| Piece | Location | Notes |
|---|---|---|
| Summary API | `GET /finance-dashboard/summary` | Query: `date`, `projectId`, `from`, `to`, `financialYearId`, `horizonDays`; permission **`dashboard.view`** (no `dashboard.finance.view`) |
| Filters | UI requires FY; project optional | FY options via `GET /financial-years` (`financial_year.view`); auto-selects current FY |
| UI | `apps/web/src/finance-dashboard` + `/dashboard/finance` | Bank/cash, payables ageing, receivables, pending postings, reconciliation |
| Drill-down | Reuses director `DrillDownNav` | Shipped portal routes only |
| Nav | Registry `finance-dashboard` under Overview | `RegistryRouteGuard`; backend enforces project access / 403 |
| Export | Existing `GET /finance-dashboard/export` | Phase 019 export panel — not reworked here |

#### Investors master list (Phase 033)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /investors`, `PATCH /investors/:id`, `POST …/verify-kyc`, `…/activate`, `…/deactivate` | Verify code is **`investor.verify_kyc`** (not `investor.verify`) |
| List security | `toInvestorListRow` | Strips `bankDetails` / account fields before table render |
| Validation | PAN / GSTIN / CIN (+ CIN required for company; `directorId` for director type) | Mirrors Nest DTOs / `assertInvestorTypeRules` |
| UI | `apps/web/src/investors` + `/capital/investors` | InvestorTable, filters, KYC chips, create drawer |
| Nav | Capital & Investment → Investors | `projectScope: none` |

#### Investor detail & KYC (Phase 034)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /investors/:id`, `GET/POST /investors/:id/documents`, `POST …/verify-kyc`, `…/activate`, `…/deactivate` | Bank/nominee nested on detail; no separate bank endpoints |
| Permissions | `investor.view` / `view_all` / `verify_kyc` / `activate` / `upload_document` | No `investor.view_sensitive` or `investor.verify` |
| Masking | `InvestorBankCard` + `bankMasking.ts` | Account masked by default; Nest decrypt for owner/`view_all` |
| UI | `/capital/investors/:investorId` | Tabs: overview, bank, nominee, documents, KYC checklist |
| Audit | KYC checklist shows `kycVerifiedBy` / `kycVerifiedAt` / `kycNotes` | Verify/reject via Nest |
| Nav | Deep link from list row / Open action | `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Customers master list (Phase 099)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /customers`, `PATCH /customers/:id`, `POST …/verify-kyc`, `…/activate`, `…/deactivate` | Create/update/KYC/status use Nest **`customer.manage`** |
| List security | `toCustomerListRow` + `aadhaarMasking` | Full Aadhaar stripped; last-4 shown as `XXXX-XXXX-####` |
| Validation | PAN, contact phone/email, funding/`loanBank`, optional Aadhaar | Mirrors Nest DTOs / `assertFundingTypeRules` |
| UI | `apps/web/src/customers` + `/sales/customers` | CustomerTable, KYC chip, funding type, create drawer |
| Nav | Sales → Customers | `projectScope: none`; shares Sales group with Units |

#### Customer detail & KYC (Phase 100)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /customers/:id`, `GET/POST /customers/:id/documents`, `GET /bookings?customerId=`, `GET /customer-receipts?customerId=`, `GET /accounting-reports/customer-ledger?partyId=` | No invented customer ledger route |
| Permissions | `customer.view` / `customer.manage`; tabs gate `booking.view`, `collection.view`, `report.view` | Prompt `customer.view_sensitive` → Nest `customer.manage` |
| Masking | Overview + joint applicant Aadhaar | Masked by default; reveal only with manage |
| UI | `/sales/customers/:customerId` | Tabs: overview, joint, documents, KYC, bookings, receipts, ledger |
| Nav | Deep link from customer list / quick search | `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Contribution commitments list (Phase 037)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /projects/:projectId/commitments`, `GET …/summary`, `POST …/:id/submit\|approve\|amend\|cancel` | Versioned amend; amount ≥ receipts |
| Permissions | `contribution_commitment.view/create/submit/approve/amend/cancel` | No `commitment.*` aliases |
| Validation | Create requires contribution type + dates; amend amount ≥ `receivedAmount` | Client mirrors Nest; server authoritative |
| Overdue | Client filter/chip | Nest overdue alerts deferred (`evaluateOverdueCommitmentAlerts` stub) |
| UI | `apps/web/src/commitments` + `/capital/commitments` | CommitmentTable, amount summary, amendment/overdue filters |
| Nav | Capital & Investment → Commitments | `projectScope: required` + `RegistryRouteGuard` |

#### Contribution receipts (Phase 039)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /projects/:projectId/contribution-receipts`, `GET …/balances`, `POST …/:id/submit\|verify\|post\|cancel\|document` | PDF generated on post (`receiptPdfPath`) |
| Permissions | `contribution_receipt.view/create/submit/verify/post/cancel/upload_document` | Bank selector uses `bank.view` |
| Validation | Amount ≤ open commitment; bank/cheque require bank + txn ref; duplicate txn → **409** | Client preview; Nest authoritative |
| UI | `apps/web/src/contribution-receipts` + `/capital/contribution-receipts` | Table, create form + allocation, document/PDF panel |
| Nav | Capital & Investment → Contribution Receipts | `projectScope: required` + `RegistryRouteGuard` |

#### Chart of accounts (Phases 041–042)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /accounts/tree`, `GET/POST /accounts`, `PATCH /accounts/:id`, `POST …/parent\|activate\|deactivate`, `DELETE /accounts/:id`, `POST /accounts/seed-standard` | Hierarchy from tree; no Nest breadcrumbs API |
| Permissions | `account.view` / `account.manage` | No `account.create` / `account.update` in Nest catalog |
| Validation | Child type must match parent; system accounts lock type + block delete; no delete with postings/children | Client preview; Nest authoritative |
| UI | `apps/web/src/chart-of-accounts` + `/accounting/chart-of-accounts` | AccountTree, detail drawer, hierarchy breadcrumbs |
| Forms (042) | Shared `AccountForm` in CoA drawers | Type/category/control/`allowManualPosting`/`requiresProject`/`requiresParty` |
| Nav | Accounting → Chart of Accounts | `projectScope: none` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Journals register (Phase 043)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /journals` (+ `GET /financial-years` for FY filter) | Filters: status, projectId, financialYearId, sourceModule, from, to; **no** Nest `search` |
| Permissions | `journal.view` (list); FY options need `financial_year.view` | Detail/post/reverse in Phase 045 |
| Validation | Date range `from ≤ to`; debit/credit balance display | Client preview; Nest authoritative |
| UI | `apps/web/src/journals` + `/accounting/journals` | JournalTable, filters, page totals, source cells |
| Nav | Accounting → Journals | `projectScope: none` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Manual journal entry (Phase 044)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /journals`, `PATCH /journals/:id`, `POST /journals/:id/submit` (+ `GET /accounts/tree` for picker) | Create always draft; submit → `pending_approval` |
| Permissions | `journal.create` for create/update/submit (no `journal.submit` in catalog); picker needs `account.view` | Route `anyOf: journal.create` |
| Validation | Debit = credit; no both sides on a line; `requiresProject` / `requiresParty` from COA | Client `validateJournalEntryDraft`; Nest authoritative |
| UI | `/accounting/journals/new` — `JournalLinesGrid` + header form | Save draft / Save & submit |
| Nav | Accounting → New Journal (+ button on register) | `projectScope: none` |

#### Journal detail / post / reverse (Phase 045)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /journals/:id`, `POST …/submit`, `POST …/post`, `POST …/reverse`, `POST …/cancel` | Reverse returns `{ original, reversal }` |
| Permissions | `journal.view` / `journal.create` (submit+cancel) / `journal.post` / `journal.reverse` | **No** `journal.cancel` in Nest catalog |
| Validation | Posted immutable; reverse UI requires date + reason (`narration`); locked FY → Nest **403** | Client preview; Nest authoritative |
| UI | `/accounting/journals/:journalId` | JournalHeader, lines table, source links, timeline, reverse/cancel dialogs |
| Nav | Deep link from journals register | `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Company bank accounts (Phase 046)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /company-bank-accounts`, `GET/PATCH /:id`, `POST …/activate\|deactivate\|set-default`, `GET …/balance`, `GET …/ledger` | Ledger picker: `GET /accounts?accountCategory=bank` |
| Permissions | `bank.view` / `bank.manage` / `bank.view_sensitive` | **No** `bank_account.*` aliases; manage also decrypts on get |
| Masking | `MaskedAccountTable` + `masking.ts` | List never shows full numbers; detail masked by default; Reveal only when Nest returns `accountNumber` |
| Validation | IFSC + account number via `@luxaria/shared-validation` | Status allow-list `active`/`inactive`; set-default only when active |
| UI | `apps/web/src/bank-accounts` + `/accounting/bank-accounts` (+ `/:bankAccountId`) | Detail cards, balance, transaction ledger |
| Nav | Accounting → Bank Accounts | `projectScope: none` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Cash & petty-cash accounts (Phase 047)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /cash-accounts`, `GET …/:id`, `GET …/balance`, `POST …/transfer-custodian`, `POST …/confirm-handover`, `POST …/cancel-handover`, `POST …/close` | Ledger picker `GET /accounts`; custodian picker `GET /users` |
| Permissions | Route/list: **`cash.view`**; create/transfer/cancel/close: **`cash.manage`**; confirm handover: `cash.view` (outgoing/incoming only) | Prompt alias `cash_account.*` does **not** exist |
| Status | `active` · `pending_handover` · `closed` | Kind: `site_cash` · `petty_cash` |
| Rules | One active custodian while open; custodian change via dual handover; close requires zero balance | Client preview; Nest authoritative (non-zero close → 400) |
| UI | `apps/web/src/cash-accounts` + `/accounting/cash-accounts` | CashAccountTable, CashBalanceCards, CustodianHandoverDialog, CreateCashAccountDrawer |
| Nav | Accounting → Cash & Petty Cash | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Petty-cash fund requests list (Phase 048)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /petty-cash-requirements`, `PATCH /:id`, `POST …/submit\|project-manager-approve\|finance-approve\|reject\|return\|fund\|close\|cancel` | Weekly funding workflow; create/detail UI in Phase 049 |
| Permissions | `petty_cash.view` / `request` / `approve` / `fund` | No `petty_cash_request.*` aliases |
| Validation | One open request per account + week start; `previousUnsettledAmount` + warnings | Client preview; Nest **409** / authoritative |
| UI | `apps/web/src/petty-cash-requests` + `/accounting/petty-cash/requests` | RequestTable, week filter, unsettled indicator, status actions |
| Nav | Petty Cash → Fund Requests | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Petty-cash request form & detail (Phase 049)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /petty-cash-requirements`, `GET/PATCH /:id`, `POST …/submit\|cancel\|project-manager-approve\|finance-approve\|reject\|return` (+ `GET /cash-accounts?kind=petty_cash`, `GET …/balance`) | Create always draft; submit starts PM → finance approval |
| Permissions | `petty_cash.view` / `request` / `approve`; picker/balance needs `cash.view` | No `petty_cash_request.*` aliases |
| Validation | Week ≤ 7 days; positive item amounts; requested total = item sum | Client `itemTotals` + form schema; Nest authoritative |
| UI | `/accounting/petty-cash/requests/new` · `/:requestId` — `RequirementItemsGrid`, `CurrentBalanceCard`, justification, timeline | Detail edit when draft/returned |
| Nav | Deep link from Fund Requests list | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Petty-cash fund transfers (Phase 050)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /petty-cash-fund-transfers`, `GET /:id`, `PATCH /:id`, `GET …/request/:requestId/balance`, `POST …/:id/verify\|post\|cancel` | Supporting: `GET /petty-cash-requirements?status=approved\|funded`, `GET /company-bank-accounts`, documents upload for proof |
| Permissions | `petty_cash.view` (list/balance); `petty_cash.fund` (create/update/verify/post/cancel) | **No** `petty_cash_transfer.create/verify/post` aliases |
| Validation | Amount ≤ `remainingApprovedBalance`; txn ref required; proof required before verify; soft duplicate bank+ref check | Client preview; Nest authoritative |
| UI | `apps/web/src/petty-cash-transfers` + `/accounting/petty-cash/transfers` | TransferForm, ApprovedBalanceDisplay, ProofUploadPanel, verify/post actions |
| Nav | Petty Cash → Fund Transfers | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Stock balances (Phase 070)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /stock-reorder/forecast?projectId=`, `GET /stock-ledger/balance?projectId=&materialId=&location=` | Availability view only — **not** `GET /stock-ledger` ledger lines; construction-reports `stock-balance` requires `report.view` (unused) |
| Permissions | Route **`stock.view`** | Exact Nest code |
| Validation | Quantities always labelled **base unit**; location filter max 120 chars | Client mirrors Nest DTO |
| UI | `apps/web/src/stock-balances` + `/inventory/stock-balances` | StockTable, project/location filters, LowStockIndicator |
| Isolation | Query keys + `isolateStockRowsToProject` | Project required via header |
| Nav | Inventory → Stock Balances | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Stock ledger (Phase 071)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /stock-ledger`, `GET /stock-ledger/:id` | Immutable history; **not** post/reverse in this UI |
| Permissions | Route **`stock.view`** | Prompt alias `stock_ledger.view` unused |
| Validation | Client date range `from ≤ to` (Nest list has no date query); location/batch max 120 | Running balance from signed `baseUnitQuantity` |
| UI | `apps/web/src/stock-ledger` + `/inventory/stock-ledger` | LedgerTable, transaction links (`goods_receipt` → GRN, `stock_count` → count), running bal (base) |
| Nav | Inventory → Stock Ledger | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Stock counts (Phase 072)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /stock-counts`, `GET/PATCH /:id`, `POST …/submit\|review\|approve\|post\|cancel` | Supporting: `GET /stock-ledger/balance`, `GET /materials` for create |
| Permissions | `stock.view` (list/get); `stock.adjust` (create/update/submit/review/post/cancel + normal approve); `stock.count.director_approve` (large variance approve) | Prompt aliases `stock_count.view\|create\|approve\|post` unused |
| Validation | Difference reason required; large variance ≥10% (`STOCK_COUNT_DIRECTOR_THRESHOLD_PERCENT`) | Client preview; Nest authoritative on submit |
| UI | `apps/web/src/stock-counts` + `/inventory/stock-counts` (+ `/:countId`) | CountGrid, variance, photo id, AdjustmentPreview, director banner |
| Nav | Inventory → Stock Counts | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### BOQ list & hierarchy (Phase 077)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /boq/projects/:projectId/versions/active`, `GET …/hierarchy`, `POST …/validate-totals` | Browse only — no invent paths |
| Permissions | Route **`boq.view`** | Exact Nest code |
| Rules | Project + **active** version required | 404 active → empty state |
| UI | `apps/web/src/boq` + `/project-control/boq` | Hierarchy tree, summary totals, filters, item panel |
| Nav | Project Control → BOQ | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### BOQ import wizard (Phase 078)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /boq/import-template`, `POST /boq/projects/:projectId/import` (multipart `file`) | No Nest validate/preview/commit split — client wizard steps then commit POST |
| Permissions | Route **`boq.manage`** (brief `boq.import` **not** in catalog); template download still `boq.view` | Exact Nest codes |
| Validation | Required columns + duplicate `boqCode` block commit | Client mirrors Nest `BoqExcelService` required set |
| UI | `/project-control/boq/import` — step wizard, error grid, import summary | Opened from BOQ toolbar |
| Nav | Not in sidebar | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### BOQ item editor (Phase 079)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /boq/projects/:projectId/items`, `GET/PATCH /boq/items/:id`, `GET …/hierarchy` | Nest `boq` |
| Permissions | View **`boq.view`**; create/update **`boq.manage`** | No `boq.create` / `boq.update` aliases |
| Rules | `plannedRate` = cost sum; `plannedValue` = qty × rate; `endDate` ≥ `startDate` | Work location = hierarchy; contractor cost = `subcontractCost` (no contractor FK) |
| UI | `apps/web/src/boq` + `/project-control/boq/items/:id` (`new` = create) | `ItemForm` |
| Nav | Deep link from BOQ list / item panel | `projectScope: required` + `RegistryRouteGuard` |

#### BOQ versions / variations (Phase 080)

| Piece | Location | Notes |
|---|---|---|
| APIs | versions list/create/get/patch + submit/approve/reject/activate + compare | Nest `boq` |
| Permissions | View/compare **`boq.view`**; manage/activate **`boq.manage`**; approve/reject **`boq.approve`** | No `boq_version.*` aliases |
| Rules | One active version; Variation cannot `/activate` (submit → approve) | Side-by-side compare + impact summary |
| UI | `apps/web/src/boq` + `/project-control/boq/versions` | `VersionTable`, `VersionCompareView`, `ImpactSummary` |
| Nav | Project Control → BOQ Versions | `projectScope: required` + `RegistryRouteGuard` |

#### Directors master (Phase 031)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /directors`, `GET/PATCH /directors/:id`, `GET/POST /directors/:id/documents`, `GET /company-shareholding` | Status via PATCH `status`; documents multipart |
| Permissions | `director.view` / `create` / `update` / `upload_document`; shareholding card `shareholding.view` | No invented codes |
| Validation | DIN 8 digits; PAN `^[A-Z]{5}[0-9]{4}[A-Z]$` | Client mirrors Nest DTO regex when editable |
| UI | `apps/web/src/directors` + `/capital/directors` (+ `/:directorId`) | DirectorTable, detail tabs, document panel, shareholding card |
| Seed display | Four placeholders @ **25%** each | `SEED_SHAREHOLDING_PERCENT_PER_DIRECTOR` |
| Nav | Capital & Investment → Directors | `projectScope: none` |

#### Shareholding history (Phase 032)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /company-shareholding`, `GET /company-shareholding/history`, `GET/POST /company-shareholding/change-requests`, `POST .../approve`, `POST .../reject` | Append-only versions; approve sets `effectiveTo` then inserts |
| Permissions | `shareholding.view` / `propose` / `approve` | No `shareholding.change` in Nest catalog |
| Validation | Active total **100%** (tolerance `0.0001`); client overlap check on `[effectiveFrom, effectiveTo)` | Propose/approve remain server-authoritative |
| UI | `apps/web/src/shareholding` + `/capital/shareholding` | ShareholdingTable, EffectiveDateTimeline, TotalPercentageIndicator, ChangeRequestsPanel |
| Nav | Capital & Investment → Shareholding | `projectScope: none`; `RegistryRouteGuard` + 403 → `PermissionDenied` |

#### Purchase dashboard (Phase 025)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /purchase-requests`, `GET /purchase-orders`, `GET /vendor-invoices` | No dedicated purchase-dashboard module; pipeline uses list `meta.total` |
| Permissions | Route **`dashboard.view`** (+ `purchase.view` / `vendor_invoice.view` for sections) | Catalog has no `dashboard.purchase.view` |
| Filters | Date + project **required** | Syncs header project; due delivery / payment-due aged vs as-of |
| UI | `apps/web/src/purchase-dashboard` + `/dashboard/purchase` | Pipeline cards, ageing lists, vendor exception table |
| Nav | Overview → Purchase (`Dashboard > Purchase`) | `projectScope: required` + `RegistryRouteGuard` |

#### Purchase request form (Phase 061)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /purchase-requests`, `PATCH /:id`, `POST …/submit` (+ `GET /materials`, `GET /stock-ledger/balance`, `GET /boq/projects/:projectId/items`) | Create always draft; submit refreshes stock snapshots |
| Permissions | Route **`purchase.request`**. Picker: `material.view`. Stock preview: `stock.view`. BOQ selector: `boq.view`. List landing: `purchase.view` | No `purchase_request.create` / `submit` aliases |
| Validation | Positive `requestedQuantity`; required `requiredByDate`; ≥1 item; project required | Client stock warnings mirror Nest `buildQuantityWarnings` |
| UI | `apps/web/src/purchase-requests` + `/procurement/purchase-requests/new` | `ItemsGrid`, current-stock column, BOQ selector, estimated total |
| Nav | Opened from `/procurement/purchase-requests` toolbar (**New request**) | Create `projectScope: required`; detail is Phase 062 |

#### Purchase request detail & approval (Phase 062)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /purchase-requests/:id`, `POST …/review`, `POST …/approve`, `POST …/reject`, `POST …/return`, `POST …/close` | Partial approval via line `approvedQuantity` |
| Permissions | Detail **`purchase.view`**; review/approve/reject/return **`purchase.approve`**; close **`purchase.order`** | No `purchase_request.review` / `approve` / `reject` aliases |
| Validation | `approvedQuantity` ≤ `requestedQuantity`; ≥1 line with qty &gt; 0 | Client `validateApprovePayload`; Nest authoritative |
| UI | `/procurement/purchase-requests/:requestId` — `RequestedVsApprovedGrid`, timeline, documents, approve dialog | List deep-links from `RequestTable` |
| Nav | Procurement → Purchase Requests → row / ageing / quick search | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |
| Cross-link | **Compare quotations** when `quotation.compare` + status approved/sourcing/closed | → `/procurement/quotation-comparisons/:prId` (Phase 064) |

#### Vendor quotations (Phase 063)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /vendor-quotations`, revise / submit / mark-final / cancel / document | Nest module `vendor-quotations` |
| Permissions | List/view **`quotation.view`**; create/revise **`quotation.manage`**; mark final **`quotation.finalize`** | No `quotation.create` / `revise` aliases |
| UI | `apps/web/src/quotations` + `/procurement/quotations` | QuotationTable, entry drawer, filters, Create PO |
| Nav | Procurement → Quotations | `projectScope: required` + `RegistryRouteGuard` |
| Cross-links | Compare (needs PR filter + `quotation.compare`); Create PO (`purchase.order`) | → comparison / `/procurement/purchase-orders/new` |

#### Quotation comparison (Phase 064)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /quotation-comparisons/generate`, `GET /`, `GET /:id`, recommend, submit-approval, export-pdf, cancel | Nest `quotation-comparisons` |
| Permissions | View/generate/PDF/cancel **`quotation.compare`**; recommend/submit **`quotation.recommend`** | No Nest `quotation.approve` — final decision via Approvals |
| UI | `apps/web/src/quotation-comparisons` + `/procurement/quotation-comparisons/:prId` | Matrix, recommendation panel, PDF |
| Nav | Not in sidebar; opened from PR detail / Quotations | `projectScope: required` + `RegistryRouteGuard` |

#### Vendor invoices (Phase 075)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /vendor-invoices`, `PATCH /:id`, `POST …/submit` (+ cancel) | Nest `vendor-invoices`; PO/GRN selectors via `GET /purchase-orders`, `GET /goods-receipts` |
| Permissions | List/view **`vendor_invoice.view`**; create/update/submit/cancel **`vendor_invoice.create`** | No Nest `vendor_invoice.submit` alias |
| Validation | Duplicate vendor invoice # (409); GRN accepted qty warning; taxable+GST+freight = total | Client soft-checks; Nest authoritative |
| UI | `apps/web/src/vendor-invoices` + `/procurement/vendor-invoices` | InvoiceTable, form drawer, PO/GRN selectors, tax totals, document panel |
| Nav | Procurement → Vendor Invoices | `projectScope: required` + `RegistryRouteGuard` |

#### Three-way match & vendor payments (Phase 076)

| Piece | Location | Notes |
|---|---|---|
| APIs | Invoice: match / reject-matching / approve / post; Payments: `GET/POST /vendor-payments`, submit / approve / release / verify / post | Nest `vendor-invoices` + `vendor-payments` |
| Permissions | Match **`vendor_invoice.match`**; exception approve **`vendor_invoice.approve`** (+ comment); list payments **`payment.view`**; create/release **`payment.release`**; approve/verify/post **`payment.approve`** | No `vendor_payment.*` / `vendor_invoice.exception` aliases |
| Rules | No payment before match / exception approval; allocation ≤ remaining payable; partial OK | Client filters payable invoices; Nest authoritative |
| UI | `/procurement/vendor-invoices/:invoiceId/match` — MatchMatrix, ToleranceIndicators; `/procurement/vendor-payments` — allocation + proof | `apps/web/src/vendor-invoices` + `vendor-payments` |
| Nav | Match deep-link; Procurement → Vendor Payments | `projectScope: required` |

#### Contractor payments (Phase 096)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /contractor-payments`, `PATCH /:id`, submit / approve / release / verify / post / cancel; allocation picker `GET /contractor-bills?status=posted` | Nest `contractor-payments` + `contractor-bills` |
| Permissions | List/view **`payment.view`**; create/update/submit/release/cancel **`payment.release`**; approve/verify/post **`payment.approve`** | No `contractor_payment.*` aliases |
| Rules | Only **posted** running bills; allocation ≤ remaining payable (`netPayable − paidAmount`); partial OK; withholdings `tds`/`retention`/`advanceRecovery`/`penalty` | Client filters payable bills; Nest authoritative |
| UI | `/contractors/payments` — PaymentForm, BillAllocationEditor, proof panel | `apps/web/src/contractor-payments` |
| Nav | Contractors → Payments | `projectScope: required` + `RegistryRouteGuard` |
| Cross-link | Running bills (parallel) | → `/contractors/running-bills` (do not invent that module here) |

#### Purchase order list (Phase 065)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /purchase-orders` (+ filters) | Delivery status / received vs balance derived client-side |
| Permissions | List **`purchase.view`**; create CTA **`purchase.order`** | Exact Nest codes |
| UI | `apps/web/src/purchase-orders` + `/procurement/purchase-orders` | POTable, POFilters, toolbar **New purchase order** |
| Nav | Procurement → Purchase Orders | `projectScope: required`; row → detail (067); `/new` before `/:id` |

#### Purchase order form (Phase 066)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST /purchase-orders`, `PATCH /:id`, `POST /:id/submit-approval` (+ `GET /vendor-quotations/:id` prefill) | Create always draft; submit → `pending_approval` |
| Permissions | Create/update/submit **`purchase.order`** (no `purchase_order.create` / `submit`); prefill needs **`quotation.view`** | Route `anyOf: purchase.order` |
| Validation | Delivery ≥ order date; rates/units locked to quotation; qty ≤ source; tax/freight ≥ 0 | Client `totals` + `assertItemsMatchApprovedSource`; Nest authoritative |
| UI | `/procurement/purchase-orders/new` — `POForm`, `POItemsGrid`, addresses, terms, totals | Save draft / Save & submit |
| Nav | Quotations row **Create PO** + PO list **New purchase order** | Query `selectedQuotationId` (+ optional `purchaseRequestId`); `/new` registered before `/:id` |

#### Purchase order detail & revision (Phase 067)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /:id`, balance, submit, approve/reject, revise, cancel/close, PDF | Nest `purchase-orders` |
| Permissions | Detail **`purchase.view`**; create/revise/submit/cancel/close **`purchase.order`**; approve/reject **`purchase.approve`** | No `purchase_order.*` aliases |
| UI | `/procurement/purchase-orders/:purchaseOrderId` | Timeline, revisions, receipt progress, documents |
| Nav | Deep link from PO list / quick search `?id=` | `projectScope: required`; route registered after `/new` |

#### Goods receipts / GRN (Phase 068)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /goods-receipts`, `GET /:id`, quality-check, accept, post | Nest `goods-receipts` |
| Permissions | List/detail **`grn.create`**; QC/accept/post **`grn.approve`** | No `grn.view` / `grn.qc` / `grn.accept` / `grn.post` aliases |
| UI | `apps/web/src/grns` + `/inventory/grns` (+ `/:grnId`) | GrnTable, acceptance, media, GPS, PO comparison |
| Nav | Inventory → Goods Receipts | `projectScope: required`; list before detail |

#### Quality inspections (Phase 069)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /quality-inspections`, complete / cancel | Nest `quality-inspections` |
| Permissions | List/detail **`quality.view`**; inspect/complete **`quality.inspect`** | Exact Nest codes |
| UI | `apps/web/src/quality-inspections` + `/inventory/quality-inspections` (+ `/:inspectionId`) | Parameter grid, result actions, sample media |
| Nav | Inventory → Quality Inspections | `projectScope: required` + `RegistryRouteGuard` |

#### Material issues (Phase 073)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /material-issues`, `GET/PATCH /:id`, signatures / submit / confirm / returns / cancel | Nest `material-issues`; stock via `GET /stock-ledger/balance`; BOQ via `GET /boq/projects/:projectId/items` |
| Permissions | List/detail **`stock.view`**; create/submit/returns/signatures **`stock.issue`**; confirm **`stock.adjust`** | No `material_issue.view|create|confirm` aliases |
| Validation | Issue qty ≤ available stock; return qty &gt; 0 and ≤ remaining issued; workLocation + boqItemId required | Client mirrors Nest; server authoritative |
| UI | `apps/web/src/material-issues` + `/inventory/material-issues` (+ `/:issueId`) | IssueForm, BOQ/work-location selector, available-stock indicator, signature preview |
| Nav | Inventory → Material Issues | `projectScope: required` + `RegistryRouteGuard` |

#### Reorder alerts (Phase 074)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET /stock-reorder/alerts`, `GET /stock-reorder/forecast?projectId=`, optional `POST /stock-reorder/evaluate` | Nest `stock-reorder` |
| Permissions | View **`stock.view`**; evaluate **`stock.adjust`** | No `stock_forecast.view` alias |
| UI | `apps/web/src/reorder-alerts` + `/inventory/reorder-alerts` | AlertTable (severity, stock-out date, pending PO, recommended qty), assumptions banner (timestamp + lookback rules) |
| Nav | Inventory → Reorder Alerts | `projectScope: required` + `RegistryRouteGuard` |

#### Project dashboard (Phase 024)

| Piece | Location | Notes |
|---|---|---|
| API | `GET /projects/:projectId/dashboard` | Permission **`dashboard.view`** + `RequireProjectAccess` (no `dashboard.project.view`) |
| Routes | `/projects/dashboard` → redirect; `/projects/:projectId/dashboard` | Nav entry + detail; `projectScope: required` |
| Access rule | `evaluateRouteProjectAccess` | Route id must be authorised **and** equal active header project |
| UI | `apps/web/src/project-dashboard` | Progress, budget, funding/cash, stock/labour, alerts (DPR), site photos |
| States | page | Loading / 403 retry / unauthorised / mismatch / permission-denied |
| Nav | Projects & site → Project Dashboard | |

#### Project participants (Phase 035)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /projects/:projectId/participants`, `PATCH …/:recordId`, `POST …/:recordId/versions`, `GET …/configuration`, `GET …/history` | Active list returns `totalProfitSharePercentage` + `isBalanced` |
| Permissions | `project_participant.view` / `create` / `update` | Prompt alias **`project_participant.manage` does not exist** — manage UI = create \|\| update |
| Validation | Active profit share must total **100%** (tolerance `0.0001`) | Client warns; finalize remains server-authoritative |
| Access rule | `evaluateRouteProjectAccess` | Same as project dashboard — route id = active authorised project |
| UI | `apps/web/src/project-participants` + `/projects/:projectId/participants` | ParticipantTable, profit-share alert, status chips, create/version/edit-draft drawers |
| Nav | Projects & site → Participants (Project → Funding → Participants) | Entry `/projects/participants` redirects to selected project |

#### Contribution commitments list (Phase 037)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET/POST /projects/:projectId/commitments`, `GET …/summary`, submit/approve/amend/cancel | Project-scoped Nest module |
| Permissions | `contribution_commitment.view/create/submit/approve/amend/cancel` | Prompt alias `commitment.*` does not exist |
| UI | `apps/web/src/commitments` + `/capital/commitments` | CommitmentTable, filters, amount summary, create drawer |
| Nav | Capital & Investment → Commitments | `projectScope: required` |

#### Commitment detail (Phase 038)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET …/:id`, `GET …/by-number/:commitmentNumber/history`, plus submit/approve/amend/cancel/receipts | No dedicated document-upload endpoints — agreement ref + receipts shown |
| Permissions | Same `contribution_commitment.*` set (+ `record_receipt`) | Status-gated via `resolveCommitmentRowActions` + `EntityActionBar` |
| UI | `/capital/commitments/:commitmentId` | SummaryCards, PaymentScheduleTable, documents panel, version history, WorkflowTimeline |
| Nav | Deep link from list (row Open / row click) | Detail `projectScope: required` |

#### Funding dashboard (Phase 040)

| Piece | Location | Notes |
|---|---|---|
| APIs | `GET …/commitments/summary`, `GET …/commitments?status=approved`, active participants, `GET …/contribution-receipts/balances`, `GET /accounting-reports/source-and-utilisation-of-funds` | No dedicated funding-dashboard Nest module |
| Permissions | Route: **`dashboard.view`** (no `funding.dashboard.view` in catalog). Sections: `contribution_commitment.view`, `contribution_receipt.view`, `report.view` (+ `project_participant.view` for labels) | 403 panels per section |
| Filters | Project + as-of date **required**; utilisation `from` = calendar-year start of as-of | Syncs header project |
| UI | `apps/web/src/funding-dashboard` + `/capital/funding-dashboard` | Summary cards, participant chart, utilisation table |
| Nav | Capital & Investment → Funding Dashboard | `projectScope: required` + `RegistryRouteGuard` |

#### Profit-share version editor (Phase 036)

| Piece | Location | Notes |
|---|---|---|
| APIs | `POST …/:recordId/versions`, `PATCH …/:recordId`, `POST …/submit`, `POST …/approve`, `POST …/reject`, plus active/history/configuration GETs | Same project-participants module — no dedicated profit-share controller |
| Permissions | `project_participant.view` / `create` / `update` / `submit` / `approve` | Prompt aliases **`profit_share.*` do not exist** |
| Rules | Approved rows immutable; edits via new draft versions; client requires proposed total **100%** + non-negative % before submit | Server finalize still authoritative for configuration lock |
| UI | `apps/web/src/profit-share` + `/projects/:projectId/profit-share` | AllocationGrid, ProfitShareTotalAlert, VersionComparisonView, submit/approve actions |
| Access | `evaluateRouteProjectAccess` + `RegistryRouteGuard` + 403 handling | `projectScope: required` |
| Nav | Projects & site → Profit Share (Project → Funding → Profit Share) | Entry `/projects/profit-share` redirects |

#### Site Operations dashboard (Phase 026)

| Piece | Location | Notes |
|---|---|---|
| Hub API | `GET /projects/:projectId/dashboard?date=` | Labour, stock, cash, photos, critical alerts; **`dashboard.view`** + project read (no `dashboard.site.view` in catalog) |
| Supplemental | `GET /daily-progress-reports`, `…/missing-alerts`, `GET /labour-attendance/daily-report`, `GET /goods-receipts`, `GET /petty-cash-requirements` | Module permissions `dpr.view` / `attendance.view` / `grn.create` / `petty_cash.view` |
| UI | `apps/web/src/site-operations-dashboard` + `/dashboard/site` | Site cards, missing-entry alerts, today’s activity feed |
| Dates | UTC calendar day via `filters.date` | Matches Nest / DPR; empty DPR before evening cut-off → **Awaiting cut-off** |
| Nav | Registry `site-operations-dashboard` under Overview (**Dashboard → Site Operations**) | `projectScope: required` + `RegistryRouteGuard` |

#### Navigation registry (Phase 012)

| Piece | Location | Notes |
|---|---|---|
| `APP_ROUTE_REGISTRY` | `apps/web/src/navigation/routeRegistry.ts` | Path, title, icon, `anyOf`/`allOf`, `projectScope`, nav group |
| `PermissionCode` | `navigation/permissionCatalog.ts` | Strict mirror of backend `PERMISSIONS` (193 codes) |
| Access eval | `navigation/routeAccess.ts` | Shared by sidebar + `RegistryRouteGuard` |
| Route guard | `auth/RegistryRouteGuard.tsx` | Blocks direct URL; mounts `ProjectRequiredRoute` when required |
| Permissions API | `GET /rbac/me/permissions` | Via `AuthContext` / `fetchMyPermissions` |
| Typecheck | `routeRegistry.type-test.ts` | Invalid permission keys fail compile |

#### Project context (Phase 010)

| Piece | Location | Notes |
|---|---|---|
| `resolveProjectSelection` / `ProjectAccessScope` / `ProjectStatus` | `@luxaria/shared-types` | Rejects stale, unassigned, `Closed`, `Cancelled` |
| Web `ProjectProvider` + `ProjectSelector` + `ProjectBadge` | `apps/web/src/context`, `layouts` | Persists `luxaria.selectedProjectId`; header selector |
| Web `ProjectRequiredRoute` / `NoProjectAccessPage` | `apps/web/src/auth`, `pages` | Route guard for project-scoped screens (e.g. DPR) |
| Mobile `ProjectProvider` + home badge / select | `apps/mobile/src/context`, screens | Forces select; `NoProjectAccess` screen |
| APIs | `GET /project-access/me`, `GET /projects` | Access scope + access-scoped project list (`project.view`) |
| Client header | `X-Project-Id` | Sent when selected (clients); backend guards still use JWT + params/body/query |
| Cache | React Query invalidate on switch | Preserves `auth`, `project-access`, `projects/selector` |

#### Shared error UX (Phase 006)

| Piece | Location | Behaviour |
|---|---|---|
| `normalizeAppError` | `@luxaria/shared-types` | Maps HTTP/`errorCode` → kind; strips stacks/tokens; builds `fieldErrors` |
| `toAppError` / `getErrorMessage` | `apps/*/src/api/errors.ts` | Axios → normalised model |
| `ErrorAlert`, `FieldErrorSummary`, `EmptyState`, `PermissionDenied`, `RetryPanel` | `apps/*/src/components/errors` | Consistent API / validation / 403 / retry UI |
| Global `ErrorBoundary` | App roots | Generic safe fallback (no stack/token leakage) |

Status mapping (backend filter): 400 `BAD_REQUEST`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 422 `VALIDATION_ERROR`, ≥500 `INTERNAL_ERROR`. Retry offered for network + server failures (and force-retry on safe list refetches).

#### Shared display formatters (Phase 005)

| Helper | Convention | Notes |
|---|---|---|
| `formatInr` / `formatIndianNumber` | `en-IN` | Amounts in **rupees**; null → `—`; zero/negative preserved |
| `formatPercentage` | `n%` | API 0–100 scale |
| `formatQuantity` | `en-IN`, up to 6 dp | Trailing zeros trimmed unless `fixed` |
| `formatDate` / `formatDateTime` / `formatTime` | IST | Timezone-safe via `Intl` + `Asia/Kolkata` |
| `getFinancialYear` / `formatFinancialYear` | Apr–Mar default | Matches `company.financialYearStartMonth` (default 4) |

#### Shared validation schemas (Phase 004)

| Schema area | Backend source of truth |
|---|---|
| PAN / GSTIN / TAN / CIN | `company/company.validation.ts` |
| IFSC / account number | `vendors/vendors.validation.ts` |
| Money / qty rounding | `journal.validation.ts`, `dpr.validation.ts` |
| Attachment MIME / size / checksum | `documents.constants.ts`, `presign-upload.dto.ts` |
| Email | `@IsEmail()` on user/auth DTOs |
| Mobile | 10-digit Indian convention from API examples (`9876543210`) |

#### Shared domain status catalogs (Phase 003)

| Domain key | Backend enum source | Client helpers |
|---|---|---|
| `approval` | `ApprovalStatus` | `approvalStatusCatalog` |
| `journal` | `JournalStatus` | `journalStatusCatalog` |
| `purchaseRequest` | `PurchaseRequestStatus` | `purchaseRequestStatusCatalog` |
| `purchaseOrder` | `PurchaseOrderStatus` | `purchaseOrderStatusCatalog` |
| `goodsReceipt` | `GoodsReceiptStatus` | `goodsReceiptStatusCatalog` |
| `vendorInvoice` | `VendorInvoiceStatus` | `vendorInvoiceStatusCatalog` |
| `vendorInvoiceMatching` | `VendorInvoiceMatchingStatus` | `vendorInvoiceMatchingStatusCatalog` |
| `siteExpenseVoucher` | `SiteExpenseVoucherStatus` | `siteExpenseVoucherStatusCatalog` |
| `signedPaymentVoucher` | `SignedPaymentVoucherStatus` | `signedPaymentVoucherStatusCatalog` |
| `booking` | `BookingStatus` (+ `ACTIVE_BOOKING_STATUSES`) | `bookingStatusCatalog` |
| `contractorBill` | `ContractorBillStatus` (+ `EDITABLE_BILL_STATUSES`) | `contractorBillStatusCatalog` |

Unknown API statuses → label `"Unknown"` / badge `muted` (never invent new status values). Web/mobile import via `@luxaria/shared-types` or `src/status`.

#### Shared response envelope (source of truth)

| Contract | Shape | Backend source |
|---|---|---|
| Success | `{ success: true, message, data?, meta? }` | `common/dto/api-response.dto.ts` |
| Error | `{ success: false, errorCode, message, details[], requestId, timestamp }` | `common/dto/api-error.dto.ts` |
| Pagination meta | `{ page, limit, total, totalPages, hasNextPage, hasPrevPage }` | `buildPaginationMeta` in `pagination-query.dto.ts` |
| Audit meta | `createdAt/updatedAt?`, nullable `createdBy/updatedBy/deletedAt/deletedBy`, `isDeleted?` | `database/plugins/base-schema.plugin.ts` |

Web and mobile API clients import these from `@luxaria/shared-types` (see `apps/web/src/api/client.ts`, `apps/mobile/src/api/client.ts`).

## Gaps and flags

### Modules without HTTP controllers (internal)

- `numbering`
- `sessions`

### Controllers missing dedicated `apps/backend/docs/*_API.md`

- `accounting-period-closure`
- `accounting-reports`
- `bank-reconciliation`
- `booking-cancellations`
- `bookings`
- `construction-reports`
- `customer-receipts`
- `customers`
- `daily-director-digest`
- `director-command-centre`
- `finance-dashboard`
- `health`
- `investor-portal`
- `notifications`
- `payment-schedules`
- `project-dashboard`
- `version`

### Duplicate routes

_None detected._

### Routes missing `@RequirePermissions` (excluding known public/auth)

_None detected._

### Routes missing `@ApiOperation` summary

_None detected._

### Catalog permissions unused on any route

- `project.close`
- `investor.view_all`
- `investment.view`
- `investment.create`
- `investment.approve`
- `bank.view_sensitive`
- `stock.count.director_approve`
- `approval.cancel`

### Client / contract mismatches

- Web `UsersPage` is a placeholder and does not call `GET /users` despite route guard `user.view`.
- Common response envelopes, status catalogs, error normalisation (`@luxaria/shared-types`), Zod field schemas (`@luxaria/shared-validation`), and India display formatters (`@luxaria/shared-format`) are shared; domain DTOs are still local to web/mobile.
- Most backend modules have **no** web/mobile query/mutation client yet (expected before UI phases).
- OpenAPI examples: Swagger is generated from Nest decorators; many DTOs lack explicit `@ApiProperty` examples (flag for later docs polish — not blocking route inventory).

#### Unit inventory list & detail (Phases 097–098)

| Piece | Notes |
|---|---|
| APIs | `GET/POST /units`, `GET/PATCH /units/:id`, `POST /units/:id/status`; linked `GET /bookings?unitId=`; documents `entityType=unit` |
| Permissions | Route **`unit.view`**. Create/update/block/status → **`unit.manage`** (no Nest `unit.create` / `unit.update` / `unit.block`) |
| Validation | Unique `(projectId, block, unitNumber)`; status transitions mirror Nest; active booking blocks manual status |
| UI | `apps/web/src/units` + `/sales/units` (+ `/:id`) | `UnitTable`, filters, `UnitSummary`, price breakup, history, linked booking |
| Nav | Sales → Units | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |
| Gap | No Nest unit status-history endpoint — client timeline from unit + booking fields |

## Security notes for UI phases

- Enforce role permission **and** project access **and** workflow/approval status.
- Hiding a button is not sufficient; keep route/action guards and handle backend `403`.
- Never edit posted journals, stock ledgers, approved vouchers or approved versions in the UI.
- Prefer backend-authoritative financial totals.

## Regeneration

```bash
node scripts/audit-api-contracts.mjs
pnpm --filter @luxaria/backend test -- ui-api-matrix.coverage.spec
```

## Confirmation

This document is the Phase 001 deliverable only. No later micro-phase UI was implemented while producing it.

## Micro phases 051–060 (web UI merge)

Integrated web modules (routes registered in `apps/web/src/navigation/routeRegistry.ts`):

| Phase | Route | Module |
|------:|-------|--------|
| 051 | `/accounting/expense-categories` | `apps/web/src/expense-categories/` |
| 052–053 | `/accounting/expenses` (+ `/:expenseId`) | `apps/web/src/expenses/` |
| 054 | `/accounting/bank-reconciliation` (+ `/:sessionId`) | `apps/web/src/bank-reconciliation/` |
| 055 | `/accounting/period-close` | `apps/web/src/period-close/` |
| 056–057 | `/procurement/vendors` (+ `/:vendorId`) | `apps/web/src/vendors/` |
| 058–059 | `/inventory/materials` (+ `/:materialId`) | `apps/web/src/materials/` |
| 060 | `/procurement/purchase-requests` | `apps/web/src/purchase-requests/` (queue helpers merged into existing list/detail) |
| 093–095 | `/contractors/running-bills` (+ `/new`, `/:id`) | `apps/web/src/running-bills/` |
| 097–098 | `/sales/units` (+ `/:id`) | `apps/web/src/units/` |
| 106 | `/sales/cancellations` | `apps/web/src/booking-cancellations/` |

#### Booking cancellations & refunds (Phase 106)

| Piece | Notes |
|---|---|
| APIs | Nest only: `POST/GET /booking-cancellations`, `POST …/:id/review`, `…/submit-approval`, `…/approve`, `…/reject`, `…/process-refund`, `…/release-unit`, `…/documents` |
| Permissions | Route **`booking.view`**. Request/review/submit/release/docs → **`booking.cancel`**. Approve/reject → **`booking.approve`**. Refund (+ journal post) → **`collection.refund`**. Bank selector → **`bank.view`**. (Prompt aliases `booking_cancel.*` are not in Nest catalog.) |
| Validation | `approvedRefund = totalReceived − charge − deductions`; unit release only after approved workflow (and refund when due) |
| UI | `apps/web/src/booking-cancellations` + `/sales/cancellations` | `CancellationForm`, refund breakdown, timeline, workflow actions |
| Nav | Sales → Cancellations & Refunds | `projectScope: required` + `RegistryRouteGuard` + 403 → `PermissionDenied` |
| Acceptance | No double availability (release gated); no unapproved refunds (refund gated to `approved`) |
