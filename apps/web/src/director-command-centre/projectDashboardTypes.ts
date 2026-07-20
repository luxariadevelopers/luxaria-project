/**
 * Mirrors `ProjectDashboardSummary` from
 * `apps/backend/src/modules/project-dashboard/project-dashboard.types.ts`.
 */

export type ProjectDashboardDrillDown = {
  label: string;
  href: string;
};

export type ProjectMoneyTile = {
  amount: number;
  count?: number;
  drillDown: ProjectDashboardDrillDown[];
};

export type ProjectPercentTile = {
  percent: number;
  numerator: number;
  denominator: number;
  drillDown: ProjectDashboardDrillDown[];
};

export type ProjectCriticalAlert = {
  code: string;
  severity: 'critical' | 'warning';
  message: string;
  count: number;
  drillDown: ProjectDashboardDrillDown[];
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
  projectStage: {
    stage: string;
    status: string;
    drillDown: ProjectDashboardDrillDown[];
  };
  physicalCompletion: ProjectPercentTile;
  financialCompletion: ProjectPercentTile;
  approvedBudget: ProjectMoneyTile;
  revisedBudget: ProjectMoneyTile;
  actualCost: ProjectMoneyTile;
  committedCost: ProjectMoneyTile;
  forecastCostToComplete: ProjectMoneyTile;
  projectedFinalCost: ProjectMoneyTile;
  customerCollections: ProjectMoneyTile;
  investorFunding: {
    committedAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    commitmentCount: number;
    drillDown: ProjectDashboardDrillDown[];
  };
  bankBalance: ProjectMoneyTile;
  cashBalance: ProjectMoneyTile;
  materialStock: {
    materialCount: number;
    totalQuantity: number;
    locations: number;
    drillDown: ProjectDashboardDrillDown[];
  };
  labourAttendance: {
    asOfDate: string;
    sheetCount: number;
    totalWorkers: number;
    confirmedSheets: number;
    submittedSheets: number;
    drillDown: ProjectDashboardDrillDown[];
  };
  contractorProgress: Array<{
    contractorId: string;
    measuredQuantity: number;
    plannedQuantity: number;
    progressPercent: number;
    certifiedValue: number;
    drillDown: ProjectDashboardDrillDown[];
  }>;
  vendorDues: ProjectMoneyTile;
  purchaseOrders: {
    count: number;
    issuedCount: number;
    totalValue: number;
    openBalance: number;
    drillDown: ProjectDashboardDrillDown[];
  };
  sitePhotos: {
    count: number;
    recent: SitePhotoItem[];
    drillDown: ProjectDashboardDrillDown[];
  };
  criticalAlerts: ProjectCriticalAlert[];
};

export type SitePhotoItem = {
  id: string;
  source: 'project_document' | 'dpr';
  fileName: string | null;
  reportDate: string | null;
  href: string;
};

export type ProjectDashboardQuery = {
  date?: string;
  from?: string;
  to?: string;
};
