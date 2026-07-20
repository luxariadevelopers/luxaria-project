import { apiGet } from '@/api/client';
import { fetchProjectDashboard } from '@/director-command-centre/projectDashboardApi';
import type {
  ProjectDashboardQuery,
  ProjectDashboardSummary,
} from '@/director-command-centre/projectDashboardTypes';
import type {
  SiteAttendanceReport,
  SiteDprRow,
  SiteGrnRow,
  SiteMissingDprAlert,
  SitePettyCashRequirement,
} from './types';

export { fetchProjectDashboard };
export type { ProjectDashboardQuery, ProjectDashboardSummary };

/** `GET /daily-progress-reports` — `dpr.view` */
export async function fetchSiteDprs(query: {
  projectId: string;
  fromDate: string;
  toDate: string;
  page?: number;
  limit?: number;
}): Promise<SiteDprRow[]> {
  const res = await apiGet<SiteDprRow[]>('/daily-progress-reports', {
    projectId: query.projectId,
    fromDate: query.fromDate,
    toDate: query.toDate,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return res.data ?? [];
}

/** `GET /daily-progress-reports/missing-alerts` — `dpr.view` */
export async function fetchMissingDprAlerts(
  projectId: string,
): Promise<SiteMissingDprAlert[]> {
  const res = await apiGet<SiteMissingDprAlert[]>(
    '/daily-progress-reports/missing-alerts',
    { projectId },
  );
  return res.data ?? [];
}

/** `GET /labour-attendance/daily-report` — `attendance.view` */
export async function fetchAttendanceDailyReport(query: {
  projectId: string;
  attendanceDate: string;
}): Promise<SiteAttendanceReport> {
  const res = await apiGet<SiteAttendanceReport>(
    '/labour-attendance/daily-report',
    query,
  );
  if (!res.data) {
    throw new Error(res.message || 'Attendance daily report unavailable');
  }
  return res.data;
}

/** `GET /goods-receipts` — `grn.create` */
export async function fetchGoodsReceipts(query: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<SiteGrnRow[]> {
  const res = await apiGet<SiteGrnRow[]>('/goods-receipts', {
    projectId: query.projectId,
    page: query.page ?? 1,
    limit: query.limit ?? 50,
  });
  return res.data ?? [];
}

/** `GET /petty-cash-requirements` — `petty_cash.view` */
export async function fetchPettyCashRequirements(query: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<SitePettyCashRequirement[]> {
  const res = await apiGet<SitePettyCashRequirement[]>(
    '/petty-cash-requirements',
    {
      projectId: query.projectId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    },
  );
  return res.data ?? [];
}
