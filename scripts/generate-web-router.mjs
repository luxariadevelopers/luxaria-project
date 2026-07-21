/**
 * Generates apps/web/src/routes/routeElements.tsx and index.tsx
 * from APP_ROUTE_REGISTRY + element map.
 */
import fs from 'node:fs';

const registryPath = 'apps/web/src/navigation/routeRegistry.ts';
let registry = fs.readFileSync(registryPath, 'utf8');

if (!registry.includes("id: 'system-health'")) {
  const insert = `  {
    id: 'system-health',
    path: '/administration/system-health',
    title: 'System Health',
    layout: 'app',
    showInNav: true,
    groupId: 'administration',
    icon: 'audit',
    anyOf: ['audit.view'],
    projectScope: 'none',
    breadcrumbSegment: 'system-health',
  },
`;
  registry = registry.replace(
    "  {\n    id: 'settings',",
    `${insert}  {\n    id: 'settings',`,
  );
  fs.writeFileSync(registryPath, registry);
  console.log('Added system-health to registry');
}

const start = registry.indexOf('const APP_ROUTES');
const end = registry.indexOf('] as const satisfies');
const body = registry.slice(start, end);
const routes = [];
for (const block of body.split(/\n  \{\n/).slice(1)) {
  const id = block.match(/id:\s*'([^']+)'/)?.[1];
  const routePath = block.match(/path:\s*'([^']+)'/)?.[1];
  if (id && routePath) routes.push({ id, path: routePath });
}

