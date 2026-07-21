import { apiGet } from '@/api/client';

export type ValuationReport = {
  projectId: string;
  totalValue: number;
  lines: Array<{
    materialId: string;
    materialCode: string | null;
    name: string | null;
    quantity: number;
    value: number;
    avgUnitCost: number;
  }>;
};

export type ReorderReport = {
  projectId: string;
  lines: Array<{
    materialId: string;
    materialCode: string;
    name: string;
    onHand: number;
    reorderLevel: number;
    suggestedOrder: number;
  }>;
};

export async function fetchValuationReport(
  projectId: string,
): Promise<ValuationReport> {
  const res = await apiGet<ValuationReport>('/inventory/reports/valuation', {
    projectId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Valuation report unavailable');
  }
  return res.data;
}

export async function fetchReorderReport(
  projectId: string,
): Promise<ReorderReport> {
  const res = await apiGet<ReorderReport>('/inventory/reports/reorder', {
    projectId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Reorder report unavailable');
  }
  return res.data;
}
