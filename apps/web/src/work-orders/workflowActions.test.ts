import { describe, expect, it } from 'vitest';
import { resolveWorkOrderCapabilities } from './roleAccess';
import type { PublicWorkOrder, PublicWorkOrderAmendment } from './types';
import {
  resolveAmendmentActions,
  resolveWorkOrderActions,
} from './workflowActions';

function wo(partial: Partial<PublicWorkOrder>): PublicWorkOrder {
  return {
    id: '1',
    workOrderNumber: 'WO-1',
    activeRevision: 1,
    projectId: 'p1',
    siteId: null,
    contractorId: 'c1',
    rateContractId: null,
    agreementId: null,
    boqScopeLines: [],
    locations: [],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    contractValue: 1000,
    materialResponsibility: 'company',
    labourResponsibility: 'contractor',
    drawingIds: [],
    terms: null,
    attachments: [],
    revisions: [],
    status: 'draft',
    notes: null,
    submittedAt: null,
    approvedAt: null,
    issuedAt: null,
    acceptedAt: null,
    closedAt: null,
    cancelledAt: null,
    ...partial,
  };
}

describe('resolveWorkOrderActions', () => {
  const createCaps = resolveWorkOrderCapabilities((code) =>
    ['work_order.view', 'work_order.create'].includes(code),
  );
  const approveCaps = resolveWorkOrderCapabilities((code) =>
    ['work_order.view', 'work_order.approve'].includes(code),
  );
  const issueCaps = resolveWorkOrderCapabilities((code) =>
    ['work_order.view', 'work_order.issue'].includes(code),
  );
  const closeCaps = resolveWorkOrderCapabilities((code) =>
    ['work_order.view', 'work_order.close'].includes(code),
  );

  it('offers edit/submit on draft when create permitted', () => {
    const actions = resolveWorkOrderActions(wo({ status: 'draft' }), createCaps);
    expect(actions).toEqual(['edit', 'submit']);
  });

  it('offers approve on pending when approve permitted', () => {
    const actions = resolveWorkOrderActions(
      wo({ status: 'pending_approval' }),
      approveCaps,
    );
    expect(actions).toEqual(['approve']);
  });

  it('offers issue on approved when issue permitted', () => {
    const actions = resolveWorkOrderActions(
      wo({ status: 'approved' }),
      issueCaps,
    );
    expect(actions).toEqual(['issue']);
  });

  it('offers amend when create permitted and no open amendment', () => {
    const actions = resolveWorkOrderActions(
      wo({ status: 'in_progress', activeRevision: 1 }),
      createCaps,
    );
    expect(actions).toContain('amend');
    expect(actions).toContain('partially_complete');
    expect(actions).toContain('complete');
  });

  it('blocks amend when an open amendment exists', () => {
    const open: PublicWorkOrderAmendment = {
      id: 'a1',
      amendmentNumber: 'AMD-1',
      workOrderId: '1',
      projectId: 'p1',
      targetRevision: 2,
      baseRevision: 1,
      type: 'revised_value',
      status: 'pending_approval',
      reason: 'scope change',
      proposed: {
        contractValue: 1200,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        boqScopeLines: [],
      },
      submittedAt: null,
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
    };
    const actions = resolveWorkOrderActions(
      wo({ status: 'in_progress', activeRevision: 1 }),
      createCaps,
      [open],
    );
    expect(actions).not.toContain('amend');
  });

  it('offers close on completed when close permitted', () => {
    const actions = resolveWorkOrderActions(
      wo({ status: 'completed' }),
      closeCaps,
    );
    expect(actions).toEqual(['close']);
  });
});

describe('resolveAmendmentActions', () => {
  const approveCaps = resolveWorkOrderCapabilities((code) =>
    ['work_order.view', 'work_order.approve'].includes(code),
  );

  it('offers approve/reject on pending amendment', () => {
    const actions = resolveAmendmentActions(
      {
        id: 'a1',
        status: 'pending_approval',
      } as PublicWorkOrderAmendment,
      approveCaps,
    );
    expect(actions).toEqual(['approve', 'reject']);
  });
});
