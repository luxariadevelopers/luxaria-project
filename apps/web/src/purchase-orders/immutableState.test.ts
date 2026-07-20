import { describe, expect, it } from 'vitest';
import {
  assertPurchaseOrderNotSilentlyEditable,
  canRevisePurchaseOrderStatus,
  isPurchaseOrderSilentlyEditable,
} from './immutableState';
import { PurchaseOrderStatus } from './types';

describe('immutableState — issued POs cannot be silently edited', () => {
  it('allows silent edit only for draft and rejected', () => {
    expect(isPurchaseOrderSilentlyEditable(PurchaseOrderStatus.Draft)).toBe(
      true,
    );
    expect(
      isPurchaseOrderSilentlyEditable(PurchaseOrderStatus.Rejected),
    ).toBe(true);
    expect(isPurchaseOrderSilentlyEditable(PurchaseOrderStatus.Issued)).toBe(
      false,
    );
    expect(
      isPurchaseOrderSilentlyEditable(PurchaseOrderStatus.PendingApproval),
    ).toBe(false);
  });

  it('assert fails for issued with revise guidance', () => {
    const result = assertPurchaseOrderNotSilentlyEditable(
      PurchaseOrderStatus.Issued,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/cannot be edited in place/i);
      expect(result.message).toMatch(/Revise/i);
    }
  });

  it('only issued status may be revised', () => {
    expect(canRevisePurchaseOrderStatus(PurchaseOrderStatus.Issued)).toBe(
      true,
    );
    expect(
      canRevisePurchaseOrderStatus(PurchaseOrderStatus.PartiallyReceived),
    ).toBe(false);
    expect(canRevisePurchaseOrderStatus(PurchaseOrderStatus.Draft)).toBe(
      false,
    );
  });
});
