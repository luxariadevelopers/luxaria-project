import { describe, expect, it } from 'vitest';
import type { PublicContractorRecovery } from './api';
import { resolveContractorRecoveryCapabilities } from './roleAccess';
import { resolveContractorRecoveryActions } from './workflowActions';

function recovery(
  partial: Partial<PublicContractorRecovery>,
): PublicContractorRecovery {
  return {
    id: '1',
    projectId: 'p1',
    contractorId: 'c1',
    workOrderId: null,
    type: 'manual',
    amount: 100,
    description: null,
    notes: null,
    billId: null,
    materialReconciliationId: null,
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    postedBy: null,
    postedAt: null,
    ...partial,
  };
}

describe('resolveContractorRecoveryActions', () => {
  const manageCaps = resolveContractorRecoveryCapabilities((code) =>
    ['contractor_recovery.view', 'contractor_recovery.manage'].includes(code),
  );
  const viewCaps = resolveContractorRecoveryCapabilities((code) =>
    code === 'contractor_recovery.view',
  );

  it('offers approve on draft when manage permitted', () => {
    expect(
      resolveContractorRecoveryActions(recovery({ status: 'draft' }), manageCaps),
    ).toEqual(['approve']);
  });

  it('offers post on approved when manage permitted', () => {
    expect(
      resolveContractorRecoveryActions(
        recovery({ status: 'approved' }),
        manageCaps,
      ),
    ).toEqual(['post']);
  });

  it('offers nothing when only view permitted', () => {
    expect(
      resolveContractorRecoveryActions(recovery({ status: 'draft' }), viewCaps),
    ).toEqual([]);
  });

  it('offers nothing once posted', () => {
    expect(
      resolveContractorRecoveryActions(
        recovery({ status: 'posted' }),
        manageCaps,
      ),
    ).toEqual([]);
  });
});
