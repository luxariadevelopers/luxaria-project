import { describe, expect, it } from 'vitest';
import {
  buildRevisionComparison,
  receiptProgressPercent,
} from './compareRevisions';
import {
  filterRevisionChain,
  findPreviousRevision,
  rootPurchaseOrderId,
} from './revisionChain';
import { PurchaseOrderStatus, type PublicPurchaseOrder } from './types';

function po(
  overrides: Partial<PublicPurchaseOrder> &
    Pick<
      PublicPurchaseOrder,
      'id' | 'purchaseOrderNumber' | 'revisionNumber' | 'status'
    >,
): PublicPurchaseOrder {
  return {
    projectId: '507f1f77bcf86cd799439011',
    purchaseRequestId: '507f1f77bcf86cd799439012',
    selectedQuotationId: '507f1f77bcf86cd799439013',
    vendorId: '507f1f77bcf86cd799439014',
    orderDate: '2026-07-17',
    expectedDeliveryDate: '2026-08-01',
    billingAddress: {
      line1: 'A',
      line2: null,
      city: 'Chennai',
      state: 'TN',
      pincode: '600001',
      country: 'India',
    },
    deliveryAddress: {
      line1: 'B',
      line2: null,
      city: 'Chennai',
      state: 'TN',
      pincode: '600001',
      country: 'India',
    },
    paymentTerms: 'Net 30',
    items: [
      {
        id: 'line1',
        materialId: '507f1f77bcf86cd799439015',
        materialCode: 'CEM-01',
        materialName: 'Cement',
        quantity: 100,
        unit: 'bag',
        rate: 380,
        tax: 684,
        discount: 0,
        total: 38684,
        receivedQuantity: 0,
        balanceQuantity: 100,
      },
    ],
    subtotal: 38000,
    taxes: 684,
    freight: 500,
    discount: 0,
    total: 39184,
    terms: null,
    rootPurchaseOrderId: null,
    revisedFromId: null,
    approvalRequestId: null,
    issuedBy: null,
    issuedAt: null,
    pdfPath: null,
    pdfGeneratedAt: null,
    balanceQuantity: 100,
    balanceAmount: 39184,
    ...overrides,
  };
}

describe('revision versioning', () => {
  it('resolves root id for first and later revisions', () => {
    const root = po({
      id: 'root1',
      purchaseOrderNumber: 'PO-2026-000001',
      revisionNumber: 1,
      status: PurchaseOrderStatus.Superseded,
    });
    const child = po({
      id: 'child2',
      purchaseOrderNumber: 'PO-2026-000002',
      revisionNumber: 2,
      status: PurchaseOrderStatus.Draft,
      rootPurchaseOrderId: 'root1',
      revisedFromId: 'root1',
    });
    expect(rootPurchaseOrderId(root)).toBe('root1');
    expect(rootPurchaseOrderId(child)).toBe('root1');
  });

  it('filters and sorts the revision chain by revisionNumber', () => {
    const rows = [
      po({
        id: 'b',
        purchaseOrderNumber: 'PO-2',
        revisionNumber: 2,
        status: PurchaseOrderStatus.Draft,
        rootPurchaseOrderId: 'a',
        revisedFromId: 'a',
      }),
      po({
        id: 'a',
        purchaseOrderNumber: 'PO-1',
        revisionNumber: 1,
        status: PurchaseOrderStatus.Superseded,
      }),
      po({
        id: 'other',
        purchaseOrderNumber: 'PO-X',
        revisionNumber: 1,
        status: PurchaseOrderStatus.Issued,
        purchaseRequestId: '507f1f77bcf86cd799439099',
      }),
    ];
    const chain = filterRevisionChain(rows, 'a');
    expect(chain.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('finds previous revision via revisedFromId', () => {
    const previous = po({
      id: 'a',
      purchaseOrderNumber: 'PO-1',
      revisionNumber: 1,
      status: PurchaseOrderStatus.Superseded,
      total: 39184,
    });
    const current = po({
      id: 'b',
      purchaseOrderNumber: 'PO-2',
      revisionNumber: 2,
      status: PurchaseOrderStatus.Draft,
      rootPurchaseOrderId: 'a',
      revisedFromId: 'a',
      freight: 800,
      total: 39484,
    });
    expect(findPreviousRevision(current, [previous, current])?.id).toBe('a');
  });

  it('buildRevisionComparison highlights header and line deltas', () => {
    const previous = po({
      id: 'a',
      purchaseOrderNumber: 'PO-1',
      revisionNumber: 1,
      status: PurchaseOrderStatus.Superseded,
      freight: 500,
      total: 39184,
    });
    const current = po({
      id: 'b',
      purchaseOrderNumber: 'PO-2',
      revisionNumber: 2,
      status: PurchaseOrderStatus.Draft,
      rootPurchaseOrderId: 'a',
      revisedFromId: 'a',
      freight: 800,
      total: 39484,
      items: [
        {
          id: 'line1',
          materialId: '507f1f77bcf86cd799439015',
          materialCode: 'CEM-01',
          materialName: 'Cement',
          quantity: 120,
          unit: 'bag',
          rate: 380,
          tax: 684,
          discount: 0,
          total: 46284,
          receivedQuantity: 0,
          balanceQuantity: 120,
        },
      ],
    });

    const comparison = buildRevisionComparison(previous, current);
    expect(comparison.previousRevisionNumber).toBe(1);
    expect(comparison.currentRevisionNumber).toBe(2);
    expect(comparison.changedHeaderCount).toBeGreaterThan(0);
    expect(
      comparison.header.find((h) => h.field === 'freight')?.changed,
    ).toBe(true);
    expect(comparison.changedLineCount).toBe(1);
    expect(comparison.lines[0]?.previousQty).toBe(100);
    expect(comparison.lines[0]?.currentQty).toBe(120);
  });

  it('receiptProgressPercent clamps and computes percent', () => {
    expect(receiptProgressPercent(100, 40)).toBe(40);
    expect(receiptProgressPercent(100, 100)).toBe(100);
    expect(receiptProgressPercent(100, 150)).toBe(100);
    expect(receiptProgressPercent(0, 10)).toBe(0);
  });
});
