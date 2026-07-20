import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { RegistryRouteGuard } from '@/auth/RegistryRouteGuard';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toRelativeAppPath } from '@/navigation/routeRegistry';
import { DPR_ROUTES } from '@/dpr/routes';
import { PURCHASE_ORDER_ROUTES } from '@/purchase-orders/routes';
import { ApprovalDetailPage } from '@/pages/ApprovalDetailPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { AuditLogsPage } from '@/pages/AuditLogsPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { AccountCreatePage } from '@/pages/AccountCreatePage';
import { AccountEditPage } from '@/pages/AccountEditPage';
import { ChartOfAccountsPage } from '@/pages/ChartOfAccountsPage';
import { CommitmentDetailPage } from '@/pages/CommitmentDetailPage';
import { BankAccountDetailPage } from '@/pages/BankAccountDetailPage';
import { BankAccountsPage } from '@/pages/BankAccountsPage';
import { CashAccountsPage } from '@/pages/CashAccountsPage';
import { JournalCreatePage } from '@/pages/JournalCreatePage';
import { JournalDetailPage } from '@/pages/JournalDetailPage';
import { JournalsPage } from '@/pages/JournalsPage';
import { PettyCashRequestCreatePage } from '@/pages/PettyCashRequestCreatePage';
import { PettyCashRequestDetailPage } from '@/pages/PettyCashRequestDetailPage';
import { PettyCashRequestsPage } from '@/pages/PettyCashRequestsPage';
import { PettyCashTransfersPage } from '@/pages/PettyCashTransfersPage';
import { CommitmentsPage } from '@/pages/CommitmentsPage';
import { FundingDashboardPage } from '@/pages/FundingDashboardPage';
import { ContributionReceiptsPage } from '@/pages/ContributionReceiptsPage';
import { ContractorsPage } from '@/pages/ContractorsPage';
import { GrnDetailPage } from '@/pages/GrnDetailPage';
import { GrnsPage } from '@/pages/GrnsPage';
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
import { InvestorDetailPage } from '@/pages/InvestorDetailPage';
import { InvestorsPage } from '@/pages/InvestorsPage';
import { EntityDetailDemoPage } from '@/pages/EntityDetailDemoPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { FormDemoPage } from '@/pages/FormDemoPage';
import { LoginPage } from '@/pages/LoginPage';
import { NoProjectAccessPage } from '@/pages/NoProjectAccessPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import {
  ProjectDashboardEntryPage,
  ProjectDashboardPage,
} from '@/pages/ProjectDashboardPage';
import {
  ProjectParticipantsEntryPage,
  ProjectParticipantsPage,
} from '@/pages/ProjectParticipantsPage';
import {
  ProfitShareEntryPage,
  ProfitSharePage,
} from '@/pages/ProfitSharePage';
import { PurchaseOrderCreatePage } from '@/pages/PurchaseOrderCreatePage';
import { PurchaseOrderDetailPage } from '@/pages/PurchaseOrderDetailPage';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage';
import { PurchaseRequestCreatePage } from '@/pages/PurchaseRequestCreatePage';
import { PurchaseRequestDetailPage } from '@/pages/PurchaseRequestDetailPage';
import { PurchaseRequestsPage } from '@/pages/PurchaseRequestsPage';
import { QuotationsPage } from '@/pages/QuotationsPage';
import { QuotationComparisonPage } from '@/pages/QuotationComparisonPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ShareholdingPage } from '@/pages/ShareholdingPage';
import { UsersPage } from '@/pages/UsersPage';
import { VendorsPage } from '@/pages/VendorsPage';
import { ExportDemoPage } from '@/pages/ExportDemoPage';
import { FinanceDashboardPage } from '@/pages/FinanceDashboardPage';
import { PrintPdfDemoPage } from '@/pages/PrintPdfDemoPage';
import { PurchaseDashboardPage } from '@/pages/PurchaseDashboardPage';
import { SiteOperationsDashboardPage } from '@/pages/SiteOperationsDashboardPage';
import { StockBalancesPage } from '@/pages/StockBalancesPage';
import { StockCountDetailPage } from '@/pages/StockCountDetailPage';
import { StockCountsPage } from '@/pages/StockCountsPage';
import { StockLedgerPage } from '@/pages/StockLedgerPage';
import { CashBookPage } from '@/pages/CashBookPage';
import { BankBookPage } from '@/pages/BankBookPage';
import { QualityInspectionDetailPage } from '@/pages/QualityInspectionDetailPage';
import { QualityInspectionsPage } from '@/pages/QualityInspectionsPage';
import { MaterialIssueDetailPage } from '@/pages/MaterialIssueDetailPage';
import { MaterialIssuesPage } from '@/pages/MaterialIssuesPage';
import { ReorderAlertsPage } from '@/pages/ReorderAlertsPage';
import { BoqPage } from '@/pages/BoqPage';
import { BoqImportPage } from '@/pages/BoqImportPage';
import { BoqItemEditorPage } from '@/pages/BoqItemEditorPage';
import { BoqVersionsPage } from '@/pages/BoqVersionsPage';
import { WorkflowTimelineDemoPage } from '@/pages/WorkflowTimelineDemoPage';

function DailyProgressLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  return (
    <Navigate
      to={search ? `${DPR_ROUTES.list}?${search}` : DPR_ROUTES.list}
      replace
    />
  );
}

/**
 * Page elements keyed by registry route id.
 * Keep in sync with `APP_ROUTE_REGISTRY`.
 */
const APP_ROUTE_ELEMENTS = {
  dashboard: <DashboardPage />,
  'director-command-centre': <DirectorCommandCentrePage />,
  'finance-dashboard': <FinanceDashboardPage />,
  'site-operations-dashboard': <SiteOperationsDashboardPage />,
  'purchase-dashboard': <PurchaseDashboardPage />,
  notifications: <NotificationsPage />,
  approvals: <ApprovalsPage />,
  projects: <ProjectsPage />,
  'project-dashboard': <ProjectDashboardEntryPage />,
  'project-dashboard-detail': <ProjectDashboardPage />,
  'project-participants': <ProjectParticipantsEntryPage />,
  'project-participants-detail': <ProjectParticipantsPage />,
  'profit-share': <ProfitShareEntryPage />,
  'profit-share-detail': <ProfitSharePage />,
  'daily-progress': <DprListPage />,
  'daily-progress-detail': <DprDetailPage />,
  vendors: <VendorsPage />,
  contractors: <ContractorsPage />,
  customers: <CustomersPage />,
  'purchase-orders': <PurchaseOrdersPage />,
  'purchase-order-create': <PurchaseOrderCreatePage />,
  'purchase-order-detail': <PurchaseOrderDetailPage />,
  'purchase-requests': <PurchaseRequestsPage />,
  'purchase-request-create': <PurchaseRequestCreatePage />,
  'purchase-request-detail': <PurchaseRequestDetailPage />,
  quotations: <QuotationsPage />,
  'quotation-comparison': <QuotationComparisonPage />,
  bookings: <BookingsPage />,
  directors: <DirectorsPage />,
  'director-detail': <DirectorDetailPage />,
  shareholding: <ShareholdingPage />,
  investors: <InvestorsPage />,
  'investor-detail': <InvestorDetailPage />,
  'funding-dashboard': <FundingDashboardPage />,
  commitments: <CommitmentsPage />,
  'commitment-detail': <CommitmentDetailPage />,
  'contribution-receipts': <ContributionReceiptsPage />,
  'chart-of-accounts': <ChartOfAccountsPage />,
  'account-create': <AccountCreatePage />,
  'account-edit': <AccountEditPage />,
  journals: <JournalsPage />,
  'journal-create': <JournalCreatePage />,
  'journal-detail': <JournalDetailPage />,
  'cash-accounts': <CashAccountsPage />,
  'bank-accounts': <BankAccountsPage />,
  'bank-account-detail': <BankAccountDetailPage />,
  'petty-cash-requests': <PettyCashRequestsPage />,
  'petty-cash-request-create': <PettyCashRequestCreatePage />,
  'petty-cash-request-detail': <PettyCashRequestDetailPage />,
  'petty-cash-fund-transfers': <PettyCashTransfersPage />,
  'stock-balances': <StockBalancesPage />,
  'stock-ledger': <StockLedgerPage />,
  'cash-book': <CashBookPage />,
  'bank-book': <BankBookPage />,
  'stock-counts': <StockCountsPage />,
  'stock-count-detail': <StockCountDetailPage />,
  grns: <GrnsPage />,
  'grn-detail': <GrnDetailPage />,
  'quality-inspections': <QualityInspectionsPage />,
  'quality-inspection-detail': <QualityInspectionDetailPage />,
  'material-issues': <MaterialIssuesPage />,
  'material-issue-detail': <MaterialIssueDetailPage />,
  'reorder-alerts': <ReorderAlertsPage />,
  boq: <BoqPage />,
  'boq-import': <BoqImportPage />,
  'boq-item-editor': <BoqItemEditorPage />,
  'boq-versions': <BoqVersionsPage />,
  users: <UsersPage />,
  documents: <DocumentsPage />,
  'audit-logs': <AuditLogsPage />,
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
} as const;

