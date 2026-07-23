export type StockReservationCapabilities = {
  /** List / get / available — Nest `stock.view` */
  canView: boolean;
  /** Create / release / cancel — Nest `stock.reserve` */
  canReserve: boolean;
};

/**
 * Nest RBAC — exact codes from Stock Reservations controller.
 */
export function resolveStockReservationCapabilities(
  hasPermission: (code: string) => boolean,
): StockReservationCapabilities {
  return {
    canView: hasPermission('stock.view'),
    canReserve: hasPermission('stock.reserve'),
  };
}
