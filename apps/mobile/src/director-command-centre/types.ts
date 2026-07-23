/**
 * Mirrors `DirectorCommandCentreSummary` from
 * `apps/backend/src/modules/director-command-centre/director-command-centre.types.ts`
 * (JSON dates/ids as strings).
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

export type ProjectMoneyRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  amount: number;
  drillDown: DrillDownLink[];
};

export type ContributionSummary = {
  participantType: 'director' | 'outside_investor';
  committedAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  participantCount: number;
  commitmentCount: number;
  drillDown: DrillDownLink[];
};

export type CostVersusBudgetRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  budgetAmount: number;
  actualCost: number;
  variance: number;
  utilisationPercent: number;
  drillDown: DrillDownLink[];
};

export type ProgressRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  plannedQuantity: number;
  measuredQuantity: number;
  progressPercent: number;
  drillDown: DrillDownLink[];
};

export type BoqUtilisationRow = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  boqPlannedValue: number;
  utilisedQuantityPercent: number;
  drillDown: DrillDownLink[];
};

export type AlertSummary = {
  count: number;
  items: Array<{
    id: string;
    projectId: string | null;
    message: string;
    severity?: string;
    type?: string;
  }>;
  drillDown: DrillDownLink[];
};

export type ContractorPerformanceRow = {
  contractorId: string;
  tradeName: string | null;
  rating: number | null;
  openBillPayable: number;
  drillDown: DrillDownLink[];
};

export type CriticalException = {
  code: string;
  severity: 'critical' | 'warning';
  message: string;
  count: number;
  drillDown: DrillDownLink[];
};

export type CommandCentreFiltersApplied = {
  date: string;
  projectId: string | null;
  directorId: string | null;
  financialYearId: string | null;
  financialYearName: string | null;
  rangeFrom: string | null;
  rangeTo: string | null;
  accessibleProjectCount: number;
};

export type DirectorCommandCentreSummary = {
  filters: CommandCentreFiltersApplied;
  totalCompanyBankBalance: MoneyTile;
  totalCashBalance: MoneyTile;
  projectWiseBankBalance: ProjectMoneyRow[];
  projectWisePettyCash: ProjectMoneyRow[];
  directorContributionSummary: ContributionSummary;
  investorContributionSummary: ContributionSummary;
  customerCollections: MoneyTile;
  vendorPayable: MoneyTile;
  contractorPayable: MoneyTile;
  paymentsDueToday: MoneyTile;
  overduePayments: MoneyTile;
  purchaseRequestsPending: MoneyTile;
  costVersusBudget: CostVersusBudgetRow[];
  physicalProgress: ProgressRow[];
  boqUtilisation: BoqUtilisationRow[];
  materialStockAlerts: AlertSummary;
  labourShortfall: AlertSummary;
  contractorPerformance: ContractorPerformanceRow[];
  criticalExceptions: CriticalException[];
};

/** Query for `GET /director-command-centre/summary`. */
export type CommandCentreQuery = {
  date?: string;
  projectId?: string;
  directorId?: string;
  financialYearId?: string;
};
