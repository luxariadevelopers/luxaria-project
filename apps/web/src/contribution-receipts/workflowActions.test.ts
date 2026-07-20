import { describe, expect, it } from 'vitest';
import type { ContributionReceiptCapabilities } from './roleAccess';
import {
  ContributionPaymentMode,
  ContributionReceiptStatus,
  type PublicContributionReceipt,
} from './types';
import {
  canDownloadReceiptPdf,
  isReceiptPosted,
  resolveReceiptRowActions,
} from './workflowActions';

const fullCaps: ContributionReceiptCapabilities = {
  canView: true,
  canCreate: true,
  canSubmit: true,
  canVerify: true,
  canPost: true,
  canCancel: true,
  canUploadDocument: true,
  canViewBankAccounts: true,
};

function receipt(
  partial: Partial<PublicContributionReceipt> &
    Pick<PublicContributionReceipt, 'id' | 'status'>,
): PublicContributionReceipt {
  return {
    receiptNumber: 'CTR-2026-000001',
    projectId: 'p1',
    participantId: 'part1',
    commitmentId: 'com1',
    receivedDate: '2026-07-01T00:00:00.000Z',
    amount: 100_000,
    paymentMode: ContributionPaymentMode.BankTransfer,
    bankAccountId: 'bank1',
    transactionReference: 'NEFT1',
    receiptDocument: null,
    receiptPdfPath: null,
    remarks: null,
    journalEntryId: null,
    balancesApplied: false,
    accountingNote: 'Accounting later',
    submittedBy: null,
    submittedAt: null,
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

describe('resolveReceiptRowActions — posting state', () => {
  it('allows post only from verified', () => {
    expect(
      resolveReceiptRowActions(
        receipt({ id: '1', status: ContributionReceiptStatus.Verified }),
        fullCaps,
      ),
    ).toContain('post');
    expect(
      resolveReceiptRowActions(
        receipt({ id: '2', status: ContributionReceiptStatus.Submitted }),
        fullCaps,
      ),
    ).not.toContain('post');
  });

  it('marks posted with PDF as downloadable and not postable', () => {
    const posted = receipt({
      id: '3',
      status: ContributionReceiptStatus.Posted,
      balancesApplied: true,
      postedAt: '2026-07-10T00:00:00.000Z',
      receiptPdfPath: 'uploads/contribution-receipts/p1/3/CTR.pdf',
    });
    expect(isReceiptPosted(posted)).toBe(true);
    expect(canDownloadReceiptPdf(posted)).toBe(true);
    expect(resolveReceiptRowActions(posted, fullCaps)).toContain(
      'download_pdf',
    );
    expect(resolveReceiptRowActions(posted, fullCaps)).not.toContain('post');
    expect(resolveReceiptRowActions(posted, fullCaps)).not.toContain('cancel');
  });

  it('denies verify without permission', () => {
    const caps = { ...fullCaps, canVerify: false };
    expect(
      resolveReceiptRowActions(
        receipt({ id: '4', status: ContributionReceiptStatus.Submitted }),
        caps,
      ),
    ).not.toContain('verify');
  });
});