const ELEMENT_MAP = {
  dashboard: 'DashboardPage',
  'director-command-centre': 'DirectorCommandCentrePage',
  'finance-dashboard': 'FinanceDashboardPage',
  'site-operations-dashboard': 'SiteOperationsDashboardPage',
  'purchase-dashboard': 'PurchaseDashboardPage',
  notifications: 'NotificationsPage',
  approvals: 'ApprovalsPage',
  'approval-detail': 'ApprovalDetailPage',
  projects: 'ProjectsPage',
  'project-create': 'ProjectCreatePage',
  'project-detail': 'ProjectDetailPage',
  'project-edit': 'ProjectEditPage',
  'project-access': 'ProjectAccessPage',
  'project-documents': 'ProjectDocumentsPage',
  'project-settings': 'ProjectSettingsPage',
  'project-dashboard': 'ProjectDashboardEntryPage',
  'project-dashboard-detail': 'ProjectDashboardPage',
  'project-participants': 'ProjectParticipantsEntryPage',
  'project-participants-detail': 'ProjectParticipantsPage',
  'profit-share': 'ProfitShareEntryPage',
  'profit-share-detail': 'ProfitSharePage',
  'daily-progress': 'DprListPage',
  'dpr-detail': 'DprDetailPage',
  boq: 'BoqPage',
  'boq-import': 'BoqImportPage',
  'work-measurements': 'WorkMeasurementsPage',
  'material-coefficients': 'MaterialCoefficientsPage',
  'material-variance': 'MaterialVariancePage',
  'cost-forecast': 'CostForecastPage',
  vendors: 'VendorsPage',
  'vendor-detail': 'VendorDetailPage',
  contractors: 'ContractorsPage',
  'contractor-agreements': 'ContractorAgreementsPage',
  'contractor-agreement-detail': 'ContractorAgreementDetailPage',
  'contractor-payments': 'ContractorPaymentsPage',
  'running-bills': 'RunningBillsPage',
  'running-bill-create': 'RunningBillCreatePage',
  'running-bill-detail': 'RunningBillDetailPage',
  'labour-categories': 'LabourCategoriesPage',
  'labour-attendance': 'LabourAttendancePage',
  'manpower-shortfall': 'ManpowerShortfallPage',
  customers: 'CustomersPage',
  'customer-detail': 'CustomerDetailPage',
  'purchase-orders': 'PurchaseOrdersPage',
  'purchase-order-create': 'PurchaseOrderCreatePage',
  'purchase-order-detail': 'PurchaseOrderDetailPage',
  'purchase-requests': 'PurchaseRequestsPage',
  'purchase-request-create': 'PurchaseRequestCreatePage',
  'purchase-request-detail': 'PurchaseRequestDetailPage',
  quotations: 'QuotationsPage',
  'quotation-comparison': 'QuotationComparisonPage',
  'vendor-invoices': 'VendorInvoicesPage',
  'vendor-invoice-match': 'VendorInvoiceMatchPage',
  'vendor-payments': 'VendorPaymentsPage',
  materials: 'MaterialsPage',
  'material-detail': 'MaterialDetailPage',
  'stock-balances': 'StockBalancesPage',
  'stock-ledger': 'StockLedgerPage',
  'stock-counts': 'StockCountsPage',
  'stock-count-detail': 'StockCountDetailPage',
  units: 'UnitsPage',
  'unit-detail': 'UnitDetailPage',
  collections: 'CollectionsPage',
  bookings: 'BookingsPage',
  cancellations: 'CancellationsPage',
  directors: 'DirectorsPage',
  'director-detail': 'DirectorDetailPage',
  shareholding: 'ShareholdingPage',
  investors: 'InvestorsPage',
  'funding-dashboard': 'FundingDashboardPage',
  commitments: 'CommitmentsPage',
  'contribution-receipts': 'ContributionReceiptsPage',
  'commitment-detail': 'CommitmentDetailPage',
  'investor-detail': 'InvestorDetailPage',
  'chart-of-accounts': 'ChartOfAccountsPage',
  'account-create': 'AccountCreatePage',
  'account-edit': 'AccountEditPage',
  journals: 'JournalsPage',
  'journal-create': 'JournalCreatePage',
  'journal-detail': 'JournalDetailPage',
  'cash-accounts': 'CashAccountsPage',
  'bank-accounts': 'BankAccountsPage',
  'bank-account-detail': 'BankAccountDetailPage',
  'bank-reconciliation': 'BankReconciliationPage',
  'bank-reconciliation-detail': 'BankReconciliationDetailPage',
  'financial-years': 'FinancialYearsPage',
  'financial-year-create': 'FinancialYearCreatePage',
  'financial-year-detail': 'FinancialYearDetailPage',
  'period-close': 'PeriodClosePage',
  'expense-categories': 'ExpenseCategoriesPage',
  'site-expenses': 'ExpensesPage',
  'site-expense-detail': 'ExpenseDetailPage',
  'petty-cash-requests': 'PettyCashRequestsPage',
  'petty-cash-request-create': 'PettyCashRequestCreatePage',
  'petty-cash-request-detail': 'PettyCashRequestDetailPage',
  'petty-cash-fund-transfers': 'PettyCashTransfersPage',
  grns: 'GrnsPage',
  'grn-detail': 'GrnDetailPage',
  'quality-inspections': 'QualityInspectionsPage',
  'quality-inspection-detail': 'QualityInspectionDetailPage',
  'material-issues': 'MaterialIssuesPage',
  'material-issue-detail': 'MaterialIssueDetailPage',
  'reorder-alerts': 'ReorderAlertsPage',
  'boq-versions': 'BoqVersionsPage',
  'boq-item-editor': 'BoqItemEditorPage',
  'cash-book': 'CashBookPage',
  'bank-book': 'BankBookPage',
  users: 'UsersPage',
  'user-create': 'UserCreatePage',
  'user-detail': 'UserDetailPage',
  'user-edit': 'UserEditPage',
  'company-overview': 'CompanyOverviewPage',
  'company-settings': 'CompanySettingsPage',
  roles: 'RolesPage',
  'role-create': 'RoleCreatePage',
  'role-detail': 'RoleDetailPage',
  'role-edit': 'RoleEditPage',
  documents: 'DocumentsPage',
  'audit-logs': 'AuditLogsPage',
  'system-health': 'SystemHealthPage',
  settings: 'SettingsPage',
  forbidden: 'ForbiddenPage',
  'no-project-access': 'NoProjectAccessPage',
  'dev-data-table': 'DataTableDemoPage',
  'dev-forms': 'FormDemoPage',
  'dev-documents': 'DocumentsDemoPage',
  'dev-workflow-timeline': 'WorkflowTimelineDemoPage',
  'dev-entity-detail': 'EntityDetailDemoPage',
  'dev-print-pdf': 'PrintPdfDemoPage',
  'dev-export': 'ExportDemoPage',
};

const MULTI_EXPORT = {
  ProjectDashboardEntryPage: 'ProjectDashboardPage',
  ProjectDashboardPage: 'ProjectDashboardPage',
  ProjectParticipantsEntryPage: 'ProjectParticipantsPage',
  ProjectParticipantsPage: 'ProjectParticipantsPage',
  ProfitShareEntryPage: 'ProfitSharePage',
  ProfitSharePage: 'ProfitSharePage',
};

