export type DrillDownLink = {
  label: string;
  href: string;
};

export type MoneyTile = {
  amount: number;
  count?: number;
  drillDown: DrillDownLink[];
};

export type ProjectDashboardCostSummary = {
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
  };
  approvedBudget: MoneyTile;
  revisedBudget: MoneyTile;
  actualCost: MoneyTile;
  committedCost: MoneyTile;
  forecastCostToComplete: MoneyTile;
  projectedFinalCost: MoneyTile;
};

export type CostSheetRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountCategory: string;
  amount: number;
  drillDown: DrillDownLink[];
};

export type ProjectCostSheetReport = {
  meta: {
    generatedAt: string;
    title: string;
    filters: {
      projectId: string | null;
      from: string | null;
      to: string | null;
    };
  };
  rows: CostSheetRow[];
  totals: {
    cost: number;
  };
};

export type CostForecastQuery = {
  projectId: string;
  date?: string;
  from?: string;
  to?: string;
};

export type CostForecastViewModel = {
  dashboard: ProjectDashboardCostSummary | null;
  costSheet: ProjectCostSheetReport | null;
  /** Latest `meta.generatedAt` from loaded reports (never client-computed). */
  calculatedAt: string | null;
};
