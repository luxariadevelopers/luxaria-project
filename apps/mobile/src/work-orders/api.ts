import { apiGet } from '@/api/client';

export type PublicWorkOrder = {
  id: string;
  workOrderNumber: string;
  projectId: string;
  contractorId: string;
  status: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  siteId: string | null;
};

export type PaginatedWorkOrders = {
  items: PublicWorkOrder[];
  meta?: { page?: number; limit?: number; total?: number };
};

function toIso(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalise(row: PublicWorkOrder): PublicWorkOrder {
  return {
    ...row,
    id: String(row.id),
    startDate: toIso(row.startDate),
    endDate: toIso(row.endDate),
    siteId: row.siteId ?? null,
  };
}

/** `GET /work-orders` — `work_order.view` */
export async function fetchWorkOrders(query: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedWorkOrders> {
  const res = await apiGet<PaginatedWorkOrders>('/work-orders', {
    params: {
      projectId: query.projectId,
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    },
  });
  if (!res.data) {
    throw new Error(res.message || 'Failed to load work orders');
  }
  return {
    ...res.data,
    items: (res.data.items ?? []).map(normalise),
  };
}
