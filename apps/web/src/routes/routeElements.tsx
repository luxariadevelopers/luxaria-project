/**
 * Page elements keyed by registry route id.
 * Keep in sync with `APP_ROUTE_REGISTRY`.
 */
import type { ReactElement } from 'react';
import type { AppRouteId } from '@/navigation/routeRegistry';
import { AccountCreatePage } from '@/pages/AccountCreatePage';
import { AccountEditPage } from '@/pages/AccountEditPage';
import { AccountingReportsPage } from '@/pages/AccountingReportsPage';
import { ApprovalDetailPage } from '@/pages/ApprovalDetailPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { ApprovalWorkflowsPage } from '@/pages/ApprovalWorkflowsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { BankAccountDetailPage } from '@/pages/BankAccountDetailPage';
import { BankAccountsPage } from '@/pages/BankAccountsPage';
import { BankBookPage } from '@/pages/BankBookPage';
import { BankReconciliationDetailPage } from '@/pages/BankReconciliationDetailPage';
import { BankReconciliationPage } from '@/pages/BankReconciliationPage';
import { BookingCreatePage } from '@/pages/BookingCreatePage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { BoqImportPage } from '@/pages/BoqImportPage';
import { BoqItemEditorPage } from '@/pages/BoqItemEditorPage';
import { BoqPage } from '@/pages/BoqPage';
import { BoqVersionsPage } from '@/pages/BoqVersionsPage';
import { CancellationsPage } from '@/pages/CancellationsPage';
import { CashAccountsPage } from '@/pages/CashAccountsPage';
import { CashBookPage } from '@/pages/CashBookPage';
import { ChartOfAccountsPage } from '@/pages/ChartOfAccountsPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CommitmentDetailPage } from '@/pages/CommitmentDetailPage';
import { CommitmentsPage } from '@/pages/CommitmentsPage';
import { CompanyOverviewPage } from '@/pages/CompanyOverviewPage';
import { CompanySettingsPage } from '@/pages/CompanySettingsPage';
import { ConstructionReportsPage } from '@/pages/ConstructionReportsPage';
import { ContractorAgreementDetailPage } from '@/pages/ContractorAgreementDetailPage';
import { ContractorAgreementsPage } from '@/pages/ContractorAgreementsPage';
import { ContractorDetailPage } from '@/pages/ContractorDetailPage';
import { ContractorPaymentsPage } from '@/pages/ContractorPaymentsPage';
import { BidComparisonPage } from '@/pages/BidComparisonPage';
import { ContractorCompliancePage } from '@/pages/ContractorCompliancePage';
import { ContractorDashboardPage } from '@/pages/ContractorDashboardPage';
import { ContractorReportsPage } from '@/pages/ContractorReportsPage';
import { ContractorsPage } from '@/pages/ContractorsPage';
import { TenderListPage } from '@/pages/TenderListPage';
import { ContributionReceiptsPage } from '@/pages/ContributionReceiptsPage';
import { CostForecastPage } from '@/pages/CostForecastPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DataTableDemoPage } from '@/pages/DataTableDemoPage';
import { DirectorCommandCentrePage } from '@/pages/DirectorCommandCentrePage';
import { DirectorDetailPage } from '@/pages/DirectorDetailPage';
import { DirectorDigestPage } from '@/pages/DirectorDigestPage';
import { DirectorsPage } from '@/pages/DirectorsPage';
import { DocumentsDemoPage } from '@/pages/DocumentsDemoPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DprDetailPage } from '@/pages/DprDetailPage';
import { DprListPage } from '@/pages/DprListPage';
import { EntityDetailDemoPage } from '@/pages/EntityDetailDemoPage';
import { ExpenseCategoriesPage } from '@/pages/ExpenseCategoriesPage';
import { ExpenseDetailPage } from '@/pages/ExpenseDetailPage';
import { ExpensesPage } from '@/pages/ExpensesPage';
import { ExportDemoPage } from '@/pages/ExportDemoPage';
import { FinanceDashboardPage } from '@/pages/FinanceDashboardPage';
import { FinancialYearCreatePage } from '@/pages/FinancialYearCreatePage';
import { FinancialYearDetailPage } from '@/pages/FinancialYearDetailPage';
import { FinancialYearsPage } from '@/pages/FinancialYearsPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { FormDemoPage } from '@/pages/FormDemoPage';
import { FundingDashboardPage } from '@/pages/FundingDashboardPage';
import { GrnDetailPage } from '@/pages/GrnDetailPage';
import { GrnsPage } from '@/pages/GrnsPage';
import { DrawingsPage } from '@/drawings';
import { EquipmentPage } from '@/equipment/EquipmentPage';
import { InventoryDashboardPage } from '@/pages/InventoryDashboardPage';
import { InventoryReportsPage } from '@/pages/InventoryReportsPage';
import { SiteDiaryPage } from '@/pages/SiteDiaryPage';
import { SiteExecutionDashboardPage } from '@/pages/SiteExecutionDashboardPage';
import { SiteExecutionReportsPage } from '@/pages/SiteExecutionReportsPage';
import { SiteIssuesPage } from '@/pages/SiteIssuesPage';
import { SiteQualityPage } from '@/site-quality/SiteQualityPage';
import { SiteSafetyPage } from '@/site-safety/SiteSafetyPage';
import { InvestorDetailPage } from '@/pages/InvestorDetailPage';
import { InvestorsPage } from '@/pages/InvestorsPage';
import { JournalCreatePage } from '@/pages/JournalCreatePage';
import { JournalDetailPage } from '@/pages/JournalDetailPage';
import { JournalsPage } from '@/pages/JournalsPage';
import { LabourAttendancePage } from '@/pages/LabourAttendancePage';
import { LabourCategoriesPage } from '@/pages/LabourCategoriesPage';
import { ManpowerPlanDetailPage } from '@/pages/ManpowerPlanDetailPage';
import { ManpowerPlansPage } from '@/pages/ManpowerPlansPage';
import { ManpowerShortfallPage } from '@/pages/ManpowerShortfallPage';
import { MaterialCoefficientsPage } from '@/pages/MaterialCoefficientsPage';
import { MaterialDetailPage } from '@/pages/MaterialDetailPage';
import { MaterialIssueDetailPage } from '@/pages/MaterialIssueDetailPage';
import { MaterialIssuesPage } from '@/pages/MaterialIssuesPage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import { MaterialVariancePage } from '@/pages/MaterialVariancePage';
import { NoProjectAccessPage } from '@/pages/NoProjectAccessPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PaymentScheduleDetailPage } from '@/pages/PaymentScheduleDetailPage';
import { PaymentSchedulesPage } from '@/pages/PaymentSchedulesPage';
import { PeriodClosePage } from '@/pages/PeriodClosePage';
import { PettyCashRequestCreatePage } from '@/pages/PettyCashRequestCreatePage';
import { PettyCashRequestDetailPage } from '@/pages/PettyCashRequestDetailPage';
import { PettyCashRequestsPage } from '@/pages/PettyCashRequestsPage';
import { PettyCashTransfersPage } from '@/pages/PettyCashTransfersPage';
import { PrintPdfDemoPage } from '@/pages/PrintPdfDemoPage';
import { ProfitShareEntryPage, ProfitSharePage } from '@/pages/ProfitSharePage';
import { ProjectAccessPage } from '@/pages/ProjectAccessPage';
import { ProjectCreatePage } from '@/pages/ProjectCreatePage';
import { ProjectDashboardEntryPage, ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectDocumentsPage } from '@/pages/ProjectDocumentsPage';
import { ProjectEditPage } from '@/pages/ProjectEditPage';
import { ProjectParticipantsEntryPage, ProjectParticipantsPage } from '@/pages/ProjectParticipantsPage';
import { ProjectFinancialSettingsPage } from '@/pages/ProjectFinancialSettingsPage';
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import { ProjectStructurePage } from '@/pages/ProjectStructurePage';
import { ProjectTeamPage } from '@/pages/ProjectTeamPage';
import { ProjectWarehousesPage } from '@/pages/ProjectWarehousesPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { PurchaseDashboardPage } from '@/pages/PurchaseDashboardPage';
import { PurchaseOrderCreatePage } from '@/pages/PurchaseOrderCreatePage';
import { PurchaseOrderDetailPage } from '@/pages/PurchaseOrderDetailPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { PurchaseRequestCreatePage } from '@/pages/PurchaseRequestCreatePage';
import { PurchaseRequestDetailPage } from '@/pages/PurchaseRequestDetailPage';
import { ProcurementMastersPage } from '@/pages/ProcurementMastersPage';
import { PurchaseRequestsPage } from '@/pages/PurchaseRequestsPage';
import { RfqDetailPage } from '@/pages/RfqDetailPage';
import { RfqListPage } from '@/pages/RfqListPage';
import { VendorPortalRfqsPage } from '@/pages/VendorPortalRfqsPage';
import { QualityInspectionDetailPage } from '@/pages/QualityInspectionDetailPage';
import { QualityInspectionsPage } from '@/pages/QualityInspectionsPage';
import { QuotationComparisonPage } from '@/pages/QuotationComparisonPage';
import { QuotationsPage } from '@/pages/QuotationsPage';
import { ReorderAlertsPage } from '@/pages/ReorderAlertsPage';
import { RoleCreatePage } from '@/pages/RoleCreatePage';
import { RoleDetailPage } from '@/pages/RoleDetailPage';
import { RoleEditPage } from '@/pages/RoleEditPage';
import { RolesPage } from '@/pages/RolesPage';
import { RunningBillCreatePage } from '@/pages/RunningBillCreatePage';
import { RunningBillDetailPage } from '@/pages/RunningBillDetailPage';
import { RunningBillsPage } from '@/pages/RunningBillsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ShareholdingPage } from '@/pages/ShareholdingPage';
import { SignedPaymentVoucherDetailPage } from '@/pages/SignedPaymentVoucherDetailPage';
import { SignedPaymentVouchersPage } from '@/pages/SignedPaymentVouchersPage';
import { SiteOperationsDashboardPage } from '@/pages/SiteOperationsDashboardPage';
import { StockBalancesPage } from '@/pages/StockBalancesPage';
import { StockTransfersPage } from '@/pages/StockTransfersPage';
import { StockCountDetailPage } from '@/pages/StockCountDetailPage';
import { StockCountsPage } from '@/pages/StockCountsPage';
import { StockLedgerPage } from '@/pages/StockLedgerPage';
import { SystemHealthPage } from '@/pages/SystemHealthPage';
import { UnitDetailPage } from '@/pages/UnitDetailPage';
import { UnitsPage } from '@/pages/UnitsPage';
import { UserCreatePage } from '@/pages/UserCreatePage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { UserEditPage } from '@/pages/UserEditPage';
import { DepartmentsPage } from '@/pages/DepartmentsPage';
import { DesignationsPage } from '@/pages/DesignationsPage';
import { EmployeeAccessPage } from '@/pages/EmployeeAccessPage';
import { EmployeeCreatePage } from '@/pages/EmployeeCreatePage';
import { EmployeeDetailPage } from '@/pages/EmployeeDetailPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { SiteAccessAdminPage } from '@/pages/SiteAccessAdminPage';
import { UsersPage } from '@/pages/UsersPage';
import { VendorDetailPage } from '@/pages/VendorDetailPage';
import { VendorInvoiceMatchPage } from '@/pages/VendorInvoiceMatchPage';
import { VendorInvoicesPage } from '@/pages/VendorInvoicesPage';
import { VendorPaymentsPage } from '@/pages/VendorPaymentsPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { WorkflowTimelineDemoPage } from '@/pages/WorkflowTimelineDemoPage';
import { MaterialReconciliationPage } from '@/contractor-material-reconciliation';
import { MeasurementBookPage } from '@/measurement-book';
import { ContractorLedgerPage } from '@/pages/ContractorLedgerPage';
import { RetentionRegisterPage } from '@/pages/RetentionRegisterPage';
import { WorkOrderDetailPage } from '@/pages/WorkOrderDetailPage';
import { WorkOrdersPage } from '@/pages/WorkOrdersPage';
import { WorkMeasurementsPage } from '@/pages/WorkMeasurementsPage';
import { RateContractsPage } from '@/rate-contracts';

