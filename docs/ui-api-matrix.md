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
| `boq` | 28 | POST, GET, PATCH | `boq.manage`, `boq.view`, `boq.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`BOQ_API.md`](../apps/backend/docs/BOQ_API.md) | `apps/backend/src/modules/boq/boq.controller.ts` |
| `cash-accounts` | 10 | POST, GET | `cash.manage`, `cash.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CASH_ACCOUNTS_API.md`](../apps/backend/docs/CASH_ACCOUNTS_API.md) | `apps/backend/src/modules/cash-accounts/cash-accounts.controller.ts` |
| `chart-of-accounts` | 11 | POST, GET, PATCH, DELETE | `account.manage`, `account.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CHART_OF_ACCOUNTS_API.md`](../apps/backend/docs/CHART_OF_ACCOUNTS_API.md) | `apps/backend/src/modules/chart-of-accounts/chart-of-accounts.controller.ts` |
| `company` | 8 | GET, PATCH, POST | `company.view`, `company.update`, `company.upload_logo` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`COMPANY_API.md`](../apps/backend/docs/COMPANY_API.md) | `apps/backend/src/modules/company/company.controller.ts` |
| `company-bank-accounts` | 9 | POST, GET, PATCH | `bank.manage`, `bank.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`COMPANY_BANK_ACCOUNTS_API.md`](../apps/backend/docs/COMPANY_BANK_ACCOUNTS_API.md) | `apps/backend/src/modules/company-bank-accounts/company-bank-accounts.controller.ts` |
| `construction-reports` | 3 | GET | `report.view`, `report.export` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/construction-reports/construction-reports.controller.ts` |
| `contractor-agreements` | 13 | POST, GET, PATCH | `contractor_agreement.manage`, `contractor_agreement.view`, `contractor_agreement.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_AGREEMENTS_API.md`](../apps/backend/docs/CONTRACTOR_AGREEMENTS_API.md) | `apps/backend/src/modules/contractor-agreements/contractor-agreements.controller.ts` |
| `contractor-bills` | 13 | POST, GET, PATCH | `running_bill.create`, `running_bill.view`, `running_bill.verify`, `running_bill.certify`, `running_bill.finance_verify`, `running_bill.approve`, … (+2) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_BILLS_API.md`](../apps/backend/docs/CONTRACTOR_BILLS_API.md) | `apps/backend/src/modules/contractor-bills/contractor-bills.controller.ts` |
| `contractor-payments` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTOR_PAYMENTS_API.md`](../apps/backend/docs/CONTRACTOR_PAYMENTS_API.md) | `apps/backend/src/modules/contractor-payments/contractor-payments.controller.ts` |
| `contractors` | 13 | POST, GET, PATCH, DELETE | `contractor.manage`, `contractor.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRACTORS_API.md`](../apps/backend/docs/CONTRACTORS_API.md) | `apps/backend/src/modules/contractors/contractors.controller.ts` |
| `contribution-receipts` | 9 | POST, GET | `contribution_receipt.create`, `contribution_receipt.view`, `contribution_receipt.submit`, `contribution_receipt.verify`, `contribution_receipt.post`, `contribution_receipt.cancel`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`CONTRIBUTION_RECEIPTS_API.md`](../apps/backend/docs/CONTRIBUTION_RECEIPTS_API.md) | `apps/backend/src/modules/contribution-receipts/contribution-receipts.controller.ts` |
| `customer-receipts` | 7 | POST, GET, PATCH | `collection.create`, `collection.view`, `collection.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/customer-receipts/customer-receipts.controller.ts` |
| `customers` | 10 | POST, GET, PATCH | `customer.manage`, `customer.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/customers/customers.controller.ts` |
| `daily-director-digest` | 4 | GET, POST | `director_digest.view`, `director_digest.send` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/daily-director-digest/daily-director-digest.controller.ts` |
| `daily-progress-reports` | 11 | POST, GET, PATCH | `dpr.create`, `dpr.view`, `dpr.review` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DPR_API.md`](../apps/backend/docs/DPR_API.md) | `apps/backend/src/modules/daily-progress-reports/dpr.controller.ts` |
| `director-command-centre` | 1 | GET | `dashboard.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/director-command-centre/director-command-centre.controller.ts` |
| `directors` | 12 | POST, GET, PATCH | `director.create`, `director.view`, `director.update`, `director.upload_document`, `shareholding.view`, `shareholding.propose`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DIRECTORS_API.md`](../apps/backend/docs/DIRECTORS_API.md) | `apps/backend/src/modules/directors/directors.controller.ts` |
| `documents` | 7 | POST, GET | `document.upload`, `document.download`, `document.replace`, `document.archive`, `document.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`DOCUMENTS_S3_API.md`](../apps/backend/docs/DOCUMENTS_S3_API.md) | `apps/backend/src/modules/documents/documents.controller.ts` |
| `expense-categories` | 12 | POST, GET, PATCH, DELETE | `expense_category.manage`, `expense_category.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`EXPENSE_CATEGORIES_API.md`](../apps/backend/docs/EXPENSE_CATEGORIES_API.md) | `apps/backend/src/modules/expense-categories/expense-categories.controller.ts` |
| `finance-dashboard` | 2 | GET | `dashboard.view`, `report.export` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/finance-dashboard/finance-dashboard.controller.ts` |
| `financial-year` | 11 | POST, GET | `financial_year.manage`, `financial_year.view`, `financial_year.unlock` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`FINANCIAL_YEAR_API.md`](../apps/backend/docs/FINANCIAL_YEAR_API.md) | `apps/backend/src/modules/financial-year/financial-year.controller.ts` |
| `goods-receipts` | 9 | POST, GET, PATCH | `grn.create`, `grn.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`GOODS_RECEIPTS_API.md`](../apps/backend/docs/GOODS_RECEIPTS_API.md) | `apps/backend/src/modules/goods-receipts/goods-receipts.controller.ts` |
| `health` | 1 | GET | Public and/or authenticated routes; see route inventory for per-route RequirePermissions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/health/health.controller.ts` |
| `investor-portal` | 6 | GET, POST, PATCH | `investor_portal.view`, `investor_portal.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/investor-portal/investor-portal.controller.ts` |
| `investors` | 9 | POST, GET, PATCH | `investor.create`, `investor.view`, `investor.update`, `investor.verify_kyc`, `investor.activate`, `investor.upload_document` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`INVESTORS_API.md`](../apps/backend/docs/INVESTORS_API.md) | `apps/backend/src/modules/investors/investors.controller.ts` |
| `journal` | 8 | POST, GET, PATCH | `journal.create`, `journal.view`, `journal.post`, `journal.reverse` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`JOURNAL_API.md`](../apps/backend/docs/JOURNAL_API.md) | `apps/backend/src/modules/journal/journal.controller.ts` |
| `labour-attendance` | 7 | POST, GET, PATCH | `attendance.create`, `attendance.view`, `attendance.confirm` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`LABOUR_ATTENDANCE_API.md`](../apps/backend/docs/LABOUR_ATTENDANCE_API.md) | `apps/backend/src/modules/labour-attendance/labour-attendance.controller.ts` |
| `labour-categories` | 12 | POST, GET, PATCH | `labour_category.manage`, `labour_category.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`LABOUR_CATEGORIES_API.md`](../apps/backend/docs/LABOUR_CATEGORIES_API.md) | `apps/backend/src/modules/labour-categories/labour-categories.controller.ts` |
| `manpower-planning` | 8 | POST, GET, PATCH | `manpower_plan.manage`, `manpower_plan.view`, `manpower_shortfall.view`, `manpower_shortfall.acknowledge` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MANPOWER_PLANNING_API.md`](../apps/backend/docs/MANPOWER_PLANNING_API.md) | `apps/backend/src/modules/manpower-planning/manpower-planning.controller.ts` |
| `material-consumption` | 8 | GET, POST, PATCH | `material_consumption.view`, `material_consumption.manage`, `material_consumption.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_CONSUMPTION_API.md`](../apps/backend/docs/MATERIAL_CONSUMPTION_API.md) | `apps/backend/src/modules/material-consumption/material-consumption.controller.ts` |
| `material-consumption-standards` | 9 | POST, GET, PATCH | `material_consumption.manage`, `material_consumption.view`, `material_consumption.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_CONSUMPTION_STANDARDS_API.md`](../apps/backend/docs/MATERIAL_CONSUMPTION_STANDARDS_API.md) | `apps/backend/src/modules/material-consumption-standards/material-consumption-standard.controller.ts` |
| `material-issues` | 9 | POST, GET, PATCH | `stock.issue`, `stock.view`, `stock.adjust` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIAL_ISSUES_API.md`](../apps/backend/docs/MATERIAL_ISSUES_API.md) | `apps/backend/src/modules/material-issues/material-issues.controller.ts` |
| `material-master` | 5 | GET, POST, PATCH | `material.view`, `material.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`MATERIALS_API.md`](../apps/backend/docs/MATERIALS_API.md) | `apps/backend/src/modules/material-master/materials.controller.ts` |
| `notifications` | 13 | GET, PATCH, POST, PUT | `notification.view`, `notification.send`, `notification.manage` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/notifications/notifications.controller.ts` |
| `numbering` | 0 | — | Internal service (no HTTP controller); used by other modules | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | n/a | — |
| `payment-schedules` | 11 | POST, GET | `collection.create`, `collection.view`, `collection.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/payment-schedules/payment-schedules.controller.ts` |
| `petty-cash-fund-transfers` | 8 | POST, GET, PATCH | `petty_cash.fund`, `petty_cash.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PETTY_CASH_FUND_TRANSFERS_API.md`](../apps/backend/docs/PETTY_CASH_FUND_TRANSFERS_API.md) | `apps/backend/src/modules/petty-cash-fund-transfers/petty-cash-fund-transfers.controller.ts` |
| `petty-cash-requirements` | 12 | POST, GET, PATCH | `petty_cash.request`, `petty_cash.view`, `petty_cash.approve`, `petty_cash.fund` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PETTY_CASH_REQUIREMENTS_API.md`](../apps/backend/docs/PETTY_CASH_REQUIREMENTS_API.md) | `apps/backend/src/modules/petty-cash-requirements/petty-cash-requirements.controller.ts` |
| `project-access` | 12 | GET, POST, PATCH | `project_access.view`, `project_access.assign`, `project_access.manage`, `project_access.audit_view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_ACCESS_API.md`](../apps/backend/docs/PROJECT_ACCESS_API.md) | `apps/backend/src/modules/project-access/project-access.controller.ts` |
| `project-commitments` | 10 | POST, GET | `contribution_commitment.create`, `contribution_commitment.view`, `contribution_commitment.submit`, `contribution_commitment.approve`, `contribution_commitment.amend`, `contribution_commitment.cancel`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_COMMITMENTS_API.md`](../apps/backend/docs/PROJECT_COMMITMENTS_API.md) | `apps/backend/src/modules/project-commitments/project-commitments.controller.ts` |
| `project-dashboard` | 1 | GET | `dashboard.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/project-dashboard/project-dashboard.controller.ts` |
| `project-participants` | 14 | POST, GET, PATCH | `project_participant.create`, `project_participant.view`, `project_participant.finalize`, `project_participant.update`, `project_participant.submit`, `project_participant.approve`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECT_PARTICIPANTS_API.md`](../apps/backend/docs/PROJECT_PARTICIPANTS_API.md) | `apps/backend/src/modules/project-participants/project-participants.controller.ts` |
| `projects` | 9 | POST, GET, PATCH | `project.create`, `project.view`, `project.update`, `project.upload_document` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PROJECTS_API.md`](../apps/backend/docs/PROJECTS_API.md) | `apps/backend/src/modules/projects/projects.controller.ts` |
| `purchase-orders` | 13 | POST, GET, PATCH | `purchase.order`, `purchase.view`, `purchase.approve`, `grn.create` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PURCHASE_ORDERS_API.md`](../apps/backend/docs/PURCHASE_ORDERS_API.md) | `apps/backend/src/modules/purchase-orders/purchase-orders.controller.ts` |
| `purchase-requests` | 12 | POST, GET, PATCH | `purchase.request`, `purchase.view`, `purchase.approve`, `purchase.order` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`PURCHASE_REQUESTS_API.md`](../apps/backend/docs/PURCHASE_REQUESTS_API.md) | `apps/backend/src/modules/purchase-requests/purchase-requests.controller.ts` |
| `quality-inspections` | 7 | POST, GET, PATCH | `quality.inspect`, `quality.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`QUALITY_INSPECTIONS_API.md`](../apps/backend/docs/QUALITY_INSPECTIONS_API.md) | `apps/backend/src/modules/quality-inspections/quality-inspections.controller.ts` |
| `quotation-comparisons` | 7 | POST, GET | `quotation.compare`, `quotation.recommend` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`QUOTATION_COMPARISONS_API.md`](../apps/backend/docs/QUOTATION_COMPARISONS_API.md) | `apps/backend/src/modules/quotation-comparisons/quotation-comparisons.controller.ts` |
| `rbac` | 11 | GET, POST, PATCH | `permission.view`, `role.view`, `role.create`, `role.update`, `role.assign` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`RBAC_API.md`](../apps/backend/docs/RBAC_API.md) | `apps/backend/src/modules/rbac/rbac.controller.ts` |
| `sessions` | 0 | — | Internal session store (no dedicated HTTP controller); auth routes manage sessions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | n/a | — |
| `signed-payment-vouchers` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`SIGNED_PAYMENT_VOUCHERS_API.md`](../apps/backend/docs/SIGNED_PAYMENT_VOUCHERS_API.md) | `apps/backend/src/modules/signed-payment-vouchers/signed-payment-vouchers.controller.ts` |
| `site-expense-vouchers` | 11 | POST, GET, PATCH | `expense.create`, `expense.view`, `expense.approve`, `expense.post` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`SITE_EXPENSE_VOUCHERS_API.md`](../apps/backend/docs/SITE_EXPENSE_VOUCHERS_API.md) | `apps/backend/src/modules/site-expense-vouchers/site-expense-vouchers.controller.ts` |
| `stock-counts` | 9 | POST, GET, PATCH | `stock.adjust`, `stock.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_COUNTS_API.md`](../apps/backend/docs/STOCK_COUNTS_API.md) | `apps/backend/src/modules/stock-counts/stock-counts.controller.ts` |
| `stock-ledger` | 5 | POST, GET | `stock.adjust`, `stock.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_LEDGER_API.md`](../apps/backend/docs/STOCK_LEDGER_API.md) | `apps/backend/src/modules/stock-ledger/stock-ledger.controller.ts` |
| `stock-reorder` | 3 | GET, POST | `stock.view`, `stock.adjust` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`STOCK_REORDER_API.md`](../apps/backend/docs/STOCK_REORDER_API.md) | `apps/backend/src/modules/stock-reorder/stock-reorder.controller.ts` |
| `units` | 6 | POST, GET, PATCH, DELETE | `unit.manage`, `unit.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`UNITS_API.md`](../apps/backend/docs/UNITS_API.md) | `apps/backend/src/modules/units/units.controller.ts` |
| `users` | 11 | POST, GET, PATCH, DELETE | `user.create`, `user.view`, `user.update`, `user.activate`, `user.deactivate`, `user.reset_password`, … (+3) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`USERS_API.md`](../apps/backend/docs/USERS_API.md) | `apps/backend/src/modules/users/users.controller.ts` |
| `vendor-invoices` | 12 | POST, GET, PATCH | `vendor_invoice.create`, `vendor_invoice.view`, `vendor_invoice.verify`, `vendor_invoice.match`, `vendor_invoice.approve`, `vendor_invoice.post`, … (+1) | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_INVOICES_API.md`](../apps/backend/docs/VENDOR_INVOICES_API.md) | `apps/backend/src/modules/vendor-invoices/vendor-invoices.controller.ts` |
| `vendor-payments` | 10 | POST, GET, PATCH | `payment.release`, `payment.view`, `payment.approve` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_PAYMENTS_API.md`](../apps/backend/docs/VENDOR_PAYMENTS_API.md) | `apps/backend/src/modules/vendor-payments/vendor-payments.controller.ts` |
| `vendor-quotations` | 10 | POST, GET, PATCH | `quotation.manage`, `quotation.view`, `quotation.finalize` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDOR_QUOTATIONS_API.md`](../apps/backend/docs/VENDOR_QUOTATIONS_API.md) | `apps/backend/src/modules/vendor-quotations/vendor-quotations.controller.ts` |
| `vendors` | 13 | POST, GET, PATCH, DELETE | `vendor.manage`, `vendor.view` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`VENDORS_API.md`](../apps/backend/docs/VENDORS_API.md) | `apps/backend/src/modules/vendors/vendors.controller.ts` |
| `version` | 1 | GET | Public and/or authenticated routes; see route inventory for per-route RequirePermissions | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | **missing** | `apps/backend/src/modules/version/version.controller.ts` |
| `work-measurements` | 8 | POST, GET, PATCH | `measurement.create`, `measurement.view`, `measurement.certify` | `ApiSuccessResponse { success: true, message: string, data: T, meta?: object }` | [`WORK_MEASUREMENTS_API.md`](../apps/backend/docs/WORK_MEASUREMENTS_API.md) | `apps/backend/src/modules/work-measurements/work-measurement.controller.ts` |

