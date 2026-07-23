import { describe, expect, it } from 'vitest';
import type { PublicMaterialReconciliation } from './api';
import { resolveMaterialReconciliationCapabilities } from './roleAccess';
import { resolveMaterialReconciliationActions } from './workflowActions';

function row(
  partial: Partial<PublicMaterialReconciliation>,
): PublicMaterialReconciliation {
  return {
    id: '1',
    projectId: 'p1',
    contractorId: 'c1',
    workOrderId: null,
    materialId: 'm1',
    period: { from: '2026-07-01', to: '2026-07-31' },
    issuedQuantity: 100,
    theoreticalConsumption: 80,
    approvedWastage: 5,
    returnedQuantity: 5,
    recoverableDifference: 10,
    unitRate: 50,
    recoveryAmount: 500,
    status: 'draft',
    billId: null,
    recoveryId: null,
    notes: null,
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    ...partial,
  };
}

describe('resolveMaterialReconciliationActions', () => {
  const manageCaps = resolveMaterialReconciliationCapabilities((code) =>
    ['contractor_recovery.view', 'contractor_recovery.manage'].includes(code),
  );
  const viewCaps = resolveMaterialReconciliationCapabilities(
    (code) => code === 'contractor_recovery.view',
  );

  it('offers approve on draft when manage permitted', () => {
    expect(
      resolveMaterialReconciliationActions(row({ status: 'draft' }), manageCaps),
    ).toEqual(['approve']);
  });

  it('offers post_to_bill once approved when manage permitted', () => {
    expect(
      resolveMaterialReconciliationActions(
        row({ status: 'approved' }),
        manageCaps,
      ),
    ).toEqual(['post_to_bill']);
  });

  it('offers nothing once posted', () => {
    expect(
      resolveMaterialReconciliationActions(
        row({ status: 'posted_to_bill' }),
        manageCaps,
      ),
    ).toEqual([]);
  });

  it('offers nothing without manage', () => {
    expect(
      resolveMaterialReconciliationActions(row({ status: 'draft' }), viewCaps),
    ).toEqual([]);
  });
});
