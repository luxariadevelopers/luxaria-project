import { describe, expect, it } from 'vitest';
import { filterNavGroups, getVisibleNavGroups } from './filterNav';
import { canEnterRoute, evaluateRouteAccess } from './routeAccess';
import {
  APP_ROUTE_REGISTRY,
  NAV_GROUPS,
  assertUniqueRoutePaths,
  findRouteByPathname,
  getPageTitle,
  pathMatchesPattern,
  requireRouteById,
} from './routeRegistry';
import { PERMISSIONS } from './permissionCatalog';

/** Representative role permission sets (from seeded RBAC shapes). */
const ROLES = {
  siteEngineer: {
    accessLoaded: true,
    bypassPermissions: false,
    permissions: ['project.view', 'dpr.view', 'dpr.create'] as const,
  },
  userAdmin: {
    accessLoaded: true,
    bypassPermissions: false,
    permissions: ['user.view', 'user.create'] as const,
  },
  superAdmin: {
    accessLoaded: true,
    bypassPermissions: true,
    permissions: [] as const,
  },
  pending: {
    accessLoaded: false,
    bypassPermissions: false,
    permissions: [] as const,
  },
} as const;

function visibleIds(ctx: (typeof ROLES)[keyof typeof ROLES]) {
  return getVisibleNavGroups(ctx).flatMap((g) => g.items.map((i) => i.id));
}

