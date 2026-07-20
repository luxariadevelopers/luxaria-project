# Status enum inventory

Generated: 2026-07-20T06:32:35.399Z

Total status enums found: **81**.

Values are extracted from `export enum *Status*` in backend source. UI must not invent statuses.

| Enum | Module | Values | Source |
|---|---|---|---|
| `AccountingPeriodStatus` | `accounting-period-closure` | `open`, `locked`, `closed` | `apps/backend/src/modules/accounting-period-closure/accounting-period-closure.constants.ts` |
| `AccountStatus` | `chart-of-accounts` | `active`, `inactive` | `apps/backend/src/modules/chart-of-accounts/schemas/account.schema.ts` |
| `ApprovalStatus` | `approvals` | `draft`, `pending`, `approved`, `rejected`, `cancelled`, `returned` | `apps/backend/src/modules/approvals/schemas/approval-request.schema.ts` |
| `BankAccountStatus` | `company-bank-accounts` | `active`, `inactive` | `apps/backend/src/modules/company-bank-accounts/schemas/company-bank-account.schema.ts` |
| `BankReconciliationMatchStatus` | `bank-reconciliation` | `active`, `undone` | `apps/backend/src/modules/bank-reconciliation/bank-reconciliation.constants.ts` |
| `BankReconciliationSessionStatus` | `bank-reconciliation` | `draft`, `in_progress`, `completed`, `cancelled` | `apps/backend/src/modules/bank-reconciliation/bank-reconciliation.constants.ts` |
| `BankStatementLineStatus` | `bank-reconciliation` | `unmatched`, `matched`, `excluded` | `apps/backend/src/modules/bank-reconciliation/bank-reconciliation.constants.ts` |
| `BookingCancellationStatus` | `booking-cancellations` | `requested`, `reviewed`, `pending_approval`, `approved`, `refund_processed`, `unit_released`, `rejected`, `cancelled` | `apps/backend/src/modules/booking-cancellations/schemas/booking-cancellation.schema.ts` |
| `BookingStatus` | `bookings` | `hold`, `pending_approval`, `reserved`, `booked`, `agreement`, `registered`, `expired`, `cancelled` | `apps/backend/src/modules/bookings/schemas/booking.schema.ts` |
| `BoqHierarchyStatus` | `boq` | `active`, `inactive` | `apps/backend/src/modules/boq/schemas/boq.schema.ts` |
| `BoqItemStatus` | `boq` | `draft`, `active`, `on_hold`, `completed`, `cancelled` | `apps/backend/src/modules/boq/schemas/boq.schema.ts` |
| `BoqVersionStatus` | `boq` | `draft`, `pending_approval`, `active`, `superseded`, `rejected` | `apps/backend/src/modules/boq/schemas/boq.schema.ts` |
| `CashAccountStatus` | `cash-accounts` | `active`, `pending_handover`, `closed` | `apps/backend/src/modules/cash-accounts/schemas/cash-account.schema.ts` |
| `CommitmentStatus` | `project-commitments` | `draft`, `submitted`, `approved`, `cancelled`, `superseded` | `apps/backend/src/modules/project-commitments/schemas/contribution-commitment.schema.ts` |
| `CompanyStatus` | `company` | `active`, `inactive` | `apps/backend/src/modules/company/schemas/company.schema.ts` |
| `ContractorAgreementStatus` | `contractor-agreements` | `draft`, `pending_approval`, `active`, `superseded`, `rejected`, `expired`, `terminated` | `apps/backend/src/modules/contractor-agreements/schemas/contractor-agreement.schema.ts` |
| `ContractorBillStatus` | `contractor-bills` | `draft`, `claimed`, `engineer_verified`, `pm_certified`, `finance_verified`, `director_approved`, `posted`, `paid`, `rejected`, `cancelled` | `apps/backend/src/modules/contractor-bills/schemas/contractor-bill.schema.ts` |
| `ContractorPaymentStatus` | `contractor-payments` | `draft`, `approval`, `released`, `verified`, `posted`, `cancelled` | `apps/backend/src/modules/contractor-payments/schemas/contractor-payment.schema.ts` |
| `ContractorProjectAssignmentStatus` | `contractors` | `active`, `inactive` | `apps/backend/src/modules/contractors/schemas/contractor-project-assignment.schema.ts` |
| `ContractorStatus` | `contractors` | `draft`, `pending_verification`, `active`, `blocked`, `inactive` | `apps/backend/src/modules/contractors/schemas/contractor.schema.ts` |
| `ContractorVerificationStatus` | `contractors` | `pending`, `verified`, `rejected` | `apps/backend/src/modules/contractors/schemas/contractor.schema.ts` |
| `ContributionReceiptStatus` | `contribution-receipts` | `draft`, `submitted`, `verified`, `posted`, `cancelled` | `apps/backend/src/modules/contribution-receipts/schemas/contribution-receipt.schema.ts` |
| `CustomerKycStatus` | `customers` | `pending`, `verified`, `rejected` | `apps/backend/src/modules/customers/schemas/customer.schema.ts` |
| `CustomerReceiptStatus` | `customer-receipts` | `draft`, `posted`, `cancelled` | `apps/backend/src/modules/customer-receipts/schemas/customer-receipt.schema.ts` |
| `CustomerStatus` | `customers` | `draft`, `pending_kyc`, `active`, `inactive` | `apps/backend/src/modules/customers/schemas/customer.schema.ts` |
| `DailyDirectorDigestDeliveryStatus` | `daily-director-digest` | `preview`, `sent`, `failed`, `partial` | `apps/backend/src/modules/daily-director-digest/daily-director-digest.constants.ts` |
| `DirectorStatus` | `directors` | `active`, `inactive`, `resigned` | `apps/backend/src/modules/directors/schemas/director.schema.ts` |
| `DocumentStatus` | `documents` | `pending_upload`, `active`, `replaced`, `archived` | `apps/backend/src/modules/documents/schemas/document.schema.ts` |
| `DprStatus` | `daily-progress-reports` | `draft`, `submitted`, `reviewed`, `reopened` | `apps/backend/src/modules/daily-progress-reports/schemas/daily-progress-report.schema.ts` |
| `ExpenseCategoryStatus` | `expense-categories` | `active`, `inactive` | `apps/backend/src/modules/expense-categories/schemas/expense-category.schema.ts` |
| `FinancialYearStatus` | `financial-year` | `open`, `closed`, `locked` | `apps/backend/src/modules/financial-year/schemas/financial-year.schema.ts` |
| `GoodsReceiptStatus` | `goods-receipts` | `draft`, `submitted`, `quality_check`, `accepted`, `partially_accepted`, `rejected`, `posted`, `cancelled` | `apps/backend/src/modules/goods-receipts/schemas/goods-receipt.schema.ts` |
| `IdempotencyStatus` | `shared` | `processing`, `completed`, `failed` | `apps/backend/src/database/schemas/idempotency-key.schema.ts` |
| `InvestorKycStatus` | `investors` | `pending`, `verified`, `rejected` | `apps/backend/src/modules/investors/schemas/investor.schema.ts` |
| `InvestorProfitAllocationStatus` | `investor-portal` | `draft`, `approved`, `cancelled` | `apps/backend/src/modules/investor-portal/schemas/investor-profit-allocation.schema.ts` |
| `InvestorStatus` | `investors` | `draft`, `pending_kyc`, `active`, `inactive` | `apps/backend/src/modules/investors/schemas/investor.schema.ts` |
| `InvestorVisibleReportStatus` | `investor-portal` | `draft`, `published`, `archived` | `apps/backend/src/modules/investor-portal/schemas/investor-visible-report.schema.ts` |
| `JournalStatus` | `journal` | `draft`, `pending_approval`, `posted`, `reversed`, `cancelled` | `apps/backend/src/modules/journal/schemas/journal-entry.schema.ts` |
| `LabourAttendanceStatus` | `labour-attendance` | `draft`, `submitted`, `confirmed` | `apps/backend/src/modules/labour-attendance/schemas/labour-attendance.schema.ts` |
| `LabourCategoryRateStatus` | `labour-categories` | `active`, `inactive` | `apps/backend/src/modules/labour-categories/schemas/labour-category.schema.ts` |
| `LabourCategoryStatus` | `labour-categories` | `active`, `inactive` | `apps/backend/src/modules/labour-categories/schemas/labour-category.schema.ts` |
| `MalwareScanStatus` | `documents` | `pending`, `clean`, `infected`, `skipped`, `error` | `apps/backend/src/modules/documents/schemas/document.schema.ts` |
| `MaterialConsumptionReportStatus` | `material-consumption` | `draft`, `submitted`, `approved`, `cancelled` | `apps/backend/src/modules/material-consumption/schemas/material-consumption-report.schema.ts` |
| `MaterialConsumptionStandardStatus` | `material-consumption-standards` | `draft`, `pending_approval`, `active`, `superseded`, `rejected` | `apps/backend/src/modules/material-consumption-standards/schemas/material-consumption-standard.schema.ts` |
| `MaterialIssueStatus` | `material-issues` | `draft`, `submitted`, `confirmed`, `cancelled` | `apps/backend/src/modules/material-issues/schemas/material-issue.schema.ts` |
| `MaterialStatus` | `material-master` | `active`, `inactive` | `apps/backend/src/modules/material-master/schemas/material.schema.ts` |
| `NotificationDeliveryStatus` | `notifications` | `pending`, `sent`, `failed`, `skipped`, `retrying` | `apps/backend/src/modules/notifications/notifications.constants.ts` |
| `ParticipantApprovalStatus` | `project-participants` | `draft`, `submitted`, `approved`, `rejected` | `apps/backend/src/modules/project-participants/schemas/project-participant.schema.ts` |
| `PaymentDemandStatus` | `payment-schedules` | `issued`, `cancelled`, `settled` | `apps/backend/src/modules/payment-schedules/schemas/payment-demand.schema.ts` |
| `PaymentScheduleLineStatus` | `payment-schedules` | `pending`, `due`, `demanded`, `overdue`, `paid`, `waived` | `apps/backend/src/modules/payment-schedules/schemas/payment-schedule.schema.ts` |
| `PaymentScheduleStatus` | `payment-schedules` | `draft`, `pending_approval`, `active`, `superseded`, `cancelled`, `rejected` | `apps/backend/src/modules/payment-schedules/schemas/payment-schedule.schema.ts` |
| `PeriodChecklistItemStatus` | `accounting-period-closure` | `pending`, `passed`, `failed` | `apps/backend/src/modules/accounting-period-closure/accounting-period-closure.constants.ts` |
| `PeriodReopenRequestStatus` | `accounting-period-closure` | `pending`, `approved`, `rejected` | `apps/backend/src/modules/accounting-period-closure/accounting-period-closure.constants.ts` |
| `PettyCashExpenseDraftStatus` | `petty-cash-requirements` | `draft`, `submitted` | `apps/backend/src/modules/petty-cash-requirements/schemas/petty-cash-expense-draft.schema.ts` |
| `PettyCashFundTransferStatus` | `petty-cash-fund-transfers` | `draft`, `verified`, `posted`, `cancelled` | `apps/backend/src/modules/petty-cash-fund-transfers/schemas/petty-cash-fund-transfer.schema.ts` |
| `PettyCashRequirementStatus` | `petty-cash-requirements` | `draft`, `submitted`, `project_manager_review`, `finance_review`, `approved`, `funded`, `closed`, `rejected`, `returned`, `cancelled` | `apps/backend/src/modules/petty-cash-requirements/schemas/petty-cash-requirement.schema.ts` |
| `ProjectAccessStatus` | `project-access` | `active`, `inactive`, `expired` | `apps/backend/src/modules/project-access/schemas/project-assignment.schema.ts` |
| `ProjectStatus` | `projects` | `Planning`, `Approval`, `Pre-Construction`, `Construction`, `On Hold`, `Completed`, `Closed`, `Cancelled` | `apps/backend/src/modules/projects/schemas/project.schema.ts` |
| `PurchaseOrderStatus` | `purchase-orders` | `draft`, `pending_approval`, `issued`, `partially_received`, `fully_received`, `closed`, `cancelled`, `superseded`, `rejected` | `apps/backend/src/modules/purchase-orders/schemas/purchase-order.schema.ts` |
| `PurchaseRequestLineStatus` | `purchase-requests` | `pending`, `approved`, `partially_approved`, `rejected` | `apps/backend/src/modules/purchase-requests/schemas/purchase-request.schema.ts` |
| `PurchaseRequestStatus` | `purchase-requests` | `draft`, `submitted`, `reviewed`, `approved`, `sourcing`, `closed`, `rejected`, `returned`, `cancelled` | `apps/backend/src/modules/purchase-requests/schemas/purchase-request.schema.ts` |
| `QualityInspectionStatus` | `quality-inspections` | `draft`, `in_progress`, `completed`, `cancelled` | `apps/backend/src/modules/quality-inspections/schemas/quality-inspection.schema.ts` |
| `QuotationComparisonStatus` | `quotation-comparisons` | `draft`, `recommended`, `pending_approval`, `approved`, `rejected`, `cancelled` | `apps/backend/src/modules/quotation-comparisons/schemas/quotation-comparison.schema.ts` |
| `RoleStatus` | `rbac` | `active`, `inactive` | `apps/backend/src/modules/rbac/schemas/role.schema.ts` |
| `ScheduledNotificationStatus` | `notifications` | `pending`, `queued`, `cancelled`, `failed` | `apps/backend/src/modules/notifications/notifications.constants.ts` |
| `ShareholdingChangeStatus` | `directors` | `pending`, `approved`, `rejected` | `apps/backend/src/modules/directors/schemas/shareholding-change-request.schema.ts` |
| `SignedPaymentVoucherStatus` | `signed-payment-vouchers` | `draft`, `submitted`, `approved`, `posted`, `reversed`, `cancelled`, `returned` | `apps/backend/src/modules/signed-payment-vouchers/schemas/signed-payment-voucher.schema.ts` |
| `SiteExpenseVoucherStatus` | `site-expense-vouchers` | `draft`, `submitted`, `verified`, `approved`, `posted`, `rejected`, `returned`, `cancelled` | `apps/backend/src/modules/site-expense-vouchers/schemas/site-expense-voucher.schema.ts` |
| `StockCountStatus` | `stock-counts` | `draft`, `submitted`, `reviewed`, `approved`, `adjustment_posted`, `cancelled` | `apps/backend/src/modules/stock-counts/schemas/stock-count.schema.ts` |
| `StockReorderAlertStatus` | `stock-reorder` | `open`, `resolved`, `dismissed` | `apps/backend/src/modules/stock-reorder/schemas/stock-reorder-alert.schema.ts` |
| `UnitStatus` | `units` | `available`, `held`, `reserved`, `booked`, `agreement_executed`, `registered`, `cancelled`, `blocked` | `apps/backend/src/modules/units/schemas/unit.schema.ts` |
| `UnlockRequestStatus` | `financial-year` | `pending`, `approved`, `rejected` | `apps/backend/src/modules/financial-year/schemas/financial-year-unlock-request.schema.ts` |
| `UserStatus` | `users` | `active`, `inactive`, `locked` | `apps/backend/src/modules/users/schemas/user.schema.ts` |
| `VendorInvoiceMatchingStatus` | `vendor-invoices` | `pending`, `matched`, `matched_with_tolerance`, `exception`, `rejected` | `apps/backend/src/modules/vendor-invoices/schemas/vendor-invoice.schema.ts` |
| `VendorInvoiceStatus` | `vendor-invoices` | `draft`, `submitted`, `verification`, `matching`, `approval`, `posted`, `paid`, `cancelled` | `apps/backend/src/modules/vendor-invoices/schemas/vendor-invoice.schema.ts` |
| `VendorPaymentStatus` | `vendor-payments` | `draft`, `approval`, `released`, `verified`, `posted`, `cancelled` | `apps/backend/src/modules/vendor-payments/schemas/vendor-payment.schema.ts` |
| `VendorProjectAssignmentStatus` | `vendors` | `active`, `inactive` | `apps/backend/src/modules/vendors/schemas/vendor-project-assignment.schema.ts` |
| `VendorQuotationStatus` | `vendor-quotations` | `draft`, `submitted`, `final`, `superseded`, `cancelled` | `apps/backend/src/modules/vendor-quotations/schemas/vendor-quotation.schema.ts` |
| `VendorStatus` | `vendors` | `draft`, `pending_verification`, `active`, `blocked`, `inactive` | `apps/backend/src/modules/vendors/schemas/vendor.schema.ts` |
| `VendorVerificationStatus` | `vendors` | `pending`, `verified`, `rejected` | `apps/backend/src/modules/vendors/schemas/vendor.schema.ts` |
| `WorkMeasurementStatus` | `work-measurements` | `draft`, `submitted`, `verified`, `rejected`, `cancelled` | `apps/backend/src/modules/work-measurements/schemas/work-measurement.schema.ts` |
