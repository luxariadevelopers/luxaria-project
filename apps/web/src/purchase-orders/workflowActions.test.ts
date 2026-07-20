import { describe, expect, it } from 'vitest';
import type { PurchaseOrderCapabilities } from './roleAccess';
import { PurchaseOrderStatus, type PublicPurchaseOrder } from './types';
import { resolvePurchaseOrderDetailActions } from './workflowActions';

const allCaps: PurchaseOrderCapabilities = {
  canView: true,
  canOrder: true,
  canCreate: true,
  canSubmit: true,
  canRevise: true,
  canCancel: true,
  canClose: true,
  canApprove: true,
  canIssueLifecycle: true,
  canReceive: true,
  canViewQuotations: true,
};

function row(
  overrides: Partial<PublicPurchaseOrder> &
    Pick<PublicPurchaseOrder, 'status'>,
): Pick<PublicPurchaseOrder, 'status' | 'balanceQuantity' | 'items'> {
  return {
    balanceQuantity: 10,
    items: [
      {
        id: 'l1',
        materialId: 'm1',
        materialCode: null,
        materialName: null,
        quantity: 10,
        unit: 'bag',
        rate: 1,
        tax: 0,
        discount: 0,
        total: 10,
        receivedQuantity: 0,
        balanceQuantity: 10,
      },
    ],
    ...overrides,
  };
}

describe('resolvePurchaseOrderDetailActions', () => {
  it('allows submit on draft', () => {
    expect(
      resolvePurchaseOrderDetailActions(
        row({ status: PurchaseOrderStatus.Draft }),
        allCaps,
      ),
    ).toEqual(expect.arrayContaining(['submit', 'cancel', 'export_pdf']));
  });

  it('allows approve/reject on pending approval (issue via approve)', () => {
    const actions = resolvePurchaseOrderDetailActions(
      row({ status: PurchaseOrderStatus.PendingApproval }),
      allCaps,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['approve', 'reject', 'cancel', 'export_pdf']),
    );
    expect(actions).not.toContain('revise');
  });

  it('allows revise only on issued', () => {
    expect(
      resolvePurchaseOrderDetailActions(
        row({ status: PurchaseOrderStatus.Issued }),
        allCaps,
      ),
    ).toEqual(
      expect.arrayContaining(['revise', 'cancel', 'close', 'export_pdf']),
    );
  });

  it('blocks cancel when partially received with receipts', () => {
    const actions = resolvePurchaseOrderDetailActions(
      row({
        status: PurchaseOrderStatus.PartiallyReceived,
        items: [
          {
            id: 'l1',
            materialId: 'm1',
            materialCode: null,
            materialName: null,
            quantity: 10,
            unit: 'bag',
            rate: 1,
            tax: 0,
            discount: 0,
            total: 10,
            receivedQuantity: 4,
            balanceQuantity: 6,
          },
        ],
      }),
      allCaps,
    );
    expect(actions).not.toContain('cancel');
    expect(actions).toContain('close');
  });

  it('respects missing permissions', () => {
    expect(
      resolvePurchaseOrderDetailActions(
        row({ status: PurchaseOrderStatus.Issued }),
        { ...allCaps, canRevise: false, canCancel: false, canClose: false },
      ),
    ).toEqual(['export_pdf']);
  });
});
