import { describe, expect, it } from 'vitest';
import { ContractorAgreementStatus } from './types';
import { resolveContractorAgreementCapabilities } from './roleAccess';
import { resolveAgreementRowActions } from './workflowActions';

describe('resolveAgreementRowActions', () => {
  const manageCaps = resolveContractorAgreementCapabilities((code) =>
    ['contractor_agreement.view', 'contractor_agreement.manage'].includes(code),
  );
  const approveCaps = resolveContractorAgreementCapabilities((code) =>
    [
      'contractor_agreement.view',
      'contractor_agreement.approve',
    ].includes(code),
  );

  it('offers submit on draft when manage permitted', () => {
    const actions = resolveAgreementRowActions(
      {
        id: '1',
        status: ContractorAgreementStatus.Draft,
      } as never,
      manageCaps,
    );
    expect(actions).toContain('submit');
    expect(actions).toContain('edit');
  });

  it('offers approve/reject on pending when approve permitted', () => {
    const actions = resolveAgreementRowActions(
      {
        id: '1',
        status: ContractorAgreementStatus.PendingApproval,
      } as never,
      approveCaps,
    );
    expect(actions).toEqual(['approve', 'reject']);
  });

  it('blocks amend when an open version exists', () => {
    const actions = resolveAgreementRowActions(
      {
        id: '1',
        status: ContractorAgreementStatus.Active,
      } as never,
      manageCaps,
      [{ status: ContractorAgreementStatus.Draft } as never],
    );
    expect(actions).not.toContain('amend');
    expect(actions).toContain('terminate');
  });
});