export const APP_ROUTE_ELEMENTS: {
  [K in Exclude<AppRouteId, 'login'>]: ReactElement;
} = {
  dashboard: <DashboardPage />,
  'director-command-centre': <DirectorCommandCentrePage />,
  'finance-dashboard': <FinanceDashboardPage />,
  'site-operations-dashboard': <SiteOperationsDashboardPage />,
  'site-execution-dashboard': <SiteExecutionDashboardPage />,
  'site-execution-reports': <SiteExecutionReportsPage />,
  'purchase-dashboard': <PurchaseDashboardPage />,
  notifications: <NotificationsPage />,
  approvals: <ApprovalsPage />,
  'approval-detail': <ApprovalDetailPage />,
  projects: <ProjectsPage />,
  'project-create': <ProjectCreatePage />,
  'project-detail': <ProjectDetailPage />,
  'project-edit': <ProjectEditPage />,
  'project-access': <ProjectAccessPage />,
  'project-documents': <ProjectDocumentsPage />,
  'project-settings': <ProjectSettingsPage />,
  'project-structure': <ProjectStructurePage />,
  'project-team': <ProjectTeamPage />,
  'project-warehouses': <ProjectWarehousesPage />,
  'project-financial-settings': <ProjectFinancialSettingsPage />,
  'project-dashboard': <ProjectDashboardEntryPage />,
  'project-dashboard-detail': <ProjectDashboardPage />,
  'project-participants': <ProjectParticipantsEntryPage />,
  'project-participants-detail': <ProjectParticipantsPage />,
  'profit-share': <ProfitShareEntryPage />,
  'profit-share-detail': <ProfitSharePage />,
  'daily-progress': <DprListPage />,
  'dpr-detail': <DprDetailPage />,
  boq: <BoqPage />,
  'boq-import': <BoqImportPage />,
  'work-measurements': <WorkMeasurementsPage />,
  'measurement-book': <MeasurementBookPage />,
  'material-reconciliation': <MaterialReconciliationPage />,
  'retention-register': <RetentionRegisterPage />,
  'contractor-ledger': <ContractorLedgerPage />,
  drawings: <DrawingsPage />,
  equipment: <EquipmentPage />,
  'site-quality': <SiteQualityPage />,
  'site-safety': <SiteSafetyPage />,
  'site-issues': <SiteIssuesPage />,
  'site-diary': <SiteDiaryPage />,
  'material-coefficients': <MaterialCoefficientsPage />,
  'material-variance': <MaterialVariancePage />,
  'cost-forecast': <CostForecastPage />,
  vendors: <VendorsPage />,
  'vendor-detail': <VendorDetailPage />,
  contractors: <ContractorsPage />,
  'contractor-dashboard': <ContractorDashboardPage />,
  'contractor-reports': <ContractorReportsPage />,
  'contractor-compliance': <ContractorCompliancePage />,
  'contractor-tenders': <TenderListPage />,
  'contractor-tender-compare': <BidComparisonPage />,
  'rate-contracts': <RateContractsPage />,
  'work-orders': <WorkOrdersPage />,
  'work-order-detail': <WorkOrderDetailPage />,
  'contractor-agreements': <ContractorAgreementsPage />,
  'contractor-agreement-detail': <ContractorAgreementDetailPage />,
  'contractor-payments': <ContractorPaymentsPage />,
  'running-bills': <RunningBillsPage />,
  'running-bill-create': <RunningBillCreatePage />,
  'running-bill-detail': <RunningBillDetailPage />,
  'labour-categories': <LabourCategoriesPage />,
  'labour-attendance': <LabourAttendancePage />,
  'signed-payment-vouchers': <SignedPaymentVouchersPage />,
  'signed-payment-voucher-detail': <SignedPaymentVoucherDetailPage />,
  'manpower-shortfall': <ManpowerShortfallPage />,
  'manpower-plans': <ManpowerPlansPage />,
  'manpower-plan-detail': <ManpowerPlanDetailPage />,
  'contractor-detail': <ContractorDetailPage />,
  customers: <CustomersPage />,
  'customer-detail': <CustomerDetailPage />,
  'purchase-orders': <PurchaseOrdersPage />,
  'purchase-order-create': <PurchaseOrderCreatePage />,
  'purchase-order-detail': <PurchaseOrderDetailPage />,
  'procurement-masters': <ProcurementMastersPage />,
  'rfq-list': <RfqListPage />,
  'rfq-detail': <RfqDetailPage />,
  'vendor-portal-rfqs': <VendorPortalRfqsPage />,
  'purchase-requests': <PurchaseRequestsPage />,
  'purchase-request-create': <PurchaseRequestCreatePage />,
  'purchase-request-detail': <PurchaseRequestDetailPage />,
  quotations: <QuotationsPage />,
  'quotation-comparison': <QuotationComparisonPage />,
  'vendor-invoices': <VendorInvoicesPage />,
  'vendor-invoice-match': <VendorInvoiceMatchPage />,
  'vendor-payments': <VendorPaymentsPage />,
  'inventory-dashboard': <InventoryDashboardPage />,
  materials: <MaterialsPage />,
  'material-detail': <MaterialDetailPage />,
  'stock-balances': <StockBalancesPage />,
  'stock-ledger': <StockLedgerPage />,
  'stock-counts': <StockCountsPage />,
  'stock-count-detail': <StockCountDetailPage />,
  'stock-transfers': <StockTransfersPage />,
  'inventory-reports': <InventoryReportsPage />,
  units: <UnitsPage />,
  'unit-detail': <UnitDetailPage />,
  collections: <CollectionsPage />,
  'payment-schedules': <PaymentSchedulesPage />,
  'payment-schedule-detail': <PaymentScheduleDetailPage />,
  bookings: <BookingsPage />,
  'booking-create': <BookingCreatePage />,
  'booking-detail': <BookingDetailPage />,
  cancellations: <CancellationsPage />,
  directors: <DirectorsPage />,
  'director-detail': <DirectorDetailPage />,
  shareholding: <ShareholdingPage />,
  investors: <InvestorsPage />,
  'funding-dashboard': <FundingDashboardPage />,
  commitments: <CommitmentsPage />,
  'contribution-receipts': <ContributionReceiptsPage />,
  'commitment-detail': <CommitmentDetailPage />,
  'investor-detail': <InvestorDetailPage />,
  'chart-of-accounts': <ChartOfAccountsPage />,
  'account-create': <AccountCreatePage />,
  'account-edit': <AccountEditPage />,
  journals: <JournalsPage />,
  'journal-create': <JournalCreatePage />,
  'journal-detail': <JournalDetailPage />,
  'cash-accounts': <CashAccountsPage />,
  'bank-accounts': <BankAccountsPage />,
  'bank-account-detail': <BankAccountDetailPage />,
  'bank-reconciliation': <BankReconciliationPage />,
  'bank-reconciliation-detail': <BankReconciliationDetailPage />,
  'financial-years': <FinancialYearsPage />,
  'financial-year-create': <FinancialYearCreatePage />,
  'financial-year-detail': <FinancialYearDetailPage />,
  'period-close': <PeriodClosePage />,
  'expense-categories': <ExpenseCategoriesPage />,
  'site-expenses': <ExpensesPage />,
  'site-expense-detail': <ExpenseDetailPage />,
  'petty-cash-requests': <PettyCashRequestsPage />,
  'petty-cash-request-create': <PettyCashRequestCreatePage />,
  'petty-cash-request-detail': <PettyCashRequestDetailPage />,
  'petty-cash-fund-transfers': <PettyCashTransfersPage />,
  grns: <GrnsPage />,
  'grn-detail': <GrnDetailPage />,
  'quality-inspections': <QualityInspectionsPage />,
  'quality-inspection-detail': <QualityInspectionDetailPage />,
  'material-issues': <MaterialIssuesPage />,
  'material-issue-detail': <MaterialIssueDetailPage />,
  'reorder-alerts': <ReorderAlertsPage />,
  'boq-versions': <BoqVersionsPage />,
  'boq-item-editor': <BoqItemEditorPage />,
  'construction-reports': <ConstructionReportsPage />,
  'accounting-reports': <AccountingReportsPage />,
  'cash-book': <CashBookPage />,
  'bank-book': <BankBookPage />,
  users: <UsersPage />,
  'user-create': <UserCreatePage />,
  'user-detail': <UserDetailPage />,
  'user-edit': <UserEditPage />,
  'company-overview': <CompanyOverviewPage />,
  'company-settings': <CompanySettingsPage />,
  employees: <EmployeesPage />,
  'employee-create': <EmployeeCreatePage />,
  'employee-detail': <EmployeeDetailPage />,
  'employee-access': <EmployeeAccessPage />,
  departments: <DepartmentsPage />,
  designations: <DesignationsPage />,
  'site-access-admin': <SiteAccessAdminPage />,
  roles: <RolesPage />,
  'role-create': <RoleCreatePage />,
  'role-detail': <RoleDetailPage />,
  'role-edit': <RoleEditPage />,
  documents: <DocumentsPage />,
  'audit-logs': <AuditLogsPage />,
  'director-digest': <DirectorDigestPage />,
  'approval-workflows': <ApprovalWorkflowsPage />,
  'system-health': <SystemHealthPage />,
  settings: <SettingsPage />,
  forbidden: <ForbiddenPage />,
  'no-project-access': <NoProjectAccessPage />,
  'dev-data-table': <DataTableDemoPage />,
  'dev-forms': <FormDemoPage />,
  'dev-documents': <DocumentsDemoPage />,
  'dev-workflow-timeline': <WorkflowTimelineDemoPage />,
  'dev-entity-detail': <EntityDetailDemoPage />,
  'dev-print-pdf': <PrintPdfDemoPage />,
  'dev-export': <ExportDemoPage />,
};
