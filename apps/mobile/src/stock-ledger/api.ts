import { apiGet } from '@/api/client';

export type StockBalanceRow = {
  id: string;
  projectId: string;
  materialId: string;
  materialCode?: string | null;
  materialName?: string | null;
  location?: string | null;
  quantityInBaseUnit: number;
};

export type StockTxnRow = {
  id: string;
  projectId: string;
  materialId: string;
  transactionDate: string;
  transactionType: string;
  quantityIn: number;
  quantityOut: number;
};

export async function listStockBalances(params: {
  projectId: string;
  page?: number;
  limit?: number;
}): Promise<StockBalanceRow[]> {
  // Nest balance endpoint is single-material; list uses GET /stock-ledger with filters when available.
  // Prefer balances via stock-ledger list shaped as transactions — also expose balance helper.
  const res = await apiGet<StockBalanceRow[]>('/stock-ledger', {
    projectId: params.projectId,
    page: params.page ?? 1,
    limit: params.limit ?? 50,
  });
  return (res.data ?? []).map((row, index) => ({
    id: String((row as { id?: string }).id ?? index),
    projectId: String((row as { projectId?: string }).projectId ?? params.projectId),
    materialId: String((row as { materialId?: string }).materialId ?? ''),
    materialCode: (row as { materialCode?: string | null }).materialCode ?? null,
    materialName: (row as { materialName?: string | null }).materialName ?? null,
    location: (row as { location?: string | null }).location ?? null,
    quantityInBaseUnit: Number(
      (row as { quantityInBaseUnit?: number; quantity?: number }).quantityInBaseUnit ??
        (row as { quantity?: number }).quantity ??
        (row as { quantityIn?: number }).quantityIn ??
        0,
    ),
  }));
}
