import { describe, expect, it } from 'vitest';
import {
  ageDays,
  buildPipelineCards,
  dueDeliveryAgeingRows,
  paymentDueAgeingRows,
  sumPipelineCounts,
  toVendorExceptionRows,
} from './derivePipeline';
import type { PurchaseOrderRow, VendorInvoiceRow } from './types';
import {
  PurchaseOrderStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '@luxaria/shared-types';

describe('buildPipelineCards / drill-down counts', () => {
  it('maps each count onto a card without inventing values', () => {
    const counts = {
      prSubmitted: 3,
      prReviewed: 1,
      prApproved: 2,
      prSourcing: 0,
      poPendingApproval: 4,
      poIssued: 5,
      poPartiallyReceived: 1,
      dueDelivery: 2,
      invoiceExceptions: 1,
      paymentsDue: 6,
    };
    const cards = buildPipelineCards(counts);
    expect(cards).toHaveLength(10);
    expect(cards.find((c) => c.id === 'pr-submitted')?.count).toBe(3);
    expect(cards.find((c) => c.id === 'po-pending')?.count).toBe(4);
    expect(cards.find((c) => c.id === 'due-delivery')?.count).toBe(2);
    expect(cards.find((c) => c.id === 'invoice-exceptions')?.count).toBe(1);
    expect(cards.find((c) => c.id === 'payments-due')?.count).toBe(6);
    expect(sumPipelineCounts(counts)).toBe(25);
  });

  it('preserves zero counts for empty stages', () => {
    const cards = buildPipelineCards({
      prSubmitted: 0,
      prReviewed: 0,
      prApproved: 0,
      prSourcing: 0,
      poPendingApproval: 0,
      poIssued: 0,
      poPartiallyReceived: 0,
      dueDelivery: 0,
      invoiceExceptions: 0,
      paymentsDue: 0,
    });
    expect(cards.every((c) => c.count === 0)).toBe(true);
  });
});

describe('due / payment ageing filters', () => {
  it('ages relative to as-of date', () => {
    expect(ageDays('2026-07-10', '2026-07-20')).toBe(10);
    expect(ageDays('2026-07-20', '2026-07-20')).toBe(0);
  });

  it('keeps only POs due on or before as-of for delivery list', () => {
    const rows: PurchaseOrderRow[] = [
      {
        id: '1',
        purchaseOrderNumber: 'PO-1',
        projectId: 'p1',
        vendorId: 'v1',
        expectedDeliveryDate: '2026-07-15T00:00:00.000Z',
        status: PurchaseOrderStatus.Issued,
        total: 100,
        balanceAmount: 40,
      },
      {
        id: '2',
        purchaseOrderNumber: 'PO-2',
        projectId: 'p1',
        vendorId: 'v1',
        expectedDeliveryDate: '2026-07-25T00:00:00.000Z',
        status: PurchaseOrderStatus.Issued,
        total: 200,
        balanceAmount: 200,
      },
    ];
    const due = dueDeliveryAgeingRows(rows, '2026-07-20');
    expect(due).toHaveLength(1);
    expect(due[0]?.reference).toBe('PO-1');
    expect(due[0]?.ageDays).toBe(5);
  });

  it('keeps payable invoices due on or before as-of', () => {
    const rows: VendorInvoiceRow[] = [
      {
        id: 'a',
        documentNumber: 'VI-1',
        invoiceNumber: 'INV-1',
        vendorId: 'v1',
        projectId: 'p1',
        purchaseOrderId: 'po1',
        dueDate: '2026-07-18',
        totalAmount: 50_000,
        remainingPayable: 50_000,
        matchingStatus: VendorInvoiceMatchingStatus.Matched,
        status: VendorInvoiceStatus.Posted,
        exceptionApproved: false,
        variances: [],
      },
      {
        id: 'b',
        documentNumber: 'VI-2',
        invoiceNumber: 'INV-2',
        vendorId: 'v1',
        projectId: 'p1',
        purchaseOrderId: 'po1',
        dueDate: '2026-07-18',
        totalAmount: 10_000,
        remainingPayable: 0,
        matchingStatus: VendorInvoiceMatchingStatus.Matched,
        status: VendorInvoiceStatus.Paid,
        exceptionApproved: false,
        variances: [],
      },
    ];
    const due = paymentDueAgeingRows(rows, '2026-07-20');
    expect(due).toHaveLength(1);
    expect(due[0]?.reference).toBe('VI-1');
  });

  it('maps invoice exception rows with variance counts', () => {
    const rows = toVendorExceptionRows([
      {
        id: 'x',
        documentNumber: 'VI-X',
        invoiceNumber: 'INV-X',
        vendorId: 'v9',
        projectId: 'p1',
        purchaseOrderId: 'po1',
        dueDate: '2026-07-20',
        totalAmount: 1,
        remainingPayable: 1,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        status: VendorInvoiceStatus.Matching,
        exceptionApproved: false,
        variances: [
          { type: 'quantity', severity: 'exception', message: 'qty' },
          { type: 'rate', severity: 'warning', message: 'rate' },
        ],
      },
    ]);
    expect(rows[0]?.varianceCount).toBe(2);
    expect(rows[0]?.matchingStatus).toBe('exception');
  });
});
