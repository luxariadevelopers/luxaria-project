import { describe, expect, it } from 'vitest';
import type { PettyCashTransferCapabilities } from './roleAccess';
import {
  PettyCashFundTransferStatus,
  type PublicPettyCashFundTransfer,
} from './types';
import {
  canVerifyTransfer,
  isTransferPosted,
  resolveTransferRowActions,
} from './workflowActions';

const fullCaps: PettyCashTransferCapabilities = {
  canView: true,
  canFund: true,
  canCreate: true,
  canVerify: true,
  canPost: true,
  canCancel: true,
  canViewBankAccounts: true,
  canUploadDocument: true,
};

function transfer(
  partial: Partial<PublicPettyCashFundTransfer> &
    Pick<PublicPettyCashFundTransfer, 'id' | 'status'>,
): PublicPettyCashFundTransfer {
  return {
    transferNumber: 'PCF-2026-000001',
    projectId: 'p1',
    requestId: 'req1',
    sourceBankAccountId: 'bank1',
    destinationPettyCashAccountId: 'cash1',
    transferDate: '2026-07-01T00:00:00.000Z',
    amount: 25_000,
    transactionReference: 'NEFT-1',
    paymentProof: 'doc-1',
    journalEntryId: null,
    verifiedBy: null,
    verifiedAt: null,
    postedBy: null,
    postedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    cancellationReason: null,
    ...partial,
  };
}

describe('resolveTransferRowActions — posting', () => {
  it('allows post only from verified', () => {
    expect(
      resolveTransferRowActions(
        transfer({ id: '1', status: PettyCashFundTransferStatus.Verified }),
        fullCaps,
      ),
    ).toContain('post');
    expect(
      resolveTransferRowActions(
        transfer({ id: '2', status: PettyCashFundTransferStatus.Draft }),
        fullCaps,
      ),
    ).not.toContain('post');
  });

  it('marks posted transfers as posted and not postable', () => {
    const posted = transfer({
      id: '3',
      status: PettyCashFundTransferStatus.Posted,
      journalEntryId: 'j1',
      postedAt: '2026-07-10T00:00:00.000Z',
    });
    expect(isTransferPosted(posted)).toBe(true);
    expect(resolveTransferRowActions(posted, fullCaps)).not.toContain('post');
    expect(resolveTransferRowActions(posted, fullCaps)).not.toContain(
      'cancel',
    );
  });

  it('denies post without petty_cash.fund', () => {
    const caps = { ...fullCaps, canFund: false, canPost: false };
    expect(
      resolveTransferRowActions(
        transfer({ id: '4', status: PettyCashFundTransferStatus.Verified }),
        caps,
      ),
    ).not.toContain('post');
  });
});

describe('canVerifyTransfer', () => {
  it('requires draft + txn ref + payment proof', () => {
    expect(
      canVerifyTransfer(
        transfer({
          id: '1',
          status: PettyCashFundTransferStatus.Draft,
          transactionReference: 'NEFT',
          paymentProof: 'proof',
        }),
      ),
    ).toBe(true);
    expect(
      canVerifyTransfer(
        transfer({
          id: '2',
          status: PettyCashFundTransferStatus.Draft,
          transactionReference: 'NEFT',
          paymentProof: null,
        }),
      ),
    ).toBe(false);
  });
});
