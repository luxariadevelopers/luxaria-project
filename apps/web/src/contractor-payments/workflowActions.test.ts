import { describe, expect, it } from 'vitest';
import { resolveContractorPaymentCapabilities } from './roleAccess';
import { ContractorPaymentStatus } from './types';
import { resolveContractorPaymentActions } from './workflowActions';

const allCaps = resolveContractorPaymentCapabilities(() => true);

describe('resolveContractorPaymentActions', () => {
  it('allows submit on draft', () => {
    expect(
      resolveContractorPaymentActions(
        {
          status: ContractorPaymentStatus.Draft,
          releasedBy: null,
          paymentProof: null,
          transactionReference: 'UTR1',
        },
        allCaps,
      ),
    ).toContain('submit');
  });

  it('allows approve on approval status', () => {
    expect(
      resolveContractorPaymentActions(
        {
          status: ContractorPaymentStatus.Approval,
          releasedBy: null,
          paymentProof: 'doc-1',
          transactionReference: 'UTR1',
        },
        allCaps,
      ),
    ).toContain('approve');
  });

  it('allows release only when proof present and not yet released', () => {
    const actions = resolveContractorPaymentActions(
      {
        status: ContractorPaymentStatus.Released,
        releasedBy: null,
        paymentProof: 'doc-1',
        transactionReference: 'UTR1',
      },
      allCaps,
    );
    expect(actions).toContain('release');
    expect(actions).not.toContain('verify');
  });

  it('allows verify after bank release recorded', () => {
    const actions = resolveContractorPaymentActions(
      {
        status: ContractorPaymentStatus.Released,
        releasedBy: 'user-1',
        paymentProof: 'doc-1',
        transactionReference: 'UTR1',
      },
      allCaps,
    );
    expect(actions).toContain('verify');
    expect(actions).not.toContain('release');
  });

  it('allows post on verified', () => {
    expect(
      resolveContractorPaymentActions(
        {
          status: ContractorPaymentStatus.Verified,
          releasedBy: 'user-1',
          paymentProof: 'doc-1',
          transactionReference: 'UTR1',
        },
        allCaps,
      ),
    ).toContain('post');
  });
});