## Frontend capability map (current)

> **Refresh note (2026-07-22):** The Phase 001 snapshot below the backend tables is still useful for HTTP contracts. The **web/mobile capability tables here supersede** the old “domain modules Missing / site workflows Missing” claims — those are no longer true.
>
> This is **not** a claim that every ERP plan line-item or every UI polish task is finished. See [`COMPLETION_REMAINING_GAPS.md`](../COMPLETION_REMAINING_GAPS.md).

### Web portal (`apps/web`)

HQ-first portal: permission-guarded `APP_ROUTE_REGISTRY` (~200+ routes), sidebar pillars (Overview, Analytics, Projects, Supply, Sales, Finance, Admin), and domain `api.ts` clients under `apps/web/src/**` (100+ modules).

| Area | Status | Notes |
|---|---|---|
| Shell / auth / layout | **Present** | Login, JWT refresh, permission guards, project selector, forbidden / no-project screens |
| Users / RBAC / company admin | **Present** | `user-admin` list/detail/create/edit + roles/projects APIs; RBAC admin; company / employee admin |
| Projects & capital | **Present** | Projects CRUD/detail/structure/team/docs; participants; commitments; contribution receipts; directors; shareholding; funding dashboard |
| Project control / site execution | **Present** | DPR, BOQ, work measurements, manpower, labour attendance, site expenses, quality, safety, diary, issues, equipment, drawings, site ops / execution dashboards |
| Procurement | **Present** | PRs, POs, quotations / comparisons, RFQ, GRNs, vendor invoices/payments, vendors, purchase dashboard, procurement masters |
| Contractors | **Present** | Contractors, agreements, running bills, payments, retention, recoveries, tenders/bids, contractor dashboard/reports |
| Inventory | **Present** | Materials, stock ledger/balances/counts/transfers, reservations, warehouse locations, material issues, reorder alerts, inventory dashboard/reports |
| Sales / CRM | **Present** | Leads, customers, units, bookings, cancellations, collections, payment schedules, sale agreements, handovers, warranties, sales dashboard |
| Accounting / finance | **Present** | COA, journals, cash/bank, bank reconciliation, FY / period close, opening balances, TDS/GST, fixed assets, budgets, cost centres, finance dashboard, accounting reports |
| Petty cash | **Present** | Requests + fund transfers |
| Approvals / notifications / audit | **Present** | Approvals inbox + workflows; notifications; audit logs; system health (`audit.view`) |
| Analytics / director BI | **Present** | Executive / director / domain analytics pages; director command centre; director digest |
| Investor portal UI | **Present** (132–134) | Isolated investor routes; staff investor manage; never uses staff `/investors` for portal users |
| Thin / stub UIs | **Mostly closed** | Work-orders list+detail+workflow shipped. Leftover secondary actions (MB revise UI, tender record-bid UI, material-recon post-to-bill UI) — see [`COMPLETION_REMAINING_GAPS.md`](../COMPLETION_REMAINING_GAPS.md). Not “module missing”. |
| Demo / design-system pages | Present (dev) | Data table / form / export / print demos — not production workflows |

