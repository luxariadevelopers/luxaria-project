import { apiGet } from '@/api/client';
import type {
  ConstructionReportCatalogueItem,
  ConstructionReportPayload,
  ConstructionReportQuery,
  ConstructionReportType,
} from './types';

/** `GET /construction-reports` — `report.view` */
export async function fetchConstructionReportCatalogue(): Promise<
  ConstructionReportCatalogueItem[]
> {
  const res = await apiGet<ConstructionReportCatalogueItem[]>(
    '/construction-reports',
  );
  return res.data ?? [];
}

/** `GET /construction-reports/:reportType` — `report.view` */
export async function fetchConstructionReport(
  reportType: ConstructionReportType,
  query: ConstructionReportQuery = {},
): Promise<ConstructionReportPayload> {
  const res = await apiGet<ConstructionReportPayload>(
    `/construction-reports/${reportType}`,
    {
      projectId: query.projectId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      contractorId: query.contractorId || undefined,
      vendorId: query.vendorId || undefined,
      materialId: query.materialId || undefined,
    },
  );
  if (!res.data) {
    throw new Error(res.message || 'Construction report unavailable');
  }
  return {
    ...res.data,
    rows: Array.isArray(res.data.rows) ? res.data.rows : [],
    totals: res.data.totals ?? null,
  };
}
