/**
 * Map Nest `referenceType` + `referenceId` to in-app routes when available.
 * Unknown types still show the raw reference for audit tracing.
 */

export type StockLedgerTransactionLink = {
  to: string;
  label: string;
};

const MONGO_OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function resolveStockLedgerTransactionLink(
  referenceType: string,
  referenceId: string | null,
): StockLedgerTransactionLink | null {
  if (!referenceId?.trim() || !MONGO_OBJECT_ID_RE.test(referenceId.trim())) {
    return null;
  }
  const id = referenceId.trim();
  const type = referenceType.trim().toLowerCase();

  switch (type) {
    case 'goods_receipt':
      return {
        to: `/inventory/grns/${id}`,
        label: `GRN ${id}`,
      };
    case 'stock_count':
      return {
        to: `/inventory/stock-counts/${id}`,
        label: `Stock count ${id}`,
      };
    default:
      return null;
  }
}

export function formatReferenceLabel(
  referenceType: string,
  referenceId: string | null,
): string {
  const type = referenceType.trim() || '—';
  if (!referenceId) return type;
  return `${type} · ${referenceId}`;
}
