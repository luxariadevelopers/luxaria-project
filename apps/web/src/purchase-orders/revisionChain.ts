import type { PublicPurchaseOrder } from './types';

/** Root id for a revision family (self when first revision). */
export function rootPurchaseOrderId(
  po: Pick<PublicPurchaseOrder, 'id' | 'rootPurchaseOrderId'>,
): string {
  return po.rootPurchaseOrderId ?? po.id;
}

/**
 * Keep only rows that belong to the same revision root, sorted by revision.
 */
export function filterRevisionChain(
  rows: readonly PublicPurchaseOrder[],
  rootId: string,
): PublicPurchaseOrder[] {
  return rows
    .filter(
      (row) =>
        row.id === rootId ||
        row.rootPurchaseOrderId === rootId,
    )
    .slice()
    .sort((a, b) => a.revisionNumber - b.revisionNumber);
}

/** Previous revision in the chain (by revisedFromId or revisionNumber − 1). */
export function findPreviousRevision(
  current: PublicPurchaseOrder,
  chain: readonly PublicPurchaseOrder[],
): PublicPurchaseOrder | null {
  if (current.revisedFromId) {
    const byId = chain.find((row) => row.id === current.revisedFromId);
    if (byId) return byId;
  }
  const prior = chain.find(
    (row) =>
      row.id !== current.id &&
      row.revisionNumber === current.revisionNumber - 1,
  );
  return prior ?? null;
}
