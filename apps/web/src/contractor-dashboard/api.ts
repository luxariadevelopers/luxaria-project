import { apiGet } from '@/api/client';

export type ContractorDashboardKpis = {
  projectId: string | null;
  companyId: string | null;
  asOf: string;
  openWorkOrders: { available: boolean; count: number };
  pendingBills: { available: boolean; count: number; amount: number };
  retentionHeld: { available: boolean; amount: number };
  outstandingPayable: { available: boolean; amount: number };
  complianceExpiries: {
    available: boolean;
    withinDays: number;
    count: number;
    labourLicence: number;
    insurance: number;
  };
};

export async function fetchContractorDashboard(query: {
  projectId?: string;
  withinDays?: number;
}): Promise<ContractorDashboardKpis> {
  const res = await apiGet<ContractorDashboardKpis>(
    '/contractor/dashboard',
    query,
  );
  if (!res.data) {
    throw new Error(res.message || 'Contractor dashboard unavailable');
  }
  return res.data;
}
