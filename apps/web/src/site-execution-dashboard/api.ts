import { apiGet } from '@/api/client';

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

export async function fetchSePmDashboard(
  projectId: string,
): Promise<PmDashboardView> {
  const res = await apiGet<PmDashboardView>('/site-execution/dashboard/pm', {
    projectId,
  });
  if (!res.data) {
    throw new Error(res.message || 'PM dashboard unavailable');
  }
  return res.data;
}

export async function fetchSeDirectorDashboard(
  projectId: string,
): Promise<DirectorDashboardView> {
  const res = await apiGet<DirectorDashboardView>(
    '/site-execution/dashboard/director',
    { projectId },
  );
  if (!res.data) {
    throw new Error(res.message || 'Director dashboard unavailable');
  }
  return res.data;
}