describe('navigation registry integrity', () => {
  it('has no duplicate paths', () => {
    expect(() => assertUniqueRoutePaths(APP_ROUTE_REGISTRY)).not.toThrow();
    const paths = APP_ROUTE_REGISTRY.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('mirrors backend permission catalog size', () => {
    expect(PERMISSIONS.length).toBe(193);
  });
});

describe('representative role visibility (nav + guard same source)', () => {
  it('site engineer sees projects/DPR and is denied users URL', () => {
    const ctx = ROLES.siteEngineer;
    const ids = visibleIds(ctx);

    expect(ids).toEqual(
      expect.arrayContaining(['dashboard', 'projects', 'daily-progress', 'settings']),
    );
    expect(ids).not.toContain('users');
    expect(ids).not.toContain('notifications');
    expect(ids).not.toContain('approvals');
    expect(ids).not.toContain('director-command-centre');
    expect(ids).not.toContain('finance-dashboard');
    expect(ids).not.toContain('cash-book');
    expect(ids).not.toContain('bank-book');

    expect(canEnterRoute(requireRouteById('projects'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('daily-progress'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('users'), ctx)).toBe(false);

    expect(requireRouteById('daily-progress').projectScope).toBe('required');
    expect(requireRouteById('daily-progress').path).toBe('/project-control/dpr');
    expect(requireRouteById('daily-progress').groupId).toBe('project-control');
  });

  it('user admin sees users and is denied project modules', () => {
    const ctx = ROLES.userAdmin;
    const ids = visibleIds(ctx);

    expect(ids).toContain('users');
    expect(ids).toContain('dashboard');
    expect(ids).not.toContain('projects');
    expect(ids).not.toContain('daily-progress');

    expect(canEnterRoute(requireRouteById('users'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('projects'), ctx)).toBe(false);
    expect(canEnterRoute(requireRouteById('daily-progress'), ctx)).toBe(false);
  });

  it('super admin bypass shows all nav modules and can enter gated routes', () => {
    const ctx = ROLES.superAdmin;
    const ids = visibleIds(ctx);

    expect(ids).toEqual(
      expect.arrayContaining([
        'dashboard',
        'director-command-centre',
        'finance-dashboard',
        'cash-book',
        'bank-book',
        'site-operations-dashboard',
        'notifications',
        'approvals',
        'projects',
        'daily-progress',
        'users',
        'documents',
        'audit-logs',
        'directors',
        'shareholding',
        'investors',
        'funding-dashboard',
        'commitments',
        'contribution-receipts',
        'chart-of-accounts',
        'journals',
        'journal-create',
        'cash-accounts',
        'bank-accounts',
        'petty-cash-requests',
        'petty-cash-fund-transfers',
        'stock-balances',
        'stock-ledger',
        'stock-counts',
        'grns',
        'quality-inspections',
        'material-issues',
        'reorder-alerts',
        'project-participants',
        'profit-share',
        'purchase-orders',
        'purchase-requests',
        'quotations',
        'settings',
      ]),
    );

    for (const id of [
      'projects',
      'daily-progress',
      'users',
      'documents',
      'audit-logs',
      'directors',
      'shareholding',
      'investors',
      'funding-dashboard',
      'commitments',
      'contribution-receipts',
      'chart-of-accounts',
      'journals',
      'journal-create',
      'cash-accounts',
      'bank-accounts',
      'bank-account-detail',
      'petty-cash-requests',
      'petty-cash-request-create',
      'petty-cash-request-detail',
      'petty-cash-fund-transfers',
      'stock-balances',
      'stock-ledger',
      'stock-counts',
      'stock-count-detail',
      'grns',
      'grn-detail',
      'quality-inspections',
      'quality-inspection-detail',
      'material-issues',
      'material-issue-detail',
      'reorder-alerts',
      'notifications',
      'approvals',
      'director-command-centre',
      'finance-dashboard',
      'site-operations-dashboard',
      'purchase-dashboard',
      'project-dashboard',
      'project-participants',
      'profit-share',
    ] as const) {
      expect(canEnterRoute(requireRouteById(id), ctx)).toBe(true);
    }

    expect(requireRouteById('approvals').projectScope).toBe('required');
    expect(requireRouteById('commitments').projectScope).toBe('required');
    expect(requireRouteById('contribution-receipts').projectScope).toBe(
      'required',
    );
  });

  it('dashboard viewer sees Director, Finance, Site Ops, Purchase, Project and Funding dashboards', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['dashboard.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('director-command-centre');
    expect(visibleIds(ctx)).toContain('finance-dashboard');
    expect(visibleIds(ctx)).toContain('site-operations-dashboard');
    expect(visibleIds(ctx)).toContain('purchase-dashboard');
    expect(visibleIds(ctx)).toContain('project-dashboard');
    expect(visibleIds(ctx)).toContain('funding-dashboard');
    expect(
      canEnterRoute(requireRouteById('director-command-centre'), ctx),
    ).toBe(true);
    expect(canEnterRoute(requireRouteById('finance-dashboard'), ctx)).toBe(
      true,
    );
    expect(
      canEnterRoute(requireRouteById('site-operations-dashboard'), ctx),
    ).toBe(true);
    expect(canEnterRoute(requireRouteById('purchase-dashboard'), ctx)).toBe(
      true,
    );
    expect(canEnterRoute(requireRouteById('funding-dashboard'), ctx)).toBe(
      true,
    );
    expect(requireRouteById('purchase-dashboard').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('purchase-dashboard').path).toBe(
      '/dashboard/purchase',
    );
    expect(requireRouteById('project-dashboard').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('project-dashboard').path).toBe(
      '/projects/dashboard',
    );
    expect(requireRouteById('funding-dashboard').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('funding-dashboard').path).toBe(
      '/capital/funding-dashboard',
    );
    expect(requireRouteById('funding-dashboard').groupId).toBe(
      'capital-investment',
    );
  });

  it('participant viewer sees Participants and Profit Share under Projects & site', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['project_participant.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('project-participants');
    expect(visibleIds(ctx)).toContain('profit-share');
    expect(canEnterRoute(requireRouteById('project-participants'), ctx)).toBe(
      true,
    );
    expect(canEnterRoute(requireRouteById('profit-share'), ctx)).toBe(true);
    expect(requireRouteById('project-participants').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('project-participants').path).toBe(
      '/projects/participants',
    );
    expect(requireRouteById('project-participants').groupId).toBe(
      'projects-site',
    );
    expect(requireRouteById('profit-share').projectScope).toBe('required');
    expect(requireRouteById('profit-share').path).toBe(
      '/projects/profit-share',
    );
    expect(requireRouteById('profit-share').groupId).toBe('projects-site');
  });

  it('approval viewer sees Approvals → Pending nav and enters the route', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['approval.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('approvals');
    expect(canEnterRoute(requireRouteById('approvals'), ctx)).toBe(true);
    expect(requireRouteById('approvals').title).toBe('Pending');
    expect(requireRouteById('approvals').groupId).toBe('approvals');
  });

  it('document viewer sees Administration → Documents and enters the route', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['document.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('documents');
    expect(canEnterRoute(requireRouteById('documents'), ctx)).toBe(true);
    expect(requireRouteById('documents').title).toBe('Documents');
    expect(requireRouteById('documents').groupId).toBe('administration');
  });

  it('audit viewer sees Administration → Audit Logs and enters the route', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['audit.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('audit-logs');
    expect(canEnterRoute(requireRouteById('audit-logs'), ctx)).toBe(true);
    expect(requireRouteById('audit-logs').title).toBe('Audit Logs');
    expect(requireRouteById('audit-logs').path).toBe(
      '/administration/audit-logs',
    );
    expect(requireRouteById('audit-logs').groupId).toBe('administration');
  });

  it('director viewer sees Capital & Investment → Directors', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['director.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('directors');
    expect(canEnterRoute(requireRouteById('directors'), ctx)).toBe(true);
    expect(requireRouteById('directors').path).toBe('/capital/directors');
    expect(requireRouteById('directors').groupId).toBe('capital-investment');
    expect(canEnterRoute(requireRouteById('director-detail'), ctx)).toBe(true);
  });

  it('shareholding viewer sees Capital & Investment → Shareholding', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['shareholding.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('shareholding');
    expect(canEnterRoute(requireRouteById('shareholding'), ctx)).toBe(true);
    expect(requireRouteById('shareholding').path).toBe('/capital/shareholding');
    expect(requireRouteById('shareholding').groupId).toBe(
      'capital-investment',
    );
    expect(requireRouteById('shareholding').projectScope).toBe('none');
    expect(visibleIds(ctx)).not.toContain('directors');
  });

  it('investor viewer sees Capital & Investment → Investors', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['investor.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('investors');
    expect(canEnterRoute(requireRouteById('investors'), ctx)).toBe(true);
    expect(requireRouteById('investors').path).toBe('/capital/investors');
    expect(requireRouteById('investors').groupId).toBe('capital-investment');
    expect(canEnterRoute(requireRouteById('investor-detail'), ctx)).toBe(true);
    expect(requireRouteById('investor-detail').path).toBe(
      '/capital/investors/:investorId',
    );
  });

  it('denies investor detail without investor.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['director.view'] as const,
    };
    expect(canEnterRoute(requireRouteById('investor-detail'), ctx)).toBe(
      false,
    );
    expect(visibleIds(ctx)).not.toContain('investors');
  });

  it('commitment viewer sees Capital & Investment → Commitments', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['contribution_commitment.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('commitments');
    expect(canEnterRoute(requireRouteById('commitments'), ctx)).toBe(true);
    expect(requireRouteById('commitments').path).toBe('/capital/commitments');
    expect(requireRouteById('commitments').groupId).toBe(
      'capital-investment',
    );
    expect(requireRouteById('commitments').projectScope).toBe('required');
  });

  it('denies commitments without contribution_commitment.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['commitment.view'] as const,
    };
    expect(canEnterRoute(requireRouteById('commitments'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('commitments');
  });

  it('receipt viewer sees Capital & Investment → Contribution Receipts', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['contribution_receipt.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('contribution-receipts');
    expect(
      canEnterRoute(requireRouteById('contribution-receipts'), ctx),
    ).toBe(true);
    expect(requireRouteById('contribution-receipts').path).toBe(
      '/capital/contribution-receipts',
    );
    expect(requireRouteById('contribution-receipts').groupId).toBe(
      'capital-investment',
    );
    expect(requireRouteById('contribution-receipts').projectScope).toBe(
      'required',
    );
  });

  it('denies contribution receipts without contribution_receipt.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['receipt.view'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('contribution-receipts'), ctx),
    ).toBe(false);
    expect(visibleIds(ctx)).not.toContain('contribution-receipts');
  });

  it('account viewer sees Accounting → Chart of Accounts', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['account.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('chart-of-accounts');
    expect(canEnterRoute(requireRouteById('chart-of-accounts'), ctx)).toBe(
      true,
    );
    expect(requireRouteById('chart-of-accounts').path).toBe(
      '/accounting/chart-of-accounts',
    );
    expect(requireRouteById('chart-of-accounts').groupId).toBe('accounting');
    expect(requireRouteById('chart-of-accounts').projectScope).toBe('none');
    expect(canEnterRoute(requireRouteById('account-edit'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('account-create'), ctx)).toBe(
      false,
    );
  });

  it('account manager can enter create form; viewer cannot', () => {
    const manager = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['account.manage'] as const,
    };
    expect(canEnterRoute(requireRouteById('account-create'), manager)).toBe(
      true,
    );
    expect(requireRouteById('account-create').path).toBe(
      '/accounting/chart-of-accounts/new',
    );
    expect(requireRouteById('account-edit').path).toBe(
      '/accounting/chart-of-accounts/:accountId/edit',
    );
  });

  it('denies chart of accounts without account.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['account.manage'] as const,
    };
    expect(canEnterRoute(requireRouteById('chart-of-accounts'), ctx)).toBe(
      false,
    );
    expect(visibleIds(ctx)).not.toContain('chart-of-accounts');
  });

  it('journal viewer sees Accounting → Journals and enters detail', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['journal.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('journals');
    expect(canEnterRoute(requireRouteById('journals'), ctx)).toBe(true);
    expect(requireRouteById('journals').path).toBe('/accounting/journals');
    expect(requireRouteById('journals').groupId).toBe('accounting');
    expect(requireRouteById('journals').projectScope).toBe('none');
    expect(canEnterRoute(requireRouteById('journal-detail'), ctx)).toBe(true);
    expect(requireRouteById('journal-detail').path).toBe(
      '/accounting/journals/:journalId',
    );
    expect(visibleIds(ctx)).not.toContain('journal-detail');
    expect(visibleIds(ctx)).not.toContain('journal-create');
    expect(canEnterRoute(requireRouteById('journal-create'), ctx)).toBe(
      false,
    );
  });

  it('journal creator sees Accounting → New Journal', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['journal.create'] as const,
    };
    expect(visibleIds(ctx)).toContain('journal-create');
    expect(canEnterRoute(requireRouteById('journal-create'), ctx)).toBe(true);
    expect(requireRouteById('journal-create').path).toBe(
      '/accounting/journals/new',
    );
    expect(requireRouteById('journal-create').groupId).toBe('accounting');
    expect(requireRouteById('journal-create').title).toBe('New Journal');
  });

  it('cash viewer sees Accounting → Cash & Petty Cash', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['cash.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('cash-accounts');
    expect(canEnterRoute(requireRouteById('cash-accounts'), ctx)).toBe(true);
    expect(requireRouteById('cash-accounts').path).toBe(
      '/accounting/cash-accounts',
    );
    expect(requireRouteById('cash-accounts').groupId).toBe('accounting');
    expect(requireRouteById('cash-accounts').projectScope).toBe('required');
    expect(requireRouteById('cash-accounts').title).toBe('Cash & Petty Cash');
  });

  it('denies cash accounts without cash.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['cash.manage'] as const,
    };
    expect(canEnterRoute(requireRouteById('cash-accounts'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('cash-accounts');
  });

  it('bank viewer sees Accounting → Bank Accounts', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['bank.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('bank-accounts');
    expect(canEnterRoute(requireRouteById('bank-accounts'), ctx)).toBe(true);
    expect(requireRouteById('bank-accounts').path).toBe(
      '/accounting/bank-accounts',
    );
    expect(requireRouteById('bank-accounts').groupId).toBe('accounting');
    expect(requireRouteById('bank-accounts').projectScope).toBe('none');
    expect(requireRouteById('bank-accounts').title).toBe('Bank Accounts');
    expect(canEnterRoute(requireRouteById('bank-account-detail'), ctx)).toBe(
      true,
    );
    expect(visibleIds(ctx)).not.toContain('bank-account-detail');
  });

  it('denies bank accounts without bank.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['bank.manage'] as const,
    };
    expect(canEnterRoute(requireRouteById('bank-accounts'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('bank-accounts');
  });

  it('petty-cash viewer sees Petty Cash → Fund Requests', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['petty_cash.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('petty-cash-requests');
    expect(canEnterRoute(requireRouteById('petty-cash-requests'), ctx)).toBe(
      true,
    );
    expect(requireRouteById('petty-cash-requests').path).toBe(
      '/accounting/petty-cash/requests',
    );
    expect(requireRouteById('petty-cash-requests').groupId).toBe('petty-cash');
    expect(requireRouteById('petty-cash-requests').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('petty-cash-requests').title).toBe('Fund Requests');
    expect(
      canEnterRoute(requireRouteById('petty-cash-request-detail'), ctx),
    ).toBe(true);
    expect(visibleIds(ctx)).not.toContain('petty-cash-request-detail');
    expect(visibleIds(ctx)).not.toContain('petty-cash-request-create');
    expect(
      canEnterRoute(requireRouteById('petty-cash-request-create'), ctx),
    ).toBe(false);
  });

  it('stock viewer sees Inventory → Stock Balances', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['stock.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('stock-balances');
    expect(canEnterRoute(requireRouteById('stock-balances'), ctx)).toBe(true);
    expect(requireRouteById('stock-balances').path).toBe(
      '/inventory/stock-balances',
    );
    expect(requireRouteById('stock-balances').groupId).toBe('inventory');
    expect(requireRouteById('stock-balances').projectScope).toBe('required');
    expect(requireRouteById('stock-balances').title).toBe('Stock Balances');
  });

  it('denies stock balances without stock.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['stock.adjust'] as const,
    };
    expect(canEnterRoute(requireRouteById('stock-balances'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('stock-balances');
  });

  it('stock viewer sees Inventory → Stock Ledger, Stock Counts, Material Issues, Reorder Alerts', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['stock.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('stock-ledger');
    expect(visibleIds(ctx)).toContain('stock-counts');
    expect(visibleIds(ctx)).toContain('material-issues');
    expect(visibleIds(ctx)).toContain('reorder-alerts');
    expect(canEnterRoute(requireRouteById('stock-ledger'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('stock-counts'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('stock-count-detail'), ctx)).toBe(
      true,
    );
    expect(canEnterRoute(requireRouteById('material-issues'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('material-issue-detail'), ctx)).toBe(
      true,
    );
    expect(canEnterRoute(requireRouteById('reorder-alerts'), ctx)).toBe(true);
    expect(requireRouteById('stock-ledger').path).toBe(
      '/inventory/stock-ledger',
    );
    expect(requireRouteById('stock-ledger').groupId).toBe('inventory');
    expect(requireRouteById('stock-ledger').projectScope).toBe('required');
    expect(requireRouteById('stock-ledger').title).toBe('Stock Ledger');
    expect(requireRouteById('stock-counts').path).toBe(
      '/inventory/stock-counts',
    );
    expect(requireRouteById('stock-counts').groupId).toBe('inventory');
    expect(requireRouteById('stock-counts').projectScope).toBe('required');
    expect(requireRouteById('stock-counts').title).toBe('Stock Counts');
    expect(requireRouteById('stock-count-detail').path).toBe(
      '/inventory/stock-counts/:countId',
    );
    expect(requireRouteById('stock-count-detail').showInNav).toBe(false);
    expect(requireRouteById('material-issues').path).toBe(
      '/inventory/material-issues',
    );
    expect(requireRouteById('material-issues').groupId).toBe('inventory');
    expect(requireRouteById('material-issues').projectScope).toBe('required');
    expect(requireRouteById('material-issues').title).toBe('Material Issues');
    expect(requireRouteById('material-issue-detail').path).toBe(
      '/inventory/material-issues/:issueId',
    );
    expect(requireRouteById('material-issue-detail').showInNav).toBe(false);
    expect(requireRouteById('reorder-alerts').path).toBe(
      '/inventory/reorder-alerts',
    );
    expect(requireRouteById('reorder-alerts').groupId).toBe('inventory');
    expect(requireRouteById('reorder-alerts').projectScope).toBe('required');
    expect(requireRouteById('reorder-alerts').title).toBe('Reorder Alerts');
  });

  it('denies stock ledger and stock counts without stock.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['stock.adjust'] as const,
    };
    expect(canEnterRoute(requireRouteById('stock-ledger'), ctx)).toBe(false);
    expect(canEnterRoute(requireRouteById('stock-counts'), ctx)).toBe(false);
    expect(canEnterRoute(requireRouteById('material-issues'), ctx)).toBe(false);
    expect(canEnterRoute(requireRouteById('reorder-alerts'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('stock-ledger');
    expect(visibleIds(ctx)).not.toContain('stock-counts');
    expect(visibleIds(ctx)).not.toContain('material-issues');
    expect(visibleIds(ctx)).not.toContain('reorder-alerts');
  });

  it('grn viewer sees Inventory → Goods Receipts', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['grn.create'] as const,
    };
    expect(visibleIds(ctx)).toContain('grns');
    expect(canEnterRoute(requireRouteById('grns'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('grn-detail'), ctx)).toBe(true);
    expect(requireRouteById('grns').path).toBe('/inventory/grns');
    expect(requireRouteById('grns').groupId).toBe('inventory');
    expect(requireRouteById('grns').projectScope).toBe('required');
    expect(requireRouteById('grns').title).toBe('Goods Receipts');
    expect(requireRouteById('grn-detail').path).toBe('/inventory/grns/:grnId');
    expect(requireRouteById('grn-detail').showInNav).toBe(false);
  });

  it('denies goods receipts without grn.create', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['grn.approve'] as const,
    };
    expect(canEnterRoute(requireRouteById('grns'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('grns');
  });

  it('quality viewer sees Inventory → Quality Inspections', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['quality.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('quality-inspections');
    expect(canEnterRoute(requireRouteById('quality-inspections'), ctx)).toBe(
      true,
    );
    expect(
      canEnterRoute(requireRouteById('quality-inspection-detail'), ctx),
    ).toBe(true);
    expect(requireRouteById('quality-inspections').path).toBe(
      '/inventory/quality-inspections',
    );
    expect(requireRouteById('quality-inspections').groupId).toBe('inventory');
    expect(requireRouteById('quality-inspections').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('quality-inspections').title).toBe(
      'Quality Inspections',
    );
    expect(requireRouteById('quality-inspection-detail').path).toBe(
      '/inventory/quality-inspections/:inspectionId',
    );
    expect(requireRouteById('quality-inspection-detail').showInNav).toBe(false);
  });

  it('denies quality inspections without quality.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['quality.inspect'] as const,
    };
    expect(canEnterRoute(requireRouteById('quality-inspections'), ctx)).toBe(
      false,
    );
    expect(visibleIds(ctx)).not.toContain('quality-inspections');
  });

  it('BOQ viewer sees Project Control → BOQ; import needs boq.manage', () => {
    const viewer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['boq.view'] as const,
    };
    expect(visibleIds(viewer)).toContain('boq');
    expect(canEnterRoute(requireRouteById('boq'), viewer)).toBe(true);
    expect(canEnterRoute(requireRouteById('boq-import'), viewer)).toBe(false);
    expect(requireRouteById('boq').path).toBe('/project-control/boq');
    expect(requireRouteById('boq').groupId).toBe('project-control');
    expect(requireRouteById('boq').projectScope).toBe('required');
    expect(requireRouteById('boq-import').path).toBe(
      '/project-control/boq/import',
    );
    expect(requireRouteById('boq-import').showInNav).toBe(false);

    const importer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['boq.manage'] as const,
    };
    expect(canEnterRoute(requireRouteById('boq-import'), importer)).toBe(true);
    expect(visibleIds(importer)).not.toContain('boq');
  });

  it('petty-cash requester can enter create form; viewer cannot', () => {
    const requester = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['petty_cash.request'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('petty-cash-request-create'), requester),
    ).toBe(true);
    expect(requireRouteById('petty-cash-request-create').path).toBe(
      '/accounting/petty-cash/requests/new',
    );
    expect(requireRouteById('petty-cash-request-detail').path).toBe(
      '/accounting/petty-cash/requests/:requestId',
    );
  });

  it('purchase viewer sees Procurement → Purchase Orders and Purchase Requests', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('purchase-orders');
    expect(visibleIds(ctx)).toContain('purchase-requests');
    expect(canEnterRoute(requireRouteById('purchase-orders'), ctx)).toBe(true);
    expect(canEnterRoute(requireRouteById('purchase-requests'), ctx)).toBe(
      true,
    );
    expect(canEnterRoute(requireRouteById('purchase-request-detail'), ctx)).toBe(
      true,
    );
    expect(requireRouteById('purchase-orders').path).toBe(
      '/procurement/purchase-orders',
    );
    expect(requireRouteById('purchase-orders').groupId).toBe('procurement');
    expect(requireRouteById('purchase-orders').projectScope).toBe('required');
    expect(requireRouteById('purchase-orders').title).toBe('Purchase Orders');
    expect(requireRouteById('purchase-requests').path).toBe(
      '/procurement/purchase-requests',
    );
    expect(requireRouteById('purchase-requests').groupId).toBe('procurement');
    expect(requireRouteById('purchase-request-detail').path).toBe(
      '/procurement/purchase-requests/:requestId',
    );
    expect(visibleIds(ctx)).not.toContain('purchase-request-detail');
  });

  it('denies purchase orders without purchase.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.order'] as const,
    };
    expect(canEnterRoute(requireRouteById('purchase-orders'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('purchase-orders');
  });

  it('purchase.order can enter PO create form; viewer cannot', () => {
    const orderer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.order'] as const,
    };
    const viewer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.view'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('purchase-order-create'), orderer),
    ).toBe(true);
    expect(
      canEnterRoute(requireRouteById('purchase-order-create'), viewer),
    ).toBe(false);
    expect(requireRouteById('purchase-order-create').path).toBe(
      '/procurement/purchase-orders/new',
    );
    expect(visibleIds(orderer)).not.toContain('purchase-order-create');
  });

  it('purchase viewer can enter PO detail; path is after /new', () => {
    const viewer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.view'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('purchase-order-detail'), viewer),
    ).toBe(true);
    expect(requireRouteById('purchase-order-detail').path).toBe(
      '/procurement/purchase-orders/:purchaseOrderId',
    );
    expect(requireRouteById('purchase-order-detail').projectScope).toBe(
      'required',
    );
    expect(visibleIds(viewer)).not.toContain('purchase-order-detail');
  });

  it('purchase requester can enter PR create form; viewer cannot', () => {
    const requester = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.request'] as const,
    };
    const viewer = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['purchase.view'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('purchase-request-create'), requester),
    ).toBe(true);
    expect(requireRouteById('purchase-request-create').path).toBe(
      '/procurement/purchase-requests/new',
    );
    expect(requireRouteById('purchase-request-create').projectScope).toBe(
      'required',
    );
    expect(
      canEnterRoute(requireRouteById('purchase-request-create'), viewer),
    ).toBe(false);
    expect(visibleIds(viewer)).not.toContain('purchase-request-create');
  });

  it('denies fund requests without petty_cash.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['petty_cash.request'] as const,
    };
    expect(canEnterRoute(requireRouteById('petty-cash-requests'), ctx)).toBe(
      false,
    );
    expect(visibleIds(ctx)).not.toContain('petty-cash-requests');
  });

  it('quotation viewer sees Procurement → Quotations', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['quotation.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('quotations');
    expect(canEnterRoute(requireRouteById('quotations'), ctx)).toBe(true);
    expect(requireRouteById('quotations').path).toBe('/procurement/quotations');
    expect(requireRouteById('quotations').groupId).toBe('procurement');
    expect(requireRouteById('quotations').projectScope).toBe('required');
    expect(requireRouteById('quotations').title).toBe('Quotations');
  });

  it('quotation comparison route is guarded but not in nav', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['quotation.compare'] as const,
    };
    expect(canEnterRoute(requireRouteById('quotation-comparison'), ctx)).toBe(
      true,
    );
    expect(visibleIds(ctx)).not.toContain('quotation-comparison');
  });

  it('petty-cash viewer sees Petty Cash → Fund Transfers', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['petty_cash.view'] as const,
    };
    expect(visibleIds(ctx)).toContain('petty-cash-fund-transfers');
    expect(
      canEnterRoute(requireRouteById('petty-cash-fund-transfers'), ctx),
    ).toBe(true);
    expect(requireRouteById('petty-cash-fund-transfers').path).toBe(
      '/accounting/petty-cash/transfers',
    );
    expect(requireRouteById('petty-cash-fund-transfers').groupId).toBe(
      'petty-cash',
    );
    expect(requireRouteById('petty-cash-fund-transfers').projectScope).toBe(
      'required',
    );
    expect(requireRouteById('petty-cash-fund-transfers').title).toBe(
      'Fund Transfers',
    );
  });

  it('denies fund transfers without petty_cash.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['petty_cash.fund'] as const,
    };
    expect(
      canEnterRoute(requireRouteById('petty-cash-fund-transfers'), ctx),
    ).toBe(false);
    expect(visibleIds(ctx)).not.toContain('petty-cash-fund-transfers');
  });

  it('denies journals without journal.view', () => {
    const ctx = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['journal.create'] as const,
    };
    expect(canEnterRoute(requireRouteById('journals'), ctx)).toBe(false);
    expect(visibleIds(ctx)).not.toContain('journals');
  });

  it('keeps nav + guard pending until permissions load', () => {
    const ctx = ROLES.pending;
    expect(evaluateRouteAccess(requireRouteById('users'), ctx)).toBe('pending');
    expect(visibleIds(ctx)).toContain('users');
    expect(canEnterRoute(requireRouteById('users'), ctx)).toBe(true);
  });
});

