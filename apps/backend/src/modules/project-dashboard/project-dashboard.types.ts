export type DrillDownLink = {
  label: string;
  href: string;
};

export type MoneyTile = {
  amount: number;
  count?: number;
  drillDown: DrillDownLink[];
};

export type PercentTile = {
  percent: number;
  numerator: number;
  denominator: number;
  drillDown: DrillDownLink[];
};

export type CriticalAlert = {
  code: string;
  severity: 'critical' | 'warning';
  message: string;
  count: number;
  drillDown: DrillDownLink[];
};

export type SitePhotoItem = {
  id: string;
  source: 'project_document' | 'dpr';
  fileName: string | null;
  reportDate: string | null;
  href: string;
};

export type ContractorProgressRow = {
  contractorId: string;
  measuredQuantity: number;
  plannedQuantity: number;
  progressPercent: number;
  certifiedValue: number;
  drillDown: DrillDownLink[];
};

export type CapitalPlanPartyRow = {
  participantRecordId: string;
  partyId: string;
  name: string;
  profitSharePercent: number;
  expectedAmount: number;
  investedAmount: number;
  pendingAmount: number;
  budgetPercent: number | null;
  instrumentType: string | null;
  repaymentMode: string | null;
  interestRate: number | null;
  repayHint: string | null;
};

export type CapitalPlanSummary = {
  approvedBudget: number;
  totalInvested: number;
  pendingToInvest: number;
  equalDirectorInvestment: boolean;
  directorsEqual: boolean;
  directors: CapitalPlanPartyRow[];
  investors: CapitalPlanPartyRow[];
  drillDown: DrillDownLink[];
};

export type ProjectDashboardSummary = {
  filters: {
    projectId: string;
    date: string;
    from: string | null;
    to: string | null;
  };
  project: {
    id: string;
    projectCode: string;
    projectName: string;
    projectStage: string;
    status: string;
  };
  capitalPlan: CapitalPlanSummary;
  projectStage: {
    stage: string;
    status: string;
    drillDown: DrillDownLink[];
  };
  physicalCompletion: PercentTile;
  financialCompletion: PercentTile;
  approvedBudget: MoneyTile;
  revisedBudget: MoneyTile;
  actualCost: MoneyTile;
  committedCost: MoneyTile;
  forecastCostToComplete: MoneyTile;
  projectedFinalCost: MoneyTile;
  customerCollections: MoneyTile;
  investorFunding: {
    committedAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    commitmentCount: number;
    drillDown: DrillDownLink[];
  };
  bankBalance: MoneyTile;
  cashBalance: MoneyTile;
  materialStock: {
    materialCount: number;
    totalQuantity: number;
    locations: number;
    drillDown: DrillDownLink[];
  };
  labourAttendance: {
    asOfDate: string;
    sheetCount: number;
    totalWorkers: number;
    confirmedSheets: number;
    submittedSheets: number;
    drillDown: DrillDownLink[];
  };
  contractorProgress: ContractorProgressRow[];
  vendorDues: MoneyTile;
  purchaseOrders: {
    count: number;
    issuedCount: number;
    totalValue: number;
    openBalance: number;
    drillDown: DrillDownLink[];
  };
  sitePhotos: {
    count: number;
    recent: SitePhotoItem[];
    drillDown: DrillDownLink[];
  };
  criticalAlerts: CriticalAlert[];
  /** Phase 2 PLM optional summary counters (cheap aggregates). */
  pendingApprovalsCount: number;
  pendingPoCount: number;
  pendingGrnCount: number;
  dprStatusSummary: {
    draft: number;
    submitted: number;
    reviewed: number;
    reopened: number;
    other: number;
  };
};
