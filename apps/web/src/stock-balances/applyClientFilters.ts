import { isLowStock } from './lowStock';
import type { StockBalanceFilterState, StockBalanceRow } from './types';

/**
 * Client filters after fetch. Project isolation is enforced separately —
 * never mix rows from another project into the table.
 */
export function applyStockBalanceClientFilters(
  rows: readonly StockBalanceRow[],
  filters: Pick<StockBalanceFilterState, 'search' | 'lowStockOnly'>,
): StockBalanceRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.lowStockOnly && !isLowStock(row)) {
      return false;
    }
    if (!q) return true;
    const code = (row.materialCode ?? '').toLowerCase();
    const name = (row.materialName ?? '').toLowerCase();
    return code.includes(q) || name.includes(q);
  });
}

/**
 * Hard project isolation — drop any row whose projectId ≠ active project.
 * Forecast/balance APIs are project-scoped; this is a defence-in-depth guard.
 */
export function isolateStockRowsToProject(
  rows: readonly StockBalanceRow[],
  projectId: string,
): StockBalanceRow[] {
  if (!projectId) return [];
  return rows.filter((row) => row.projectId === projectId);
}
