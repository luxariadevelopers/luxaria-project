import type {
  AgeingRow,
  PipelineCardModel,
  PurchaseOrderRow,
  PurchaseRequestRow,
  VendorExceptionRow,
  VendorInvoiceRow,
} from './types';

/** UTC calendar day key (YYYY-MM-DD) from an ISO / date string. */
export function toDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return value.slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

/** Whole days between due date and as-of (positive = overdue / past due). */
export function ageDays(dueDate: string, asOfDate: string): number {
  const due = Date.parse(`${toDateKey(dueDate)}T00:00:00.000Z`);
  const asOf = Date.parse(`${toDateKey(asOfDate)}T00:00:00.000Z`);
  if (Number.isNaN(due) || Number.isNaN(asOf)) {
    return 0;
  }
  return Math.floor((asOf - due) / 86_400_000);
}

export function isDueOnOrBefore(dueDate: string, asOfDate: string): boolean {
  return toDateKey(dueDate) <= toDateKey(asOfDate);
}

export type PipelineCountInput = {
  prSubmitted: number;
  prReviewed: number;
  prApproved: number;
  prSourcing: number;
  poPendingApproval: number;
  poIssued: number;
  poPartiallyReceived: number;
  dueDelivery: number;
  invoiceExceptions: number;
  paymentsDue: number;
};

/**
 * Build pipeline cards from drill-down counts (meta.total / filtered lengths).
 * Counts are the source of truth for card display — never invent zeros from UI.
 */
export function buildPipelineCards(
  counts: PipelineCountInput,
): PipelineCardModel[] {
  return [
    {
      id: 'pr-submitted',
      title: 'PR submitted',
      count: counts.prSubmitted,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'pr-reviewed',
      title: 'PR reviewed',
      count: counts.prReviewed,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'pr-approved',
      title: 'PR approved',
      count: counts.prApproved,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'pr-sourcing',
      title: 'PR sourcing',
      count: counts.prSourcing,
      amount: null,
      drillPath: '/procurement/purchase-requests',
      drillLabel: 'Purchase requests',
    },
    {
      id: 'po-pending',
      title: 'PO pending approval',
      count: counts.poPendingApproval,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'po-issued',
      title: 'PO issued',
      count: counts.poIssued,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'po-partial',
      title: 'PO partially received',
      count: counts.poPartiallyReceived,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'due-delivery',
      title: 'Due delivery',
      count: counts.dueDelivery,
      amount: null,
      drillPath: '/procurement/purchase-orders',
      drillLabel: 'Purchase orders',
    },
    {
      id: 'invoice-exceptions',
      title: 'Invoice exceptions',
      count: counts.invoiceExceptions,
      amount: null,
      drillPath: '/vendors',
      drillLabel: 'Vendors',
    },
    {
      id: 'payments-due',
      title: 'Payments due',
      count: counts.paymentsDue,
      amount: null,
      drillPath: '/vendors',
      drillLabel: 'Vendors',
    },
  ];
}

export function pendingPrAgeingRows(
  items: readonly PurchaseRequestRow[],
  asOfDate: string,
): AgeingRow[] {
  return [...items]
    .map((row) => ({
      id: row.id,
      reference: row.requestNumber,
      status: row.status,
      dueDate: toDateKey(row.requiredByDate),
      ageDays: ageDays(row.requiredByDate, asOfDate),
      amount: row.estimatedTotal,
      href: `/procurement/purchase-requests/${row.id}`,
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function dueDeliveryAgeingRows(
  items: readonly PurchaseOrderRow[],
  asOfDate: string,
): AgeingRow[] {
  return items
    .filter((row) => isDueOnOrBefore(row.expectedDeliveryDate, asOfDate))
    .map((row) => ({
      id: row.id,
      reference: row.purchaseOrderNumber,
      status: row.status,
      dueDate: toDateKey(row.expectedDeliveryDate),
      ageDays: ageDays(row.expectedDeliveryDate, asOfDate),
      amount: row.balanceAmount,
      href: '/procurement/purchase-orders',
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function paymentDueAgeingRows(
  items: readonly VendorInvoiceRow[],
  asOfDate: string,
): AgeingRow[] {
  return items
    .filter(
      (row) =>
        row.remainingPayable > 0 &&
        isDueOnOrBefore(row.dueDate, asOfDate),
    )
    .map((row) => ({
      id: row.id,
      reference: row.documentNumber || row.invoiceNumber,
      status: row.status,
      dueDate: toDateKey(row.dueDate),
      ageDays: ageDays(row.dueDate, asOfDate),
      amount: row.remainingPayable,
      href: '/vendors',
    }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function toVendorExceptionRows(
  items: readonly VendorInvoiceRow[],
): VendorExceptionRow[] {
  return items.map((row) => ({
    id: row.id,
    documentNumber: row.documentNumber,
    invoiceNumber: row.invoiceNumber,
    vendorId: row.vendorId,
    matchingStatus: row.matchingStatus,
    status: row.status,
    remainingPayable: row.remainingPayable,
    varianceCount: row.variances?.length ?? 0,
    exceptionApproved: row.exceptionApproved,
  }));
}

/** Sum of pipeline stage counts (for summary strip / tests). */
export function sumPipelineCounts(counts: PipelineCountInput): number {
  return (
    counts.prSubmitted +
    counts.prReviewed +
    counts.prApproved +
    counts.prSourcing +
    counts.poPendingApproval +
    counts.poIssued +
    counts.poPartiallyReceived +
    counts.dueDelivery +
    counts.invoiceExceptions +
    counts.paymentsDue
  );
}
