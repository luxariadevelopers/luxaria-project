import type { DrillDownLink, LedgerLineRow } from './types';

export type BookTransactionLink = {
  to: string;
  label: string;
};

const MONGO_OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

/**
 * Prefer Nest drill-down journalId; fall back to row.journalId.
 * Maps API journal hrefs to the in-app journal detail route.
 */
export function resolveBookTransactionLink(
  row: Pick<LedgerLineRow, 'journalId' | 'journalNumber' | 'drillDown'>,
): BookTransactionLink | null {
  const fromDrill = row.drillDown?.find(
    (link) => link.journalId && MONGO_OBJECT_ID_RE.test(String(link.journalId)),
  );
  const journalId = String(fromDrill?.journalId ?? row.journalId ?? '').trim();
  if (!MONGO_OBJECT_ID_RE.test(journalId)) {
    return null;
  }
  const label =
    fromDrill?.label?.trim() ||
    (row.journalNumber ? `Journal ${row.journalNumber}` : `Journal ${journalId}`);
  return {
    to: `/accounting/journals/${journalId}`,
    label,
  };
}

export function primaryDrillLabel(links: DrillDownLink[] | undefined): string {
  if (!links?.length) return '—';
  return links[0]?.label?.trim() || '—';
}
