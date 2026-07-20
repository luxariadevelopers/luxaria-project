import { describe, expect, it } from 'vitest';
import {
  MaterialUnit,
  PurchaseRequestLineStatus,
  type PublicPurchaseRequestItem,
} from './types';
import {
  APPROVED_QTY_EXCEEDS_MESSAGE,
  APPROVE_NEEDS_LINE_MESSAGE,
  assertApprovedQuantity,
  isApprovedQuantityValid,
  validateApprovePayload,
} from './validation';

function line(
  overrides: Partial<PublicPurchaseRequestItem> & {
    id: string;
    requestedQuantity: number;
  },
): PublicPurchaseRequestItem {
  return {
    materialId: 'm1',
    materialCode: 'CEM',
    materialName: 'Cement',
    unit: MaterialUnit.Bag,
    currentStock: 10,
    reorderLevel: 5,
    minimumStock: 2,
    maximumStock: 100,
    estimatedRate: 380,
    boqItemId: null,
    remarks: null,
    approvedQuantity: null,
    lineStatus: PurchaseRequestLineStatus.Pending,
    warnings: [],
    estimatedAmount: null,
    ...overrides,
  };
}

describe('assertApprovedQuantity', () => {
  it('allows 0 and quantities up to requested', () => {
    expect(() => assertApprovedQuantity(0, 100)).not.toThrow();
    expect(() => assertApprovedQuantity(60, 100)).not.toThrow();
    expect(() => assertApprovedQuantity(100, 100)).not.toThrow();
  });

  it('rejects approved qty greater than requested', () => {
    expect(() => assertApprovedQuantity(101, 100)).toThrow(
      APPROVED_QTY_EXCEEDS_MESSAGE,
    );
    expect(isApprovedQuantityValid(101, 100)).toBe(false);
    expect(isApprovedQuantityValid(80, 100)).toBe(true);
  });
});

describe('validateApprovePayload — partial approval', () => {
  const items = [
    line({ id: 'line-a', requestedQuantity: 100 }),
    line({ id: 'line-b', requestedQuantity: 50 }),
  ];

  it('accepts partial approval on one line and full on another', () => {
    const result = validateApprovePayload(items, [
      { lineId: 'line-a', approvedQuantity: 60 },
      { lineId: 'line-b', approvedQuantity: 50 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({
      items: [
        { lineId: 'line-a', approvedQuantity: 60 },
        { lineId: 'line-b', approvedQuantity: 50 },
      ],
    });
  });

  it('allows rejecting a line with 0 while approving another', () => {
    const result = validateApprovePayload(items, [
      { lineId: 'line-a', approvedQuantity: 80 },
      { lineId: 'line-b', approvedQuantity: 0 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.payload?.items).toEqual([
      { lineId: 'line-a', approvedQuantity: 80 },
      { lineId: 'line-b', approvedQuantity: 0 },
    ]);
  });

  it('rejects when approved qty exceeds requested on any line', () => {
    const result = validateApprovePayload(items, [
      { lineId: 'line-a', approvedQuantity: 120 },
      { lineId: 'line-b', approvedQuantity: 50 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.lineErrors['line-a']).toBe(APPROVED_QTY_EXCEEDS_MESSAGE);
    expect(result.payload).toBeNull();
  });

  it('requires at least one line with approvedQuantity > 0', () => {
    const result = validateApprovePayload(items, [
      { lineId: 'line-a', approvedQuantity: 0 },
      { lineId: 'line-b', approvedQuantity: 0 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.formError).toBe(APPROVE_NEEDS_LINE_MESSAGE);
  });
});
