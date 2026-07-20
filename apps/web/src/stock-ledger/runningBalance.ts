import type { PublicStockLedgerEntry, StockLedgerRow } from './types';

function toSortKey(entry: PublicStockLedgerEntry): string {
  const date = entry.transactionDate.slice(0, 10);
  const created = entry.createdAt ?? '';
  return `${date}\0${created}\0${entry.id}`;
}

/**
 * Chronological running balance in **base units** within `entries`.
 * Uses Nest `baseUnitQuantity` (signed: +in / −out). Not a server field —
 * computed for the filtered set so each movement is traceable to a balance.
 */
export function withRunningBalances(
  entries: readonly PublicStockLedgerEntry[],
): StockLedgerRow[] {
  const chronological = [...entries].sort((a, b) =>
    toSortKey(a).localeCompare(toSortKey(b)),
  );

  let balance = 0;
  const byId = new Map<string, number>();
  for (const entry of chronological) {
    balance += entry.baseUnitQuantity;
    byId.set(entry.id, balance);
  }

  return entries.map((entry) => ({
    ...entry,
    runningBalance: byId.get(entry.id) ?? null,
  }));
}

/** Filter by inclusive YYYY-MM-DD date range (client-side; Nest has no date query). */
export function filterEntriesByDateRange(
  entries: readonly PublicStockLedgerEntry[],
  dateFrom: string,
  dateTo: string,
): PublicStockLedgerEntry[] {
  const from = dateFrom.trim();
  const to = dateTo.trim();
  if (!from && !to) return [...entries];

  return entries.filter((entry) => {
    const key = entry.transactionDate.slice(0, 10);
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
}