**Web API surface (how to inventory):** prefer domain clients under `apps/web/src/<domain>/api.ts` and routes in `apps/web/src/navigation/routeRegistry.ts` + `apps/web/src/routes/routeElements.tsx`. Do **not** treat the old Phase 001 nine-call table as the current web client list.

### Mobile site app (`apps/mobile`)

Site-first Expo app with offline sync. Core site ops for phases **117–131** (plus push **136**) are **done** after gap closure — see [`COMPLETION_SITE_MOBILE_GAPS.md`](../COMPLETION_SITE_MOBILE_GAPS.md). Recent HQ extras on mobile are **optional** (not required for site completeness; not full web parity).

| Area | Status | Notes |
|---|---|---|
| Auth / project+site select / offline shell | **Present** | JWT, project/site context, sync queue, conflict detail, force/change password |
| DPR | **Done** | List/detail + create; offline enqueue |
| Goods receipt (GRN) | **Done** | Offline enqueue + PO helpers |
| Labour attendance | **Done** | Group + **individual** worker mode (phase 124) |
| Site expenses | **Done** | List/detail/form; **local drafts** (118); beneficiary/engineer **signatures** (120) |
| Petty cash | **Done** | Home + balance card (121); requests; **fund transfer acknowledge** (122) |
| Material issue / return | **Done** | Issue form with **sign + submit** (125); return screen |
| Stock count / stock ledger | **Done** | Count list/entry; ledger view |
| Purchase requests | **Done** | List/form/detail |
| Work measurement / work orders | **Done** | Measurement list/form; work-order list |
| Quality inspections | **Done** | List |
| Labour vouchers | **Done** | New / history / detail |
| Approvals | **Done** | List + detail |
| Lead capture | **Present** | Sales lead capture (permission-gated) |
| Notifications | **Present** | Inbox + preferences (push channel per phase 136) |
| HQ / finance extras (optional) | **Present (optional)** | Executive dashboard, finance dashboard, director command centre, journals (+ reverse), project expense/income, directors, shareholding / capital plan, contribution receipts, user admin — useful on device; **not** a substitute for the full web HQ surface |
| Broader site workflows | **Done** | The old “Missing (stock issue, attendance, petty cash…)” claim is obsolete |

