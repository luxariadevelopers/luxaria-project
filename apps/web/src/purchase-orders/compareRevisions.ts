import type { PublicPurchaseOrder, PublicPurchaseOrderItem } from './types';

export type RevisionFieldDelta = {
  field: string;
  label: string;
  previous: string;
  current: string;
  changed: boolean;
};

export type RevisionLineDelta = {
  key: string;
  materialLabel: string;
  previousQty: number | null;
  currentQty: number | null;
  previousRate: number | null;
  currentRate: number | null;
  previousTotal: number | null;
  currentTotal: number | null;
  changed: boolean;
};

export type RevisionComparison = {
  previousRevisionNumber: number;
  currentRevisionNumber: number;
  header: RevisionFieldDelta[];
  lines: RevisionLineDelta[];
  changedHeaderCount: number;
  changedLineCount: number;
};

const MONEY_EPS = 0.005;
const QTY_EPS = 1e-6;

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

function qty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return String(value);
}

function changedMoney(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > MONEY_EPS;
}

function changedQty(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  return Math.abs(a - b) > QTY_EPS;
}

function materialKey(item: PublicPurchaseOrderItem): string {
  return item.materialId;
}

function materialLabel(item: PublicPurchaseOrderItem): string {
  const code = item.materialCode?.trim();
  const name = item.materialName?.trim();
  if (code && name) return `${code} · ${name}`;
  return name || code || item.materialId;
}

/**
 * Compare two PO revisions for the detail Versions tab.
 * Used after `POST /:id/revise` creates a new draft version.
 */
export function buildRevisionComparison(
  previous: PublicPurchaseOrder,
  current: PublicPurchaseOrder,
): RevisionComparison {
  const headerDefs: Array<{
    field: string;
    label: string;
    previous: string;
    current: string;
    changed: boolean;
  }> = [
    {
      field: 'purchaseOrderNumber',
      label: 'PO number',
      previous: previous.purchaseOrderNumber,
      current: current.purchaseOrderNumber,
      changed: previous.purchaseOrderNumber !== current.purchaseOrderNumber,
    },
    {
      field: 'orderDate',
      label: 'Order date',
      previous: previous.orderDate,
      current: current.orderDate,
      changed: previous.orderDate !== current.orderDate,
    },
    {
      field: 'expectedDeliveryDate',
      label: 'Expected delivery',
      previous: previous.expectedDeliveryDate,
      current: current.expectedDeliveryDate,
      changed: previous.expectedDeliveryDate !== current.expectedDeliveryDate,
    },
    {
      field: 'paymentTerms',
      label: 'Payment terms',
      previous: previous.paymentTerms?.trim() || '—',
      current: current.paymentTerms?.trim() || '—',
      changed:
        (previous.paymentTerms?.trim() || '') !==
        (current.paymentTerms?.trim() || ''),
    },
    {
      field: 'subtotal',
      label: 'Subtotal',
      previous: money(previous.subtotal),
      current: money(current.subtotal),
      changed: changedMoney(previous.subtotal, current.subtotal),
    },
    {
      field: 'taxes',
      label: 'Taxes',
      previous: money(previous.taxes),
      current: money(current.taxes),
      changed: changedMoney(previous.taxes, current.taxes),
    },
    {
      field: 'freight',
      label: 'Freight',
      previous: money(previous.freight),
      current: money(current.freight),
      changed: changedMoney(previous.freight, current.freight),
    },
    {
      field: 'discount',
      label: 'Discount',
      previous: money(previous.discount),
      current: money(current.discount),
      changed: changedMoney(previous.discount, current.discount),
    },
    {
      field: 'total',
      label: 'Total',
      previous: money(previous.total),
      current: money(current.total),
      changed: changedMoney(previous.total, current.total),
    },
  ];

  const prevByMaterial = new Map(
    previous.items.map((item) => [materialKey(item), item]),
  );
  const currByMaterial = new Map(
    current.items.map((item) => [materialKey(item), item]),
  );
  const keys = new Set([
    ...prevByMaterial.keys(),
    ...currByMaterial.keys(),
  ]);

  const lines: RevisionLineDelta[] = [...keys].map((key) => {
    const prev = prevByMaterial.get(key) ?? null;
    const curr = currByMaterial.get(key) ?? null;
    const label = materialLabel(curr ?? prev!);
    const previousQty = prev?.quantity ?? null;
    const currentQty = curr?.quantity ?? null;
    const previousRate = prev?.rate ?? null;
    const currentRate = curr?.rate ?? null;
    const previousTotal = prev?.total ?? null;
    const currentTotal = curr?.total ?? null;
    const changed =
      changedQty(previousQty, currentQty) ||
      changedMoney(previousRate, currentRate) ||
      changedMoney(previousTotal, currentTotal) ||
      (prev?.unit ?? null) !== (curr?.unit ?? null);
    return {
      key,
      materialLabel: label,
      previousQty,
      currentQty,
      previousRate,
      currentRate,
      previousTotal,
      currentTotal,
      changed,
    };
  });

  lines.sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));

  return {
    previousRevisionNumber: previous.revisionNumber,
    currentRevisionNumber: current.revisionNumber,
    header: headerDefs,
    lines,
    changedHeaderCount: headerDefs.filter((h) => h.changed).length,
    changedLineCount: lines.filter((l) => l.changed).length,
  };
}

/** Convenience for tests / receipts progress — ordered qty vs received. */
export function receiptProgressPercent(
  ordered: number,
  received: number,
): number {
  if (!Number.isFinite(ordered) || ordered <= 0) return 0;
  if (!Number.isFinite(received) || received <= 0) return 0;
  return Math.min(100, Math.round((received / ordered) * 1000) / 10);
}

export function formatQtyPair(
  previous: number | null,
  current: number | null,
): string {
  return `${qty(previous)} → ${qty(current)}`;
}
