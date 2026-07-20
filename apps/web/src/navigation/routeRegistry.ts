import type { PermissionCode } from './permissionCatalog';

/** Icon keys resolved in the Sidebar. */
export type NavIconId =
  | 'dashboard'
  | 'projects'
  | 'dpr'
  | 'users'
  | 'settings'
  | 'notifications'
  | 'approvals'
  | 'documents'
  | 'audit'
  | 'finance'
  | 'purchase'
  | 'stock'
  | 'sales'
  | 'reports'
  | 'company';

export type ProjectScopeMode = 'none' | 'required';

export type AppLayoutKind = 'auth' | 'app';

export type NavGroupId =
  | 'overview'
  | 'approvals'
  | 'projects-site'
  | 'project-control'
  | 'procurement'
  | 'capital-investment'
  | 'accounting'
  | 'reports'
  | 'petty-cash'
  | 'inventory'
  | 'organisation'
  | 'administration'
  | 'system';

/**
 * Central route metadata (Micro Phase 012).
 * Navigation visibility and route guards both read from this registry.
 */
export type AppRouteDefinition = {
  id: string;
  /** Absolute path, e.g. `/users` or `/`. */
  path: string;
  title: string;
  layout: AppLayoutKind;
  /** When true, include in the sidebar (if groupId set and access allows). */
  showInNav: boolean;
  groupId?: NavGroupId;
  icon?: NavIconId;
  /** Require any of these catalog permissions (from `GET /rbac/me/permissions`). */
  anyOf?: readonly PermissionCode[];
  /** Require all of these catalog permissions. */
  allOf?: readonly PermissionCode[];
  /**
   * `required` → wrap with `ProjectRequiredRoute` (active project + workflow).
   * Hiding nav is not enough; URL access is blocked by the same flag.
   */
  projectScope: ProjectScopeMode;
  /** Exact match for index routes. */
  end?: boolean;
  /** Breadcrumb segment overrides keyed by path segment. */
  breadcrumbSegment?: string;
};

export type NavGroupMeta = {
  id: NavGroupId;
  label: string;
};

export const NAV_GROUP_META: readonly NavGroupMeta[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'projects-site', label: 'Projects & site' },
  { id: 'project-control', label: 'Project Control' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'capital-investment', label: 'Capital & Investment' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'reports', label: 'Accounting reports' },
  { id: 'petty-cash', label: 'Petty Cash' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'organisation', label: 'Organisation' },
  { id: 'administration', label: 'Administration' },
  { id: 'system', label: 'System' },
] as const;

export class DuplicateRoutePathError extends Error {
  constructor(path: string) {
    super(`Duplicate route path in navigation registry: ${path}`);
    this.name = 'DuplicateRoutePathError';
  }
}

export function assertUniqueRoutePaths(
  routes: readonly AppRouteDefinition[],
): void {
  const seen = new Set<string>();
  for (const route of routes) {
    if (seen.has(route.path)) {
      throw new DuplicateRoutePathError(route.path);
    }
    seen.add(route.path);
  }
}

export function defineRouteRegistry<
  const T extends readonly AppRouteDefinition[],
>(routes: T): T {
  assertUniqueRoutePaths(routes);
  return routes;
}

/**
 * All web routes — existing and placeholders for future modules.
 * Add new portal pages here first; wire the element in `routeElements.tsx`
 * and `AppRouter`.
 */