describe('filterNavGroups', () => {
  it('drops empty module groups', () => {
    const filtered = filterNavGroups(NAV_GROUPS, {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: [],
    });
    const groupIds = filtered.map((g) => g.id);
    expect(groupIds).toContain('overview');
    expect(groupIds).toContain('system');
    expect(groupIds).not.toContain('approvals');
    expect(groupIds).not.toContain('administration');
    expect(groupIds).not.toContain('capital-investment');
    expect(groupIds).not.toContain('accounting');
    expect(groupIds).not.toContain('reports');
    expect(groupIds).not.toContain('petty-cash');
    expect(groupIds).not.toContain('inventory');
    expect(groupIds).not.toContain('projects-site');
    expect(groupIds).not.toContain('project-control');
    expect(groupIds).not.toContain('procurement');
    expect(groupIds).not.toContain('organisation');
  });
});

describe('getPageTitle', () => {
  it('resolves titles from the registry', () => {
    expect(getPageTitle('/')).toBe('Dashboard');
    expect(getPageTitle('/dashboard/director')).toBe(
      'Director Command Centre',
    );
    expect(getPageTitle('/dashboard/finance')).toBe('Finance');
    expect(getPageTitle('/dashboard/purchase')).toBe('Purchase');
    expect(getPageTitle('/procurement/purchase-orders')).toBe(
      'Purchase Orders',
    );
    expect(getPageTitle('/procurement/purchase-orders/new')).toBe(
      'New Purchase Order',
    );
    expect(
      getPageTitle(
        '/procurement/purchase-orders/507f1f77bcf86cd799439011',
      ),
    ).toBe('Purchase Order');
    expect(getPageTitle('/projects')).toBe('Projects');
    expect(getPageTitle('/projects/dashboard')).toBe('Project Dashboard');
    expect(
      getPageTitle('/projects/507f1f77bcf86cd799439011/dashboard'),
    ).toBe('Project Dashboard');
    expect(getPageTitle('/capital/directors')).toBe('Directors');
    expect(
      getPageTitle('/capital/directors/507f1f77bcf86cd799439011'),
    ).toBe('Director');
    expect(getPageTitle('/capital/shareholding')).toBe('Shareholding');
    expect(getPageTitle('/capital/investors')).toBe('Investors');
    expect(
      getPageTitle('/capital/investors/507f1f77bcf86cd799439011'),
    ).toBe('Investor');
    expect(getPageTitle('/capital/funding-dashboard')).toBe(
      'Funding Dashboard',
    );
    expect(getPageTitle('/capital/commitments')).toBe('Commitments');
    expect(getPageTitle('/capital/contribution-receipts')).toBe(
      'Contribution Receipts',
    );
    expect(getPageTitle('/accounting/chart-of-accounts')).toBe(
      'Chart of Accounts',
    );
    expect(getPageTitle('/accounting/chart-of-accounts/new')).toBe(
      'New account',
    );
    expect(
      getPageTitle(
        '/accounting/chart-of-accounts/507f1f77bcf86cd799439011/edit',
      ),
    ).toBe('Edit account');
    expect(getPageTitle('/accounting/journals')).toBe('Journals');
    expect(getPageTitle('/accounting/journals/new')).toBe('New Journal');
    expect(
      getPageTitle('/accounting/journals/507f1f77bcf86cd799439011'),
    ).toBe('Journal');
    expect(getPageTitle('/accounting/cash-accounts')).toBe('Cash & Petty Cash');
    expect(getPageTitle('/accounting/bank-accounts')).toBe('Bank Accounts');
    expect(
      getPageTitle('/accounting/bank-accounts/507f1f77bcf86cd799439011'),
    ).toBe('Bank Account');
    expect(getPageTitle('/accounting/petty-cash/requests')).toBe(
      'Fund Requests',
    );
    expect(getPageTitle('/accounting/petty-cash/requests/new')).toBe(
      'New Petty Cash Request',
    );
    expect(getPageTitle('/procurement/purchase-requests')).toBe(
      'Purchase Requests',
    );
    expect(getPageTitle('/procurement/purchase-requests/new')).toBe(
      'New Purchase Request',
    );
    expect(
      getPageTitle(
        '/procurement/purchase-requests/507f1f77bcf86cd799439011',
      ),
    ).toBe('Purchase Request');
    expect(
      getPageTitle(
        '/procurement/quotation-comparisons/507f1f77bcf86cd799439011',
      ),
    ).toBe('Quotation Comparison');
    expect(
      getPageTitle('/accounting/petty-cash/requests/507f1f77bcf86cd799439011'),
    ).toBe('Petty Cash Request');
    expect(getPageTitle('/accounting/petty-cash/transfers')).toBe(
      'Fund Transfers',
    );
    expect(getPageTitle('/procurement/quotations')).toBe('Quotations');
    expect(getPageTitle('/inventory/stock-balances')).toBe('Stock Balances');
    expect(getPageTitle('/inventory/stock-ledger')).toBe('Stock Ledger');
    expect(getPageTitle('/reports/accounting/cash-book')).toBe('Cash Book');
    expect(getPageTitle('/reports/accounting/bank-book')).toBe('Bank Book');
    expect(getPageTitle('/inventory/stock-counts')).toBe('Stock Counts');
    expect(
      getPageTitle('/inventory/stock-counts/507f1f77bcf86cd799439011'),
    ).toBe('Stock Count');
    expect(getPageTitle('/inventory/grns')).toBe('Goods Receipts');
    expect(
      getPageTitle('/inventory/grns/507f1f77bcf86cd799439011'),
    ).toBe('Goods Receipt');
    expect(getPageTitle('/inventory/quality-inspections')).toBe(
      'Quality Inspections',
    );
    expect(
      getPageTitle(
        '/inventory/quality-inspections/507f1f77bcf86cd799439011',
      ),
    ).toBe('Quality Inspection');
    expect(getPageTitle('/inventory/material-issues')).toBe('Material Issues');
    expect(
      getPageTitle('/inventory/material-issues/507f1f77bcf86cd799439011'),
    ).toBe('Material Issue');
    expect(getPageTitle('/inventory/reorder-alerts')).toBe('Reorder Alerts');
    expect(getPageTitle('/approvals')).toBe('Pending');
    expect(getPageTitle('/approvals/abc123')).toBe('Pending');
    expect(getPageTitle('/documents')).toBe('Documents');
    expect(getPageTitle('/administration/audit-logs')).toBe('Audit Logs');
    expect(getPageTitle('/project-control/dpr')).toBe('Daily progress');
    expect(getPageTitle('/daily-progress-reports')).toBe('Daily progress');
    expect(getPageTitle('/forbidden')).toBe('Access denied');
  });
});

