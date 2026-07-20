import { apiClient, apiGet } from '@/api/client';
import type {
  CostForecastQuery,
  ProjectCostSheetReport,
  ProjectDashboardCostSummary,
} from './types';

type CostSheetEnvelope = {
  meta?: ProjectCostSheetReport['meta'];
  rows?: ProjectCostSheetReport['rows'];
  totals?: ProjectCostSheetReport['totals'];
};

/**
 * `GET /accounting-reports/project-cost-sheet`
 * Permission: `report.view`
 */
export async function fetchProjectCostSheet(
  query: Pick<CostForecastQuery, 'projectId' | 'from' | 'to'>,
): Promise<ProjectCostSheetReport> {
  const res = await apiGet<CostSheetEnvelope>(
    '/accounting-reports/project-cost-sheet',
    {
      projectId: query.projectId,
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Project cost sheet unavailable');
  }
  const meta = res.data.meta;
  if (!meta?.generatedAt) {
    throw new Error('Project cost sheet missing calculation timestamp');
  }
  return {
    meta: {
      generatedAt: meta.generatedAt,
      title: meta.title ?? 'Project Cost Sheet',
      filters: {
        projectId: meta.filters?.projectId ?? query.projectId,
        from: meta.filters?.from ?? query.from ?? null,
        to: meta.filters?.to ?? query.to ?? null,
      },
    },
    rows: res.data.rows ?? [],
    totals: {
      cost: Number(res.data.totals?.cost ?? 0),
    },
  };
}

/**
 * `GET /projects/:projectId/dashboard`
 * Permission: `dashboard.view` + project read access.
 */
export async function fetchProjectDashboardCosts(
  query: CostForecastQuery,
): Promise<ProjectDashboardCostSummary> {
  const res = await apiGet<ProjectDashboardCostSummary>(
    `/projects/${query.projectId}/dashboard`,
    {
      ...(query.date ? { date: query.date } : {}),
      ...(query.from ? { from: query.from } : {}),
      ...(query.to ? { to: query.to } : {}),
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Project dashboard unavailable');
  }
  return res.data;
}

/** `GET /accounting-reports/project-cost-sheet/export` — `report.export` */
export async function exportProjectCostSheet(
  query: Pick<CostForecastQuery, 'projectId' | 'from' | 'to'>,
  format: 'xlsx' | 'pdf' = 'xlsx',
): Promise<{ blob: Blob; filename: string }> {
  const response = await apiClient.get<ArrayBuffer>(
    '/accounting-reports/project-cost-sheet/export',
    {
      params: {
        projectId: query.projectId,
        format,
        ...(query.from ? { from: query.from } : {}),
        ...(query.to ? { to: query.to } : {}),
      },
      responseType: 'arraybuffer',
    },
  );
  const disposition = String(response.headers['content-disposition'] ?? '');
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `project-cost-sheet.${format}`;
  return {
    blob: new Blob([response.data]),
    filename,
  };
}
