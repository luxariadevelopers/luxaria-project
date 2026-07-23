import {
  ContributionPaymentMode,
  ContributionReceiptStatus,
} from './types';

export function receiptStatusLabel(status: string): string {
  switch (status) {
    case ContributionReceiptStatus.Draft:
      return 'Draft';
    case ContributionReceiptStatus.Submitted:
      return 'Submitted';
    case ContributionReceiptStatus.Verified:
      return 'Verified';
    case ContributionReceiptStatus.Posted:
      return 'Posted';
    case ContributionReceiptStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function paymentModeLabel(mode: string): string {
  switch (mode) {
    case ContributionPaymentMode.BankTransfer:
      return 'Bank transfer';
    case ContributionPaymentMode.Cheque:
      return 'Cheque';
    case ContributionPaymentMode.Cash:
      return 'Cash';
    case ContributionPaymentMode.LoanAdjustment:
      return 'Loan adjustment';
    case ContributionPaymentMode.JournalAdjustment:
      return 'Journal adjustment';
    default:
      return mode;
  }
}