const APP_ROUTES = [
  {
    id: 'login',
    path: '/login',
    title: 'Sign in',
    layout: 'auth',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dashboard',
    path: '/',
    title: 'Dashboard',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'dashboard',
    projectScope: 'none',
    end: true,
  },
  {
    id: 'director-command-centre',
    path: '/dashboard/director',
    title: 'Director Command Centre',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'reports',
    anyOf: ['dashboard.view'],
    projectScope: 'none',
    breadcrumbSegment: 'director',
  },
  {
    id: 'finance-dashboard',
    path: '/dashboard/finance',
    title: 'Finance',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'finance',
    anyOf: ['dashboard.view'],
    projectScope: 'none',
    breadcrumbSegment: 'finance',
  },
  {
    id: 'site-operations-dashboard',
    path: '/dashboard/site',
    title: 'Site Operations',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'dpr',
    anyOf: ['dashboard.view'],
    projectScope: 'required',
    breadcrumbSegment: 'site',
  },
  {
    id: 'purchase-dashboard',
    path: '/dashboard/purchase',
    title: 'Purchase',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'purchase',
    anyOf: ['dashboard.view'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase',
  },
  {
    id: 'notifications',
    path: '/notifications',
    title: 'Notifications',
    layout: 'app',
    showInNav: true,
    groupId: 'overview',
    icon: 'notifications',
    anyOf: ['notification.view'],
    projectScope: 'none',
  },
  {
    id: 'approvals',
    path: '/approvals',
    title: 'Pending',
    layout: 'app',
    showInNav: true,
    groupId: 'approvals',
    icon: 'approvals',
    anyOf: ['approval.view'],
    projectScope: 'required',
  },
  {
    id: 'projects',
    path: '/projects',
    title: 'Projects',
    layout: 'app',
    showInNav: true,
    groupId: 'projects-site',
    icon: 'projects',
    anyOf: ['project.view'],
    projectScope: 'none',
  },
  {
    id: 'project-dashboard',
    path: '/projects/dashboard',
    title: 'Project Dashboard',
    layout: 'app',
    showInNav: true,
    groupId: 'projects-site',
    icon: 'reports',
    anyOf: ['dashboard.view'],
    projectScope: 'required',
    breadcrumbSegment: 'dashboard',
  },
  {
    id: 'project-dashboard-detail',
    path: '/projects/:projectId/dashboard',
    title: 'Project Dashboard',
    layout: 'app',
    showInNav: false,
    anyOf: ['dashboard.view'],
    projectScope: 'required',
    breadcrumbSegment: 'dashboard',
  },
  {
    id: 'project-participants',
    path: '/projects/participants',
    title: 'Participants',
    layout: 'app',
    showInNav: true,
    groupId: 'projects-site',
    icon: 'finance',
    anyOf: ['project_participant.view'],
    projectScope: 'required',
    breadcrumbSegment: 'participants',
  },
  {
    id: 'project-participants-detail',
    path: '/projects/:projectId/participants',
    title: 'Participants',
    layout: 'app',
    showInNav: false,
    anyOf: ['project_participant.view'],
    projectScope: 'required',
    breadcrumbSegment: 'participants',
  },
  {
    id: 'profit-share',
    path: '/projects/profit-share',
    title: 'Profit Share',
    layout: 'app',
    showInNav: true,
    groupId: 'projects-site',
    icon: 'finance',
    anyOf: ['project_participant.view'],
    projectScope: 'required',
    breadcrumbSegment: 'profit-share',
  },
  {
    id: 'profit-share-detail',
    path: '/projects/:projectId/profit-share',
    title: 'Profit Share',
    layout: 'app',
    showInNav: false,
    anyOf: ['project_participant.view'],
    projectScope: 'required',
    breadcrumbSegment: 'profit-share',
  },
  {
    id: 'daily-progress',
    path: '/project-control/dpr',
    title: 'Daily progress',
    layout: 'app',
    showInNav: true,
    groupId: 'project-control',
    icon: 'dpr',
    anyOf: ['dpr.view'],
    projectScope: 'required',
    breadcrumbSegment: 'dpr',
  },
  {
    id: 'daily-progress-detail',
    path: '/project-control/dpr/:id',
    title: 'Daily progress report',
    layout: 'app',
    showInNav: false,
    anyOf: ['dpr.view'],
    projectScope: 'required',
    breadcrumbSegment: 'detail',
  },
  {
    id: 'daily-progress-legacy',
    path: '/daily-progress-reports',
    title: 'Daily progress',
    layout: 'app',
    showInNav: false,
    anyOf: ['dpr.view'],
    projectScope: 'required',
    breadcrumbSegment: 'daily-progress-reports',
  },
  {
    id: 'boq',
    path: '/project-control/boq',
    title: 'BOQ',
    layout: 'app',
    showInNav: true,
    groupId: 'project-control',
    icon: 'projects',
    anyOf: ['boq.view'],
    projectScope: 'required',
    breadcrumbSegment: 'boq',
  },
  {
    id: 'boq-import',
    path: '/project-control/boq/import',
    title: 'Import BOQ',
    layout: 'app',
    showInNav: false,
    anyOf: ['boq.manage'],
    projectScope: 'required',
    breadcrumbSegment: 'boq',
  },
  {
    id: 'vendors',
    path: '/vendors',
    title: 'Vendors',
    layout: 'app',
    showInNav: false,
    anyOf: ['vendor.view'],
    projectScope: 'none',
  },
  {
    id: 'contractors',
    path: '/contractors',
    title: 'Contractors',
    layout: 'app',
    showInNav: false,
    anyOf: ['contractor.view'],
    projectScope: 'none',
  },
  {
    id: 'customers',
    path: '/customers',
    title: 'Customers',
    layout: 'app',
    showInNav: false,
    anyOf: ['customer.view'],
    projectScope: 'none',
  },
  {
    id: 'purchase-orders',
    path: '/procurement/purchase-orders',
    title: 'Purchase Orders',
    layout: 'app',
    showInNav: true,
    groupId: 'procurement',
    icon: 'purchase',
    anyOf: ['purchase.view'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-orders',
  },
  {
    id: 'purchase-order-create',
    path: '/procurement/purchase-orders/new',
    title: 'New Purchase Order',
    layout: 'app',
    showInNav: false,
    anyOf: ['purchase.order'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-orders',
  },
  {
    id: 'purchase-order-detail',
    path: '/procurement/purchase-orders/:purchaseOrderId',
    title: 'Purchase Order',
    layout: 'app',
    showInNav: false,
    anyOf: ['purchase.view'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-orders',
  },
  {
    id: 'purchase-requests',
    path: '/procurement/purchase-requests',
    title: 'Purchase Requests',
    layout: 'app',
    showInNav: true,
    groupId: 'procurement',
    icon: 'purchase',
    anyOf: ['purchase.view'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-requests',
  },
  {
    id: 'purchase-request-create',
    path: '/procurement/purchase-requests/new',
    title: 'New Purchase Request',
    layout: 'app',
    showInNav: false,
    anyOf: ['purchase.request'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-requests',
  },
  {
    id: 'purchase-request-detail',
    path: '/procurement/purchase-requests/:requestId',
    title: 'Purchase Request',
    layout: 'app',
    showInNav: false,
    anyOf: ['purchase.view'],
    projectScope: 'required',
    breadcrumbSegment: 'purchase-requests',
  },
  {
    id: 'quotations',
    path: '/procurement/quotations',
    title: 'Quotations',
    layout: 'app',
    showInNav: true,
    groupId: 'procurement',
    icon: 'purchase',
    anyOf: ['quotation.view'],
    projectScope: 'required',
    breadcrumbSegment: 'quotations',
  },
  {
    id: 'quotation-comparison',
    path: '/procurement/quotation-comparisons/:prId',
    title: 'Quotation Comparison',
    layout: 'app',
    showInNav: false,
    anyOf: ['quotation.compare'],
    projectScope: 'required',
    breadcrumbSegment: 'quotation-comparisons',
  },
  {
    id: 'stock-balances',
    path: '/inventory/stock-balances',
    title: 'Stock Balances',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'stock-balances',
  },
  {
    id: 'stock-ledger',
    path: '/inventory/stock-ledger',
    title: 'Stock Ledger',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'stock-ledger',
  },
  {
    id: 'stock-counts',
    path: '/inventory/stock-counts',
    title: 'Stock Counts',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'stock-counts',
  },
  {
    id: 'stock-count-detail',
    path: '/inventory/stock-counts/:countId',
    title: 'Stock Count',
    layout: 'app',
    showInNav: false,
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'stock-counts',
  },
  {
    id: 'bookings',
    path: '/bookings',
    title: 'Bookings',
    layout: 'app',
    showInNav: false,
    anyOf: ['booking.view'],
    projectScope: 'none',
  },
  {
    id: 'directors',
    path: '/capital/directors',
    title: 'Directors',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'company',
    anyOf: ['director.view'],
    projectScope: 'none',
    breadcrumbSegment: 'directors',
  },
  {
    id: 'director-detail',
    path: '/capital/directors/:directorId',
    title: 'Director',
    layout: 'app',
    showInNav: false,
    anyOf: ['director.view'],
    projectScope: 'none',
    breadcrumbSegment: 'directors',
  },
  {
    id: 'shareholding',
    path: '/capital/shareholding',
    title: 'Shareholding',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'finance',
    anyOf: ['shareholding.view'],
    projectScope: 'none',
    breadcrumbSegment: 'shareholding',
  },
  {
    id: 'investors',
    path: '/capital/investors',
    title: 'Investors',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'finance',
    anyOf: ['investor.view'],
    projectScope: 'none',
    breadcrumbSegment: 'investors',
  },
  {
    id: 'funding-dashboard',
    path: '/capital/funding-dashboard',
    title: 'Funding Dashboard',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'finance',
    anyOf: ['dashboard.view'],
    projectScope: 'required',
    breadcrumbSegment: 'funding-dashboard',
  },
  {
    id: 'commitments',
    path: '/capital/commitments',
    title: 'Commitments',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'finance',
    anyOf: ['contribution_commitment.view'],
    projectScope: 'required',
    breadcrumbSegment: 'commitments',
  },
  {
    id: 'contribution-receipts',
    path: '/capital/contribution-receipts',
    title: 'Contribution Receipts',
    layout: 'app',
    showInNav: true,
    groupId: 'capital-investment',
    icon: 'finance',
    anyOf: ['contribution_receipt.view'],
    projectScope: 'required',
    breadcrumbSegment: 'contribution-receipts',
  },
  {
    id: 'commitment-detail',
    path: '/capital/commitments/:commitmentId',
    title: 'Commitment',
    layout: 'app',
    showInNav: false,
    anyOf: ['contribution_commitment.view'],
    projectScope: 'required',
    breadcrumbSegment: 'commitments',
  },
  {
    id: 'investor-detail',
    path: '/capital/investors/:investorId',
    title: 'Investor',
    layout: 'app',
    showInNav: false,
    anyOf: ['investor.view'],
    projectScope: 'none',
    breadcrumbSegment: 'investors',
  },
  {
    id: 'chart-of-accounts',
    path: '/accounting/chart-of-accounts',
    title: 'Chart of Accounts',
    layout: 'app',
    showInNav: true,
    groupId: 'accounting',
    icon: 'finance',
    anyOf: ['account.view'],
    projectScope: 'none',
    breadcrumbSegment: 'chart-of-accounts',
  },
  {
    id: 'account-create',
    path: '/accounting/chart-of-accounts/new',
    title: 'New account',
    layout: 'app',
    showInNav: false,
    anyOf: ['account.manage'],
    projectScope: 'none',
    breadcrumbSegment: 'chart-of-accounts',
  },
  {
    id: 'account-edit',
    path: '/accounting/chart-of-accounts/:accountId/edit',
    title: 'Edit account',
    layout: 'app',
    showInNav: false,
    anyOf: ['account.view'],
    projectScope: 'none',
    breadcrumbSegment: 'chart-of-accounts',
  },
  {
    id: 'journals',
    path: '/accounting/journals',
    title: 'Journals',
    layout: 'app',
    showInNav: true,
    groupId: 'accounting',
    icon: 'finance',
    anyOf: ['journal.view'],
    projectScope: 'none',
    breadcrumbSegment: 'journals',
  },
  {
    id: 'journal-create',
    path: '/accounting/journals/new',
    title: 'New Journal',
    layout: 'app',
    showInNav: true,
    groupId: 'accounting',
    icon: 'finance',
    anyOf: ['journal.create'],
    projectScope: 'none',
    breadcrumbSegment: 'journals',
  },
  {
    id: 'journal-detail',
    path: '/accounting/journals/:journalId',
    title: 'Journal',
    layout: 'app',
    showInNav: false,
    anyOf: ['journal.view'],
    projectScope: 'none',
    breadcrumbSegment: 'journals',
  },
  {
    id: 'cash-accounts',
    path: '/accounting/cash-accounts',
    title: 'Cash & Petty Cash',
    layout: 'app',
    showInNav: true,
    groupId: 'accounting',
    icon: 'finance',
    anyOf: ['cash.view'],
    projectScope: 'required',
    breadcrumbSegment: 'cash-accounts',
  },
  {
    id: 'bank-accounts',
    path: '/accounting/bank-accounts',
    title: 'Bank Accounts',
    layout: 'app',
    showInNav: true,
    groupId: 'accounting',
    icon: 'finance',
    anyOf: ['bank.view'],
    projectScope: 'none',
    breadcrumbSegment: 'bank-accounts',
  },
  {
    id: 'bank-account-detail',
    path: '/accounting/bank-accounts/:bankAccountId',
    title: 'Bank Account',
    layout: 'app',
    showInNav: false,
    anyOf: ['bank.view'],
    projectScope: 'none',
    breadcrumbSegment: 'bank-accounts',
  },
  {
    id: 'petty-cash-requests',
    path: '/accounting/petty-cash/requests',
    title: 'Fund Requests',
    layout: 'app',
    showInNav: true,
    groupId: 'petty-cash',
    icon: 'finance',
    anyOf: ['petty_cash.view'],
    projectScope: 'required',
    breadcrumbSegment: 'requests',
  },
  {
    id: 'petty-cash-request-create',
    path: '/accounting/petty-cash/requests/new',
    title: 'New Petty Cash Request',
    layout: 'app',
    showInNav: false,
    anyOf: ['petty_cash.request'],
    projectScope: 'required',
    breadcrumbSegment: 'requests',
  },
  {
    id: 'petty-cash-request-detail',
    path: '/accounting/petty-cash/requests/:requestId',
    title: 'Petty Cash Request',
    layout: 'app',
    showInNav: false,
    anyOf: ['petty_cash.view'],
    projectScope: 'required',
    breadcrumbSegment: 'requests',
  },
  {
    id: 'petty-cash-fund-transfers',
    path: '/accounting/petty-cash/transfers',
    title: 'Fund Transfers',
    layout: 'app',
    showInNav: true,
    groupId: 'petty-cash',
    icon: 'finance',
    anyOf: ['petty_cash.view'],
    projectScope: 'required',
    breadcrumbSegment: 'transfers',
  },
  {
    id: 'grns',
    path: '/inventory/grns',
    title: 'Goods Receipts',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['grn.create'],
    projectScope: 'required',
    breadcrumbSegment: 'grns',
  },
  {
    id: 'grn-detail',
    path: '/inventory/grns/:grnId',
    title: 'Goods Receipt',
    layout: 'app',
    showInNav: false,
    anyOf: ['grn.create'],
    projectScope: 'required',
    breadcrumbSegment: 'grns',
  },
  {
    id: 'quality-inspections',
    path: '/inventory/quality-inspections',
    title: 'Quality Inspections',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['quality.view'],
    projectScope: 'required',
    breadcrumbSegment: 'quality-inspections',
  },
  {
    id: 'quality-inspection-detail',
    path: '/inventory/quality-inspections/:inspectionId',
    title: 'Quality Inspection',
    layout: 'app',
    showInNav: false,
    anyOf: ['quality.view'],
    projectScope: 'required',
    breadcrumbSegment: 'quality-inspections',
  },
  {
    id: 'material-issues',
    path: '/inventory/material-issues',
    title: 'Material Issues',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'material-issues',
  },
  {
    id: 'material-issue-detail',
    path: '/inventory/material-issues/:issueId',
    title: 'Material Issue',
    layout: 'app',
    showInNav: false,
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'material-issues',
  },
  {
    id: 'reorder-alerts',
    path: '/inventory/reorder-alerts',
    title: 'Reorder Alerts',
    layout: 'app',
    showInNav: true,
    groupId: 'inventory',
    icon: 'stock',
    anyOf: ['stock.view'],
    projectScope: 'required',
    breadcrumbSegment: 'reorder-alerts',
  },
  {
    id: 'boq-versions',
    path: '/project-control/boq/versions',
    title: 'BOQ Versions',
    layout: 'app',
    showInNav: true,
    groupId: 'project-control',
    icon: 'projects',
    anyOf: ['boq.view'],
    projectScope: 'required',
    breadcrumbSegment: 'versions',
  },
  {
    id: 'boq-item-editor',
    path: '/project-control/boq/items/:id',
    title: 'BOQ Item',
    layout: 'app',
    showInNav: false,
    anyOf: ['boq.view'],
    projectScope: 'required',
    breadcrumbSegment: 'items',
  },
  {
    id: 'cash-book',
    path: '/reports/accounting/cash-book',
    title: 'Cash Book',
    layout: 'app',
    showInNav: true,
    groupId: 'reports',
    icon: 'reports',
    anyOf: ['report.view'],
    projectScope: 'none',
    breadcrumbSegment: 'cash-book',
  },
  {
    id: 'bank-book',
    path: '/reports/accounting/bank-book',
    title: 'Bank Book',
    layout: 'app',
    showInNav: true,
    groupId: 'reports',
    icon: 'reports',
    anyOf: ['report.view'],
    projectScope: 'none',
    breadcrumbSegment: 'bank-book',
  },
  {
    id: 'users',
    path: '/users',
    title: 'Users',
    layout: 'app',
    showInNav: true,
    groupId: 'organisation',
    icon: 'users',
    anyOf: ['user.view'],
    projectScope: 'none',
  },
  {
    id: 'documents',
    path: '/documents',
    title: 'Documents',
    layout: 'app',
    showInNav: true,
    groupId: 'administration',
    icon: 'documents',
    anyOf: ['document.view'],
    projectScope: 'none',
  },
  {
    id: 'audit-logs',
    path: '/administration/audit-logs',
    title: 'Audit Logs',
    layout: 'app',
    showInNav: true,
    groupId: 'administration',
    icon: 'audit',
    anyOf: ['audit.view'],
    projectScope: 'none',
    breadcrumbSegment: 'audit-logs',
  },
  {
    id: 'settings',
    path: '/settings',
    title: 'Settings',
    layout: 'app',
    showInNav: true,
    groupId: 'system',
    icon: 'settings',
    projectScope: 'none',
  },
  {
    id: 'forbidden',
    path: '/forbidden',
    title: 'Access denied',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'no-project-access',
    path: '/no-project-access',
    title: 'No project access',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-data-table',
    path: '/dev/data-table',
    title: 'DataTable demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-forms',
    path: '/dev/forms',
    title: 'Forms demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-documents',
    path: '/dev/documents',
    title: 'Documents demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-workflow-timeline',
    path: '/dev/workflow-timeline',
    title: 'Workflow timeline demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-entity-detail',
    path: '/dev/entity-detail',
    title: 'Entity detail demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-print-pdf',
    path: '/dev/print-pdf',
    title: 'Print / PDF demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
  {
    id: 'dev-export',
    path: '/dev/export',
    title: 'Export demo',
    layout: 'app',
    showInNav: false,
    projectScope: 'none',
  },
] as const satisfies readonly AppRouteDefinition[];

export const APP_ROUTE_REGISTRY: readonly AppRouteDefinition[] =
  defineRouteRegistry(APP_ROUTES);

export type AppRouteId = (typeof APP_ROUTES)[number]['id'];

export type NavItemConfig = {
  id: string;
  label: string;
  to: string;
  anyOf?: readonly PermissionCode[];
  allOf?: readonly PermissionCode[];
  end?: boolean;
  icon: NavIconId;
  projectScope: ProjectScopeMode;
};

export type NavGroupConfig = {
  id: NavGroupId;
  label: string;
  items: readonly NavItemConfig[];
};

function toNavItem(route: AppRouteDefinition): NavItemConfig {
  if (!route.icon) {
    throw new Error(`Nav route ${route.id} is missing icon`);
  }
  return {
    id: route.id,
    label: route.title,
    to: route.path,
    anyOf: route.anyOf,
    allOf: route.allOf,
    end: route.end,
    icon: route.icon,
    projectScope: route.projectScope,
  };
}

/** Sidebar groups derived from the registry (permission filter applied later). */
export function buildNavGroupsFromRegistry(
  routes: readonly AppRouteDefinition[] = APP_ROUTE_REGISTRY,
): NavGroupConfig[] {
  return NAV_GROUP_META.map((group) => ({
    id: group.id,
    label: group.label,
    items: routes
      .filter(
        (route) =>
          route.layout === 'app' &&
          route.showInNav &&
          route.groupId === group.id,
      )
      .map(toNavItem),
  })).filter((group) => group.items.length > 0);
}

export const NAV_GROUPS = buildNavGroupsFromRegistry();

export function getRouteById(
  id: string,
): AppRouteDefinition | undefined {
  return APP_ROUTE_REGISTRY.find((route) => route.id === id);
}

export function requireRouteById(id: AppRouteId): AppRouteDefinition {
  const route = getRouteById(id);
  if (!route) {
    throw new Error(`Unknown route id: ${id}`);
  }
  return route;
}

/** Normalise pathname for matching (`/projects/` → `/projects`). */
export function normalisePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || '/';
}

/** Match `/projects/:projectId/dashboard` style registry paths. */
export function pathMatchesPattern(
  pattern: string,
  pathname: string,
): boolean {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) {
    return false;
  }
  return patternParts.every(
    (part, index) => part.startsWith(':') || part === pathParts[index],
  );
}

export function findRouteByPathname(
  pathname: string,
): AppRouteDefinition | undefined {
  const normalised = normalisePathname(pathname);

  const exact = APP_ROUTE_REGISTRY.find((route) => route.path === normalised);
  if (exact) {
    return exact;
  }

  const paramMatch = APP_ROUTE_REGISTRY.filter((route) =>
    route.path.includes(':')
      ? pathMatchesPattern(route.path, normalised)
      : false,
  ).sort((a, b) => b.path.length - a.path.length)[0];
  if (paramMatch) {
    return paramMatch;
  }

  // Longest prefix match for nested future routes (skip param patterns)
  const candidates = APP_ROUTE_REGISTRY.filter(
    (route) =>
      route.path !== '/' &&
      !route.end &&
      !route.path.includes(':') &&
      (normalised === route.path || normalised.startsWith(`${route.path}/`)),
  ).sort((a, b) => b.path.length - a.path.length);

  return candidates[0];
}

/** React Router path relative to AppLayout (no leading slash). */
export function toRelativeAppPath(absolutePath: string): string {
  if (absolutePath === '/') {
    return '';
  }
  return absolutePath.replace(/^\//, '');
}

export const ROUTE_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    APP_ROUTE_REGISTRY.flatMap((route) => {
      const entries: Array<[string, string]> = [];
      if (route.path === '/') {
        entries.push(['', route.title]);
      } else {
        const segments = route.path.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (last) {
          entries.push([last, route.title]);
        }
        if (route.breadcrumbSegment) {
          entries.push([route.breadcrumbSegment, route.title]);
        }
      }
      return entries;
    }),
  ),
  /** Parent crumb for `/dashboard/director`. */
  dashboard: 'Dashboard',
  /** Parent crumb for `/administration/audit-logs`. */
  administration: 'Administration',
  /** Parent crumb for `/capital/*`. */
  capital: 'Capital & Investment',
  /** Parent crumb for `/accounting/*`. */
  accounting: 'Accounting',
  /** Parent crumb for `/accounting/petty-cash/*`. */
  'petty-cash': 'Petty Cash',
  /** Parent crumb for `/inventory/*`. */
  inventory: 'Inventory',
  /** Parent crumb for `/project-control/*`. */
  'project-control': 'Project Control',
  boq: 'BOQ',
  dpr: 'Daily progress',
};

export function getRouteLabel(segment: string): string {
  return ROUTE_LABELS[segment] ?? segment;
}

export function getPageTitle(pathname: string): string {
  const route = findRouteByPathname(pathname);
  if (route) {
    return route.title;
  }
  const parts = normalisePathname(pathname).split('/').filter(Boolean);
  if (parts.length === 0) {
    return 'Dashboard';
  }
  return getRouteLabel(parts[parts.length - 1] ?? '');
}