describe('pathMatchesPattern / param routes', () => {
  it('matches project dashboard detail paths', () => {
    expect(
      pathMatchesPattern(
        '/projects/:projectId/dashboard',
        '/projects/507f1f77bcf86cd799439011/dashboard',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/projects/507f1f77bcf86cd799439011/dashboard',
      )?.id,
    ).toBe('project-dashboard-detail');
  });

  it('matches project participants detail paths', () => {
    expect(
      pathMatchesPattern(
        '/projects/:projectId/participants',
        '/projects/507f1f77bcf86cd799439011/participants',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/projects/507f1f77bcf86cd799439011/participants',
      )?.id,
    ).toBe('project-participants-detail');
  });

  it('matches profit-share detail paths', () => {
    expect(
      pathMatchesPattern(
        '/projects/:projectId/profit-share',
        '/projects/507f1f77bcf86cd799439011/profit-share',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/projects/507f1f77bcf86cd799439011/profit-share',
      )?.id,
    ).toBe('profit-share-detail');
  });

  it('matches commitment detail paths', () => {
    expect(
      pathMatchesPattern(
        '/capital/commitments/:commitmentId',
        '/capital/commitments/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/capital/commitments/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('commitment-detail');
  });

  it('matches director detail paths', () => {
    expect(
      pathMatchesPattern(
        '/capital/directors/:directorId',
        '/capital/directors/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/capital/directors/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('director-detail');
  });

  it('matches investor detail paths', () => {
    expect(
      pathMatchesPattern(
        '/capital/investors/:investorId',
        '/capital/investors/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/capital/investors/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('investor-detail');
  });

  it('matches goods receipt detail paths', () => {
    expect(
      pathMatchesPattern(
        '/inventory/grns/:grnId',
        '/inventory/grns/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/inventory/grns/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('grn-detail');
  });

  it('matches bank account detail paths', () => {
    expect(
      pathMatchesPattern(
        '/accounting/bank-accounts/:bankAccountId',
        '/accounting/bank-accounts/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/accounting/bank-accounts/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('bank-account-detail');
  });

  it('matches petty-cash request create before detail param', () => {
    expect(
      findRouteByPathname('/accounting/petty-cash/requests/new')?.id,
    ).toBe('petty-cash-request-create');
    expect(
      pathMatchesPattern(
        '/accounting/petty-cash/requests/:requestId',
        '/accounting/petty-cash/requests/507f1f77bcf86cd799439011',
      ),
    ).toBe(true);
    expect(
      findRouteByPathname(
        '/accounting/petty-cash/requests/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('petty-cash-request-detail');
  });

  it('matches purchase request create before detail param', () => {
    expect(
      findRouteByPathname('/procurement/purchase-requests/new')?.id,
    ).toBe('purchase-request-create');
    expect(
      findRouteByPathname(
        '/procurement/purchase-requests/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('purchase-request-detail');
  });

  it('matches purchase order create before detail param', () => {
    expect(
      findRouteByPathname('/procurement/purchase-orders/new')?.id,
    ).toBe('purchase-order-create');
    expect(
      findRouteByPathname(
        '/procurement/purchase-orders/507f1f77bcf86cd799439011',
      )?.id,
    ).toBe('purchase-order-detail');
  });
});

describe('cash / bank book routes (phase 109)', () => {
  it('registers cash and bank book under Accounting reports nav', () => {
    const cash = requireRouteById('cash-book');
    const bank = requireRouteById('bank-book');
    expect(cash.path).toBe('/reports/accounting/cash-book');
    expect(bank.path).toBe('/reports/accounting/bank-book');
    expect(cash.groupId).toBe('reports');
    expect(bank.groupId).toBe('reports');
    expect(cash.anyOf).toEqual(['report.view']);
    expect(bank.anyOf).toEqual(['report.view']);
    expect(cash.projectScope).toBe('none');
    expect(bank.projectScope).toBe('none');
  });

  it('shows books for report.view and hides without it', () => {
    const withPerm = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['report.view'] as const,
    };
    const without = {
      accessLoaded: true,
      bypassPermissions: false,
      permissions: ['project.view'] as const,
    };
    expect(visibleIds(withPerm)).toEqual(
      expect.arrayContaining(['cash-book', 'bank-book']),
    );
    expect(canEnterRoute(requireRouteById('cash-book'), withPerm)).toBe(true);
    expect(canEnterRoute(requireRouteById('bank-book'), withPerm)).toBe(true);
    expect(visibleIds(without)).not.toContain('cash-book');
    expect(visibleIds(without)).not.toContain('bank-book');
    expect(canEnterRoute(requireRouteById('cash-book'), without)).toBe(false);
  });
});