const appRoutes = routes.filter((r) => r.id !== 'login');
const missing = appRoutes.filter((r) => !ELEMENT_MAP[r.id]);
if (missing.length) {
  console.error(
    'Missing element map:',
    missing.map((m) => m.id).join(', '),
  );
  process.exit(1);
}

const pageImports = new Map();
for (const name of Object.values(ELEMENT_MAP)) {
  const file = MULTI_EXPORT[name] || name;
  if (!pageImports.has(file)) pageImports.set(file, new Set());
  pageImports.get(file).add(name);
}

const importLines = [...pageImports.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([file, names]) => {
    const list = [...names].sort().join(', ');
    return `import { ${list} } from '@/pages/${file}';`;
  });

const elementEntries = appRoutes
  .map((r) => {
    const key = /[^a-zA-Z0-9_]/.test(r.id) ? `'${r.id}'` : r.id;
    return `  ${key}: <${ELEMENT_MAP[r.id]} />,`;
  })
  .join('\n');

const routeElementsSrc = `/**
 * Page elements keyed by registry route id.
 * Keep in sync with \`APP_ROUTE_REGISTRY\`.
 */
import type { ReactElement } from 'react';
import type { AppRouteId } from '@/navigation/routeRegistry';
${importLines.join('\n')}

export const APP_ROUTE_ELEMENTS: {
  [K in Exclude<AppRouteId, 'login'>]: ReactElement;
} = {
${elementEntries}
};
`;

fs.writeFileSync('apps/web/src/routes/routeElements.tsx', routeElementsSrc);

const routeBlocks = appRoutes
  .map((r) => {
    const elKey = /[^a-zA-Z0-9_]/.test(r.id)
      ? `APP_ROUTE_ELEMENTS['${r.id}']`
      : `APP_ROUTE_ELEMENTS.${r.id}`;
    const wrapDevelopmentRoute = (routeBlock) =>
      r.id.startsWith('dev-')
        ? `            {import.meta.env.DEV ? (
${routeBlock}
            ) : null}`
        : routeBlock;
    if (r.path === '/') {
      return wrapDevelopmentRoute(`            <Route element={<RegistryRouteGuard routeId="${r.id}" />}>
              <Route index element={${elKey}} />
            </Route>`);
    }
    return wrapDevelopmentRoute(`            <Route element={<RegistryRouteGuard routeId="${r.id}" />}>
              <Route
                path={toRelativeAppPath('${r.path}')}
                element={${elKey}}
              />
            </Route>`);
  })
  .join('\n\n');

const indexSrc = `import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { RegistryRouteGuard } from '@/auth/RegistryRouteGuard';
import {
  InternalAppGuard,
  InvestorAuthLayout,
  InvestorDashboardPage,
  InvestorDocumentsPage,
  InvestorLayout,
  InvestorLoginPage,
  InvestorPortalForbiddenStandalone,
  InvestorPortalGuard,
  InvestorProjectDetailPage,
  InvestorStatementsPage,
} from '@/investor-portal';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { toRelativeAppPath } from '@/navigation/routeRegistry';
import { LoginPage } from '@/pages/LoginPage';
import { APP_ROUTE_ELEMENTS } from './routeElements';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route path="/investor">
          <Route element={<InvestorPortalGuard />}>
            <Route element={<InvestorAuthLayout />}>
              <Route path="login" element={<InvestorLoginPage />} />
              <Route
                path="forbidden"
                element={<InvestorPortalForbiddenStandalone />}
              />
            </Route>
            <Route element={<InvestorLayout />}>
              <Route
                index
                element={<Navigate to="/investor/dashboard" replace />}
              />
              <Route path="dashboard" element={<InvestorDashboardPage />} />
              <Route
                path="projects/:projectId"
                element={<InvestorProjectDetailPage />}
              />
              <Route path="documents" element={<InvestorDocumentsPage />} />
              <Route path="statements" element={<InvestorStatementsPage />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<InternalAppGuard />}>
            <Route element={<AppLayout />}>
${routeBlocks}
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
`;

fs.writeFileSync('apps/web/src/routes/index.tsx', indexSrc);
console.log(
  `Wrote routeElements.tsx + index.tsx (${appRoutes.length} app routes)`,
);
