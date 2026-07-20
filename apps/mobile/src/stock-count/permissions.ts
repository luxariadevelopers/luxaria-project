/**
 * Nest catalog permissions for stock counts.
 * Prompt aliases `stock_count.create` / `stock_count.submit` are not catalogued.
 */
export const STOCK_COUNT_VIEW_PERMISSION = 'stock.view';
export const STOCK_COUNT_CREATE_SUBMIT_PERMISSION = 'stock.adjust';

export function canViewStockCounts(
  hasPermission: (permission: string) => boolean,
): boolean {
  return hasPermission(STOCK_COUNT_VIEW_PERMISSION);
}

export function canCreateSubmitStockCounts(
  hasPermission: (permission: string) => boolean,
): boolean {
  return hasPermission(STOCK_COUNT_CREATE_SUBMIT_PERMISSION);
}
