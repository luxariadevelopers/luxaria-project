/**
 * Page elements keyed by registry route id.
 * Keep in sync with `APP_ROUTE_REGISTRY`.
 */
import type { ReactElement } from 'react';
import type { AppRouteId } from '@/navigation/routeRegistry';
import { AccountCreatePage } from '@/pages/AccountCreatePage';
import { AccountEditPage } from '@/pages/AccountEditPage';
import { ApprovalDetailPage } from '@/pages/ApprovalDetailPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { BankAccountDetailPage } from '@/pages/BankAccountDetailPage';
import { BankAccountsPage } from '@/pages/BankAccountsPage';
import { BankBookPage } from '@/pages/BankBookPage';
import { BankReconciliationDetailPage } from '@/pages/BankReconciliationDetailPage';
import { BankReconciliationPage } from '@/pages/BankReconciliationPage';
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
import { ContractorAgreementDetailPage } from '@/pages/ContractorAgreementDetailPage';
import { ContractorAgreementsPage } from '@/pages/ContractorAgreementsPage';
import { ContractorPaymentsPage } from '@/pages/ContractorPaymentsPage';
import { ContractorsPage } from '@/pages/ContractorsPage';
import { ContributionReceiptsPage } from '@/pages/ContributionReceiptsPage';
import { CostForecastPage } from '@/pages/CostForecastPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DataTableDemoPage } from '@/pages/DataTableDemoPage';
import { DirectorCommandCentrePage } from '@/pages/DirectorCommandCentrePage';
import { DirectorDetailPage } from '@/pages/DirectorDetailPage';
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
import { InvestorDetailPage } from '@/pages/InvestorDetailPage';
import { InvestorsPage } from '@/pages/InvestorsPage';
import { JournalCreatePage } from '@/pages/JournalCreatePage';
import { JournalDetailPage } from '@/pages/JournalDetailPage';
import { JournalsPage } from '@/pages/JournalsPage';
import { LabourAttendancePage } from '@/pages/LabourAttendancePage';
import { LabourCategoriesPage } from '@/pages/LabourCategoriesPage';
import { ManpowerShortfallPage } from '@/pages/ManpowerShortfallPage';
import { MaterialCoefficientsPage } from '@/pages/MaterialCoefficientsPage';
import { MaterialDetailPage } from '@/pages/MaterialDetailPage';
import { MaterialIssueDetailPage } from '@/pages/MaterialIssueDetailPage';
import { MaterialIssuesPage } from '@/pages/MaterialIssuesPage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import { MaterialVariancePage } from '@/pages/MaterialVariancePage';
import { NoProjectAccessPage } from '@/pages/NoProjectAccessPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
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
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { PurchaseDashboardPage } from '@/pages/PurchaseDashboardPage';
import { PurchaseOrderCreatePage } from '@/pages/PurchaseOrderCreatePage';
import { PurchaseOrderDetailPage } from '@/pages/PurchaseOrderDetailPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { PurchaseRequestCreatePage } from '@/pages/PurchaseRequestCreatePage';
import { PurchaseRequestDetailPage } from '@/pages/PurchaseRequestDetailPage';
import { PurchaseRequestsPage } from '@/pages/PurchaseRequestsPage';
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
import { SiteOperationsDashboardPage } from '@/pages/SiteOperationsDashboardPage';
import { StockBalancesPage } from '@/pages/StockBalancesPage';
import { StockCountDetailPage } from '@/pages/StockCountDetailPage';
import { StockCountsPage } from '@/pages/StockCountsPage';
import { StockLedgerPage } from '@/pages/StockLedgerPage';
import { SystemHealthPage } from '@/pages/SystemHealthPage';
import { UnitDetailPage } from '@/pages/UnitDetailPage';
import { UnitsPage } from '@/pages/UnitsPage';
import { UserCreatePage } from '@/pages/UserCreatePage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { UserEditPage } from '@/pages/UserEditPage';
import { UsersPage } from '@/pages/UsersPage';
import { VendorDetailPage } from '@/pages/VendorDetailPage';
import { VendorInvoiceMatchPage } from '@/pages/VendorInvoiceMatchPage';
import { VendorInvoicesPage } from '@/pages/VendorInvoicesPage';
import { VendorPaymentsPage } from '@/pages/VendorPaymentsPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { WorkflowTimelineDemoPage } from '@/pages/WorkflowTimelineDemoPage';
import { WorkMeasurementsPage } from '@/pages/WorkMeasurementsPage';

export const APP_ROUTE_ELEMENTS: {
  [K in Exclude<AppRouteId, 'login'>]: ReactElement;
} = {
  dashboard: <DashboardPage />,
  'director-command-centre': <DirectorCommandCentrePage />,
  'finance-dashboard': <FinanceDashboardPage />,
  'site-operations-dashboard': <SiteOperationsDashboardPage />,
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
  'material-coefficients': <MaterialCoefficientsPage />,
  'material-variance': <MaterialVariancePage />,
  'cost-forecast': <CostForecastPage />,
  vendors: <VendorsPage />,
  'vendor-detail': <VendorDetailPage />,
  contractors: <ContractorsPage />,
  'contractor-agreements': <ContractorAgreementsPage />,
  'contractor-agreement-detail': <ContractorAgreementDetailPage />,
  'contractor-payments': <ContractorPaymentsPage />,
  'running-bills': <RunningBillsPage />,
  'running-bill-create': <RunningBillCreatePage />,
  'running-bill-detail': <RunningBillDetailPage />,
  'labour-categories': <LabourCategoriesPage />,
  'labour-attendance': <LabourAttendancePage />,
  'manpower-shortfall': <ManpowerShortfallPage />,
  customers: <CustomersPage />,
  'customer-detail': <CustomerDetailPage />,
  'purchase-orders': <PurchaseOrdersPage />,
  'purchase-order-create': <PurchaseOrderCreatePage />,
  'purchase-order-detail': <PurchaseOrderDetailPage />,
  'purchase-requests': <PurchaseRequestsPage />,
  'purchase-request-create': <PurchaseRequestCreatePage />,
  'purchase-request-detail': <PurchaseRequestDetailPage />,
  quotations: <QuotationsPage />,
  'quotation-comparison': <QuotationComparisonPage />,
  'vendor-invoices': <VendorInvoicesPage />,
  'vendor-invoice-match': <VendorInvoiceMatchPage />,
  'vendor-payments': <VendorPaymentsPage />,
  materials: <MaterialsPage />,
  'material-detail': <MaterialDetailPage />,
  'stock-balances': <StockBalancesPage />,
  'stock-ledger': <StockLedgerPage />,
  'stock-counts': <StockCountsPage />,
  'stock-count-detail': <StockCountDetailPage />,
  units: <UnitsPage />,
  'unit-detail': <UnitDetailPage />,
  collections: <CollectionsPage />,
  bookings: <BookingsPage />,
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
  'cash-book': <CashBookPage />,
  'bank-book': <BankBookPage />,
  users: <UsersPage />,
  'user-create': <UserCreatePage />,
  'user-detail': <UserDetailPage />,
  'user-edit': <UserEditPage />,
  'company-overview': <CompanyOverviewPage />,
  'company-settings': <CompanySettingsPage />,
  roles: <RolesPage />,
  'role-create': <RoleCreatePage />,
  'role-detail': <RoleDetailPage />,
  'role-edit': <RoleEditPage />,
  documents: <DocumentsPage />,
  'audit-logs': <AuditLogsPage />,
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
