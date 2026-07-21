import { apiGet } from '@/api/client';

export type InventoryDashboardSummary = {
  projectId: string;
  stockValue: number;
  skuWithStock: number;
  criticalStock: number;
  reorderItems: number;
  slowMoving: number;
  deadStock: number;
  fastMoving: number;
  activeReservations: number;
  materialConsumption30d: { quantity: number; value: number };
  varianceAdjustments30d: number;
  warehouseUtilization: number | null;
};

export async function fetchInventoryDashboard(
  projectId: string,
): Promise<InventoryDashboardSummary> {
  const res = await apiGet<InventoryDashboardSummary>('/inventory/dashboard', {
    projectId,
  });
  if (!res.data) {
    throw new Error(res.message || 'Inventory dashboard unavailable');
  }
  return res.data;
}