**Mobile navigation source of truth:** `apps/mobile/src/navigation/types.ts` + `HomeScreen` capability gates + `RootNavigator`.

### Shared packages

| Package | Status | Notes |
|---|---|---|
| `@luxaria/shared-types` | **Present** | Common API envelopes (`ApiResponse`, `ApiError`, pagination, audit meta, error codes). Many domain DTOs remain local to apps (drift risk remains). |
| `@luxaria/shared-validation` | **Present** | Health/ops schemas, money/quantity/dates, identity/contact/banking, status catalogs, project selection, workflow timeline helpers — no longer a single-schema placeholder. |

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

### Client / contract mismatches (current)

- Common response envelopes are shared (`@luxaria/shared-types`); many domain DTOs remain local to web/mobile (drift risk).
- Web inventory reservations + warehouse-locations UIs shipped (`apps/web/src/stock-reservations/`, `warehouse-locations/`).
- Playwright: procurement + petty-cash UI golden paths are no longer hard-skipped; remaining `test.skip(true, …)` is intentional (e.g. project-creation AC-6 duplicate-code). Other skips are live-API / seed guards.
- OpenAPI examples: Swagger is generated from Nest decorators; many DTOs lack explicit `@ApiProperty` examples (docs polish — not blocking route inventory).
- Advanced controls (OCR / WhatsApp provider / BIM / AI product features): **Phase 141 discovery only** — see [`docs/advanced-controls-roadmap.md`](./advanced-controls-roadmap.md). Existing stubs (e.g. WhatsApp channel placeholder) are not shipped product integrations.

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

After regenerating the **backend** tables from the audit script, re-apply or merge the **Frontend capability map** section above if the script overwrites it — the script’s Phase 001 web/mobile snapshot is stale relative to current apps.

## Confirmation

- Backend route/permission inventory originated as Micro Phase 001 (`scripts/audit-api-contracts.mjs`).
- Frontend/mobile capability sections were manually refreshed **2026-07-22** against `apps/web` and `apps/mobile` after site-mobile gap closure.
- Remaining intentional gaps: [`COMPLETION_REMAINING_GAPS.md`](../COMPLETION_REMAINING_GAPS.md).
