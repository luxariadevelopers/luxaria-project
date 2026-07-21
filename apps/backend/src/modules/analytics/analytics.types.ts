import type { CostForecastResult } from './analytics.calculation';

export type DrillPathStep = {
  level: string;
  label: string;
  href: string;
};

export type KpiTile = {
  key: string;
  label: string;
  value: number | null;
  unit: 'money' | 'percent' | 'count' | 'days';
  trend?: number | null;
  drillPath: DrillPathStep[];
};

export type ExecutiveSummary = {
  asOf: string;
  generatedAt: string;
  company: {
    cashAndBank: number;
    collectionsToday: number;
    paymentsDue: number;
    receivables: number;
    payables: number;
    contractorLiabilities: number;
    criticalAlertCount: number;
    pendingApprovals: number;
  };
  projects: Array<{
    projectId: string;
    projectCode: string | null;
    projectName: string | null;
    physicalProgressPercent: number;
    financialProgressPercent: number;
    marginForecast: number | null;
    health: 'green' | 'amber' | 'red';
  }>;
  kpis: KpiTile[];
  source: 'live' | 'snapshot';
};

export type ProjectHealthView = {
  projectId: string;
  projectCode: string;
  projectName: string;
  physicalProgressPercent: number;
  financialProgressPercent: number;
  plannedVsActual: {
    planned: number;
    actual: number;
    variance: number;
  };
  budgetVsActual: {
    budget: number;
    actual: number;
    variance: number;
  };
  cost: CostForecastResult;
  revenue: number;
  collections: number;
  receivables: number;
  payables: number;
  margin: number;
  cashPosition: number;
  delays: number;
  criticalIssueCount: number;
  drillPath: DrillPathStep[];
};

export type ProjectProfitabilityView = {
  projectId: string;
  revenue: number;
  estimateAtCompletion: number;
  margin: number;
  marginPercent: number | null;
  collectionEfficiency: number | null;
  capitalDeployed: number;
  returnOnCapital: number | null;
  cost: CostForecastResult;
  drillPath: DrillPathStep[];
};

export type CashFlowForecastView = {
  horizon: string;
  asOf: string;
  openingCash: number;
  buckets: Array<{
    label: string;
    periodStart: string;
    periodEnd: string;
    collections: number;
    contractorPayments: number;
    vendorPayments: number;
    payrollLabour: number;
    statutoryDues: number;
    loanInflows: number;
    loanRepayments: number;
    directorInvestorContributions: number;
    inflows: number;
    outflows: number;
    net: number;
    fundingGap: number;
    closingCash: number;
  }>;
  projectFundingGaps: Array<{
    projectId: string;
    projectCode: string | null;
    fundingGap: number;
  }>;
  drillPath: DrillPathStep[];
};

export type DomainAnalyticsView = {
  domain:
    | 'sales'
    | 'construction'
    | 'procurement'
    | 'inventory'
    | 'contractor'
    | 'financial';
  asOf: string;
  kpis: KpiTile[];
  payload: Record<string, unknown>;
};

export type AnalyticsExportJob = {
  report: string;
  format: 'pdf' | 'excel' | 'csv';
  status: 'queued' | 'ready';
  generatedAt: string;
  rowCount: number;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  downloadHint: string;
};
