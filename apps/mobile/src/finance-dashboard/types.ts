/**
 * Mirrors `FinanceDashboardSummary` from
 * `apps/backend/src/modules/finance-dashboard/finance-dashboard.types.ts`.
 */

export type DrillDownLink = {
  label: string;
  href: string;
};

export type MoneyTile = {
  amount: number;
  count?: number;
  drillDown: DrillDownLink[];
};

export type AgeingBuckets = {
  current: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90Plus: number;
  total: number;
  count: number;
  drillDown: DrillDownLink[];
};

export type ProjectFundRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  bankBalance: number;
  cashBalance: number;
  totalLiquidity: number;
  vendorPayable: number;
  contractorPayable: number;
  netFundPosition: number;
  drillDown: DrillDownLink[];
};

export type ContributionPending = {
  participantType: 'director' | 'outside_investor';
  committedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  commitmentCount: number;
  drillDown: DrillDownLink[];
};

export type CashFlowPeriod = {
  periodStart: string;
  periodEnd: string;
  label: string;
  inflows: number;
  outflows: number;
  net: number;
};

export type CashFlowForecast = {
  horizonDays: number;
  totalInflows: number;
  totalOutflows: number;
  net: number;
  series: CashFlowPeriod[];
  drillDown: DrillDownLink[];
};

export type BankReconciliationPending = {
  available: boolean;
  pendingCount: number;
  amount: number;
  message: string;
  drillDown: DrillDownLink[];
};

export type FinanceDashboardFilters = {
  date: string;
  projectId: string | null;
  from: string | null;
  to: string | null;
  financialYearId: string | null;
  financialYearName: string | null;
  horizonDays: number;
  accessibleProjectCount: number;
};

export type FinanceDashboardSummary = {
  filters: FinanceDashboardFilters;
  companyBankBalances: MoneyTile;
  cashBalances: MoneyTile;
  projectFundPosition: ProjectFundRow[];
  vendorAgeing: AgeingBuckets;
  contractorAgeing: AgeingBuckets;
  customerReceivables: MoneyTile;
  directorContributionPending: ContributionPending;
  investorContributionPending: ContributionPending;
  paymentApprovals: MoneyTile;
  upcomingPayments: MoneyTile;
  overduePayments: MoneyTile;
  unsettledPettyCash: MoneyTile;
  journalErrors: MoneyTile;
  bankReconciliationPending: BankReconciliationPending;
  cashFlowForecast: CashFlowForecast;
};

/** Query for `GET /finance-dashboard/summary`. */
export type FinanceDashboardQuery = {
  date?: string;
  projectId?: string;
  from?: string;
  to?: string;
  financialYearId?: string;
  horizonDays?: number;
};

export type PublicFinancialYearOption = {
  id: string;
  name: string;
  isCurrent: boolean;
  isLocked: boolean;
  status: string;
};
