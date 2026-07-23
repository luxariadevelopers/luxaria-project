import path from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** True when tests should hit a live Nest API (CI or explicit local flag). */
export function isLiveApi(): boolean {
  return process.env.E2E_LIVE_API === 'true' || process.env.CI === 'true';
}

export type E2eActorEnv = {
  identifier: string;
  password: string;
  fullName: string;
  mobile: string;
  /** Catalog role codes assigned to this actor (matches backend golden-path). */
  roleCodes: readonly string[];
};

export const e2eEnv = {
  apiBaseUrl:
    process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:9000/api/v1',
  admin: {
    identifier:
      process.env.E2E_ADMIN_IDENTIFIER ?? 'e2e-admin@luxaria.test',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'E2eAdminPass123!',
    fullName: process.env.E2E_ADMIN_FULL_NAME ?? 'E2E Admin',
    mobile: process.env.E2E_ADMIN_MOBILE ?? '9000000001',
    roleCodes: [] as readonly string[],
  },
  limited: {
    identifier:
      process.env.E2E_LIMITED_IDENTIFIER ?? 'e2e-limited@luxaria.test',
    password: process.env.E2E_LIMITED_PASSWORD ?? 'E2eLimitedPass123!',
    fullName: process.env.E2E_LIMITED_FULL_NAME ?? 'E2E Limited User',
    mobile: process.env.E2E_LIMITED_MOBILE ?? '9000000002',
    roleCodes: [] as readonly string[],
  },
  salesApprover: {
    identifier:
      process.env.E2E_SALES_APPROVER_IDENTIFIER ??
      'e2e-sales-approver@luxaria.test',
    password:
      process.env.E2E_SALES_APPROVER_PASSWORD ?? 'E2eSalesApprover123!',
    fullName:
      process.env.E2E_SALES_APPROVER_FULL_NAME ?? 'E2E Sales Approver',
    mobile: process.env.E2E_SALES_APPROVER_MOBILE ?? '9000000003',
    roleCodes: ['PROJECT_MANAGER', 'SALES_MANAGER'] as const,
  },
  financeApprover: {
    identifier:
      process.env.E2E_FINANCE_APPROVER_IDENTIFIER ??
      'e2e-finance-approver@luxaria.test',
    password:
      process.env.E2E_FINANCE_APPROVER_PASSWORD ?? 'E2eFinanceApprover123!',
    fullName:
      process.env.E2E_FINANCE_APPROVER_FULL_NAME ?? 'E2E Finance Approver',
    mobile: process.env.E2E_FINANCE_APPROVER_MOBILE ?? '9000000004',
    roleCodes: ['FINANCE_DIRECTOR', 'FINANCE_MANAGER', 'SALES_MANAGER'] as const,
  },
  purchaseApprover: {
    identifier:
      process.env.E2E_PURCHASE_APPROVER_IDENTIFIER ??
      'e2e-purchase-approver@luxaria.test',
    password:
      process.env.E2E_PURCHASE_APPROVER_PASSWORD ?? 'E2ePurchaseApprover123!',
    fullName:
      process.env.E2E_PURCHASE_APPROVER_FULL_NAME ??
      'E2E Purchase Approver',
    mobile: process.env.E2E_PURCHASE_APPROVER_MOBILE ?? '9000000005',
    roleCodes: ['PROJECT_MANAGER', 'PURCHASE_MANAGER'] as const,
  },
  financeManager: {
    identifier:
      process.env.E2E_FINANCE_MANAGER_IDENTIFIER ??
      'e2e-finance-manager@luxaria.test',
    password:
      process.env.E2E_FINANCE_MANAGER_PASSWORD ?? 'E2eFinanceManager123!',
    fullName:
      process.env.E2E_FINANCE_MANAGER_FULL_NAME ?? 'E2E Finance Manager',
    mobile: process.env.E2E_FINANCE_MANAGER_MOBILE ?? '9000000006',
    roleCodes: [
      'FINANCE_DIRECTOR',
      'FINANCE_MANAGER',
      'PURCHASE_MANAGER',
    ] as const,
  },
  project: {
    name: process.env.E2E_PROJECT_NAME ?? 'E2E Smoke Project',
  },
  limitedRoleCode: process.env.E2E_LIMITED_ROLE_CODE ?? 'E2E_DASHBOARD_ONLY',
  paths: {
    root: e2eRoot,
    runtime: path.join(e2eRoot, '.e2e', 'runtime.json'),
    adminAuth: path.join(e2eRoot, '.auth', 'admin.json'),
    limitedAuth: path.join(e2eRoot, '.auth', 'limited.json'),
    salesApproverAuth: path.join(e2eRoot, '.auth', 'sales-approver.json'),
    financeApproverAuth: path.join(e2eRoot, '.auth', 'finance-approver.json'),
    purchaseApproverAuth: path.join(e2eRoot, '.auth', 'purchase-approver.json'),
    financeManagerAuth: path.join(e2eRoot, '.auth', 'finance-manager.json'),
  },
} as const;

export type E2eMasterData = {
  customerId: string;
  unitId: string;
  materialId: string;
  materialName: string;
  vendorId: string;
  vendorName: string;
  companyBankAccountId: string;
  expenseCategoryId: string;
  bankLedgerAccountId: string;
  pettyCashLedgerAccountId: string;
  materialLedgerAccountId: string;
  directExpenseAccountId: string;
};

export type E2eRuntimeState = {
  liveApi: boolean;
  seedFailed?: boolean;
  seedError?: string;
  adminUserId?: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  limitedRoleId?: string;
  limitedUserId?: string;
  salesApproverUserId?: string;
  financeApproverUserId?: string;
  purchaseApproverUserId?: string;
  financeManagerUserId?: string;
  master?: E2eMasterData;
};

export function hasGoldenPathActors(
  state: E2eRuntimeState | null | undefined,
): state is E2eRuntimeState & {
  salesApproverUserId: string;
  financeApproverUserId: string;
  purchaseApproverUserId: string;
  financeManagerUserId: string;
} {
  return Boolean(
    state?.liveApi &&
      !state.seedFailed &&
      state.salesApproverUserId &&
      state.financeApproverUserId &&
      state.purchaseApproverUserId &&
      state.financeManagerUserId &&
      state.master?.customerId,
  );
}
