export type SeDashboardDateQuery = {
  projectId: string;
  from?: string;
  to?: string;
};

export type PmDashboardView = {
  projectId: string;
  from: string | null;
  to: string | null;
  dprCompletion: {
    percent: number;
    totalReports: number;
    completedReports: number;
    missingAlerts: number;
    byStatus: Record<string, number>;
  };
  labour: {
    headcount: number;
    sheetCount: number;
    skilled: number;
    unskilled: number;
    overtimeHours: number;
  };
  equipmentUtilization: {
    available: boolean;
    hoursWorked: number;
    hoursIdle: number;
    utilizationPercent: number | null;
    lineCount: number;
  };
  materialConsumed: {
    quantity: number;
    value: number;
    issueCount: number;
  };
  delays: {
    eventCount: number;
    hoursLost: number;
  };
  openIssues: {
    available: boolean;
    count: number;
    critical: number;
  };
};

export type DirectorDashboardView = {
  projectId: string;
  from: string | null;
  to: string | null;
  physicalProgress: {
    percent: number;
    measured: number;
    planned: number;
  };
  financialProgress: {
    percent: number | null;
    actualCost: number | null;
    budget: number | null;
    note: string;
  };
  dailyProductivity: {
    quantityCompleted: number;
    labourHeadcount: number;
    qtyPerWorker: number | null;
    reportDays: number;
  };
  criticalIssues: {
    available: boolean;
    count: number;
    openIssuesCritical: number;
    dprCriticalSafety: number;
    dprCriticalQuality: number;
  };
};
