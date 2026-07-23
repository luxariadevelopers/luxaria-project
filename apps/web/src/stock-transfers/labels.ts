import { StockTransferScope, StockTransferStatus } from './types';

export function stockTransferStatusLabel(status: string): string {
  switch (status) {
    case StockTransferStatus.Draft:
      return 'Draft';
    case StockTransferStatus.Submitted:
      return 'Submitted';
    case StockTransferStatus.Posted:
      return 'Posted';
    case StockTransferStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function stockTransferScopeLabel(scope: string): string {
  switch (scope) {
    case StockTransferScope.WarehouseToWarehouse:
      return 'Warehouse → warehouse';
    case StockTransferScope.SiteToSite:
      return 'Site → site';
    case StockTransferScope.ProjectToProject:
      return 'Project → project';
    case StockTransferScope.WarehouseToSite:
      return 'Warehouse → site';
    default:
      return scope.replace(/_/g, ' ');
  }
}

export const STOCK_TRANSFER_SCOPE_OPTIONS = Object.values(StockTransferScope);

export function materialUnitLabel(unit: string): string {
  return unit.replace(/_/g, ' ');
}

export function canPostStockTransfer(status: string): boolean {
  return (
    status === StockTransferStatus.Draft ||
    status === StockTransferStatus.Submitted
  );
}