/** Preserve `?id=` from quick search when moving to the procurement list. */
function LegacyPurchaseOrdersRedirect() {
  const [params] = useSearchParams();
  const qs = params.toString();
  return (
    <Navigate
      to={`${PURCHASE_ORDER_ROUTES.list}${qs ? `?${qs}` : ''}`}
      replace
    />
  );
}

/** Legacy `/purchase-requests` → procurement list (or detail when `?id=`). */
function LegacyPurchaseRequestsRedirect() {
  const [params] = useSearchParams();
  const id = params.get('id');
  if (id) {
    return (
      <Navigate
        to={`/procurement/purchase-requests/${encodeURIComponent(id)}`}
        replace
      />
    );
  }
  const qs = params.toString();
  return (
    <Navigate
      to={`/procurement/purchase-requests${qs ? `?${qs}` : ''}`}
      replace
    />
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              element={<RegistryRouteGuard routeId="dashboard" />}
            >
              <Route index element={APP_ROUTE_ELEMENTS.dashboard} />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="director-command-centre" />
              }
            >
              <Route
                path={toRelativeAppPath('/dashboard/director')}
                element={APP_ROUTE_ELEMENTS['director-command-centre']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="finance-dashboard" />}
            >
              <Route
                path={toRelativeAppPath('/dashboard/finance')}
                element={APP_ROUTE_ELEMENTS['finance-dashboard']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="site-operations-dashboard" />
              }
            >
              <Route
                path={toRelativeAppPath('/dashboard/site')}
                element={APP_ROUTE_ELEMENTS['site-operations-dashboard']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="purchase-dashboard" />}
            >
              <Route
                path={toRelativeAppPath('/dashboard/purchase')}
                element={APP_ROUTE_ELEMENTS['purchase-dashboard']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="notifications" />}
            >
              <Route
                path={toRelativeAppPath('/notifications')}
                element={APP_ROUTE_ELEMENTS.notifications}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="approvals" />}
            >
              <Route
                path={toRelativeAppPath('/approvals')}
                element={APP_ROUTE_ELEMENTS.approvals}
              />
              <Route
                path="approvals/:approvalId"
                element={<ApprovalDetailPage />}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="users" />}>
              <Route
                path={toRelativeAppPath('/users')}
                element={APP_ROUTE_ELEMENTS.users}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="directors" />}>
              <Route
                path={toRelativeAppPath('/capital/directors')}
                element={APP_ROUTE_ELEMENTS.directors}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="director-detail" />}
            >
              <Route
                path={toRelativeAppPath('/capital/directors/:directorId')}
                element={APP_ROUTE_ELEMENTS['director-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="shareholding" />}>
              <Route
                path={toRelativeAppPath('/capital/shareholding')}
                element={APP_ROUTE_ELEMENTS.shareholding}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="investors" />}>
              <Route
                path={toRelativeAppPath('/capital/investors')}
                element={APP_ROUTE_ELEMENTS.investors}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="investor-detail" />}
            >
              <Route
                path={toRelativeAppPath('/capital/investors/:investorId')}
                element={APP_ROUTE_ELEMENTS['investor-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="funding-dashboard" />}
            >
              <Route
                path={toRelativeAppPath('/capital/funding-dashboard')}
                element={APP_ROUTE_ELEMENTS['funding-dashboard']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="commitments" />}>
              <Route
                path={toRelativeAppPath('/capital/commitments')}
                element={APP_ROUTE_ELEMENTS.commitments}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="commitment-detail" />}
            >
              <Route
                path={toRelativeAppPath(
                  '/capital/commitments/:commitmentId',
                )}
                element={APP_ROUTE_ELEMENTS['commitment-detail']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="contribution-receipts" />
              }
            >
              <Route
                path={toRelativeAppPath('/capital/contribution-receipts')}
                element={APP_ROUTE_ELEMENTS['contribution-receipts']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="chart-of-accounts" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/chart-of-accounts')}
                element={APP_ROUTE_ELEMENTS['chart-of-accounts']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="account-create" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/chart-of-accounts/new')}
                element={APP_ROUTE_ELEMENTS['account-create']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="account-edit" />}>
              <Route
                path={toRelativeAppPath(
                  '/accounting/chart-of-accounts/:accountId/edit',
                )}
                element={APP_ROUTE_ELEMENTS['account-edit']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="journals" />}>
              <Route
                path={toRelativeAppPath('/accounting/journals')}
                element={APP_ROUTE_ELEMENTS.journals}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="journal-create" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/journals/new')}
                element={APP_ROUTE_ELEMENTS['journal-create']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="journal-detail" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/journals/:journalId')}
                element={APP_ROUTE_ELEMENTS['journal-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="cash-accounts" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/cash-accounts')}
                element={APP_ROUTE_ELEMENTS['cash-accounts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-accounts" />}>
              <Route
                path={toRelativeAppPath('/accounting/bank-accounts')}
                element={APP_ROUTE_ELEMENTS['bank-accounts']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="bank-account-detail" />}
            >
              <Route
                path={toRelativeAppPath(
                  '/accounting/bank-accounts/:bankAccountId',
                )}
                element={APP_ROUTE_ELEMENTS['bank-account-detail']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="petty-cash-request-create" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/accounting/petty-cash/requests/new',
                )}
                element={APP_ROUTE_ELEMENTS['petty-cash-request-create']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="petty-cash-request-detail" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/accounting/petty-cash/requests/:requestId',
                )}
                element={APP_ROUTE_ELEMENTS['petty-cash-request-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="petty-cash-requests" />}
            >
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/requests')}
                element={APP_ROUTE_ELEMENTS['petty-cash-requests']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="petty-cash-fund-transfers" />
              }
            >
              <Route
                path={toRelativeAppPath('/accounting/petty-cash/transfers')}
                element={APP_ROUTE_ELEMENTS['petty-cash-fund-transfers']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-balances" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-balances')}
                element={APP_ROUTE_ELEMENTS['stock-balances']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-ledger" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-ledger')}
                element={APP_ROUTE_ELEMENTS['stock-ledger']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="cash-book" />}>
              <Route
                path={toRelativeAppPath('/reports/accounting/cash-book')}
                element={APP_ROUTE_ELEMENTS['cash-book']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bank-book" />}>
              <Route
                path={toRelativeAppPath('/reports/accounting/bank-book')}
                element={APP_ROUTE_ELEMENTS['bank-book']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-counts" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-counts')}
                element={APP_ROUTE_ELEMENTS['stock-counts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="stock-count-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/stock-counts/:countId')}
                element={APP_ROUTE_ELEMENTS['stock-count-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="grns" />}>
              <Route
                path={toRelativeAppPath('/inventory/grns')}
                element={APP_ROUTE_ELEMENTS.grns}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="grn-detail" />}>
              <Route
                path={toRelativeAppPath('/inventory/grns/:grnId')}
                element={APP_ROUTE_ELEMENTS['grn-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="quality-inspections" />}
            >
              <Route
                path={toRelativeAppPath('/inventory/quality-inspections')}
                element={APP_ROUTE_ELEMENTS['quality-inspections']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="quality-inspection-detail" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/inventory/quality-inspections/:inspectionId',
                )}
                element={APP_ROUTE_ELEMENTS['quality-inspection-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="material-issues" />}>
              <Route
                path={toRelativeAppPath('/inventory/material-issues')}
                element={APP_ROUTE_ELEMENTS['material-issues']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="material-issue-detail" />}
            >
              <Route
                path={toRelativeAppPath(
                  '/inventory/material-issues/:issueId',
                )}
                element={APP_ROUTE_ELEMENTS['material-issue-detail']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="reorder-alerts" />}>
              <Route
                path={toRelativeAppPath('/inventory/reorder-alerts')}
                element={APP_ROUTE_ELEMENTS['reorder-alerts']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-import" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/import')}
                element={APP_ROUTE_ELEMENTS['boq-import']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-versions" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/versions')}
                element={APP_ROUTE_ELEMENTS['boq-versions']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq-item-editor" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq/items/:id')}
                element={APP_ROUTE_ELEMENTS['boq-item-editor']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="boq" />}>
              <Route
                path={toRelativeAppPath('/project-control/boq')}
                element={APP_ROUTE_ELEMENTS.boq}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="documents" />}>
              <Route
                path={toRelativeAppPath('/documents')}
                element={APP_ROUTE_ELEMENTS.documents}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="audit-logs" />}>
              <Route
                path={toRelativeAppPath('/administration/audit-logs')}
                element={APP_ROUTE_ELEMENTS['audit-logs']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="projects" />}>
              <Route
                path={toRelativeAppPath('/projects')}
                element={APP_ROUTE_ELEMENTS.projects}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="project-dashboard" />}
            >
              <Route
                path={toRelativeAppPath('/projects/dashboard')}
                element={APP_ROUTE_ELEMENTS['project-dashboard']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="project-dashboard-detail" />
              }
            >
              <Route
                path={toRelativeAppPath('/projects/:projectId/dashboard')}
                element={APP_ROUTE_ELEMENTS['project-dashboard-detail']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="project-participants" />
              }
            >
              <Route
                path={toRelativeAppPath('/projects/participants')}
                element={APP_ROUTE_ELEMENTS['project-participants']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="project-participants-detail" />
              }
            >
              <Route
                path={toRelativeAppPath('/projects/:projectId/participants')}
                element={APP_ROUTE_ELEMENTS['project-participants-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="profit-share" />}
            >
              <Route
                path={toRelativeAppPath('/projects/profit-share')}
                element={APP_ROUTE_ELEMENTS['profit-share']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="profit-share-detail" />}
            >
              <Route
                path={toRelativeAppPath('/projects/:projectId/profit-share')}
                element={APP_ROUTE_ELEMENTS['profit-share-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="daily-progress" />}
            >
              <Route
                path={toRelativeAppPath('/project-control/dpr')}
                element={APP_ROUTE_ELEMENTS['daily-progress']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="daily-progress-detail" />
              }
            >
              <Route
                path={toRelativeAppPath('/project-control/dpr/:id')}
                element={APP_ROUTE_ELEMENTS['daily-progress-detail']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="daily-progress-legacy" />
              }
            >
              <Route
                path={toRelativeAppPath('/daily-progress-reports')}
                element={<DailyProgressLegacyRedirect />}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="vendors" />}>
              <Route
                path={toRelativeAppPath('/vendors')}
                element={APP_ROUTE_ELEMENTS.vendors}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="contractors" />}
            >
              <Route
                path={toRelativeAppPath('/contractors')}
                element={APP_ROUTE_ELEMENTS.contractors}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="customers" />}>
              <Route
                path={toRelativeAppPath('/customers')}
                element={APP_ROUTE_ELEMENTS.customers}
              />
            </Route>

            {/* /new before /:id — create must not be captured as an id param */}
            <Route
              element={
                <RegistryRouteGuard routeId="purchase-order-create" />
              }
            >
              <Route
                path={toRelativeAppPath('/procurement/purchase-orders/new')}
                element={APP_ROUTE_ELEMENTS['purchase-order-create']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="purchase-order-detail" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/procurement/purchase-orders/:purchaseOrderId',
                )}
                element={APP_ROUTE_ELEMENTS['purchase-order-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="purchase-orders" />}
            >
              <Route
                path={toRelativeAppPath('/procurement/purchase-orders')}
                element={APP_ROUTE_ELEMENTS['purchase-orders']}
              />
            </Route>

            {/* Legacy quick-search / dashboard path → procurement list */}
            <Route
              path="purchase-orders"
              element={
                <LegacyPurchaseOrdersRedirect />
              }
            />

            <Route
              element={
                <RegistryRouteGuard routeId="purchase-request-create" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/procurement/purchase-requests/new',
                )}
                element={APP_ROUTE_ELEMENTS['purchase-request-create']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="purchase-request-detail" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/procurement/purchase-requests/:requestId',
                )}
                element={APP_ROUTE_ELEMENTS['purchase-request-detail']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="purchase-requests" />
              }
            >
              <Route
                path={toRelativeAppPath('/procurement/purchase-requests')}
                element={APP_ROUTE_ELEMENTS['purchase-requests']}
              />
            </Route>

            {/* Legacy quick-search path → procurement list / detail */}
            <Route
              path="purchase-requests"
              element={<LegacyPurchaseRequestsRedirect />}
            />

            <Route element={<RegistryRouteGuard routeId="quotations" />}>
              <Route
                path={toRelativeAppPath('/procurement/quotations')}
                element={APP_ROUTE_ELEMENTS.quotations}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="quotation-comparison" />
              }
            >
              <Route
                path={toRelativeAppPath(
                  '/procurement/quotation-comparisons/:prId',
                )}
                element={APP_ROUTE_ELEMENTS['quotation-comparison']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="bookings" />}>
              <Route
                path={toRelativeAppPath('/bookings')}
                element={APP_ROUTE_ELEMENTS.bookings}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="settings" />}>
              <Route
                path={toRelativeAppPath('/settings')}
                element={APP_ROUTE_ELEMENTS.settings}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="forbidden" />}>
              <Route
                path={toRelativeAppPath('/forbidden')}
                element={APP_ROUTE_ELEMENTS.forbidden}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="no-project-access" />}
            >
              <Route
                path={toRelativeAppPath('/no-project-access')}
                element={APP_ROUTE_ELEMENTS['no-project-access']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="dev-data-table" />}
            >
              <Route
                path={toRelativeAppPath('/dev/data-table')}
                element={APP_ROUTE_ELEMENTS['dev-data-table']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="dev-forms" />}>
              <Route
                path={toRelativeAppPath('/dev/forms')}
                element={APP_ROUTE_ELEMENTS['dev-forms']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="dev-documents" />}
            >
              <Route
                path={toRelativeAppPath('/dev/documents')}
                element={APP_ROUTE_ELEMENTS['dev-documents']}
              />
            </Route>

            <Route
              element={
                <RegistryRouteGuard routeId="dev-workflow-timeline" />
              }
            >
              <Route
                path={toRelativeAppPath('/dev/workflow-timeline')}
                element={APP_ROUTE_ELEMENTS['dev-workflow-timeline']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="dev-entity-detail" />}
            >
              <Route
                path={toRelativeAppPath('/dev/entity-detail')}
                element={APP_ROUTE_ELEMENTS['dev-entity-detail']}
              />
            </Route>

            <Route
              element={<RegistryRouteGuard routeId="dev-print-pdf" />}
            >
              <Route
                path={toRelativeAppPath('/dev/print-pdf')}
                element={APP_ROUTE_ELEMENTS['dev-print-pdf']}
              />
            </Route>

            <Route element={<RegistryRouteGuard routeId="dev-export" />}>
              <Route
                path={toRelativeAppPath('/dev/export')}
                element={APP_ROUTE_ELEMENTS['dev-export']}
              />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
