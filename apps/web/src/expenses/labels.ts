import {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
} from './types';

export function expenseStatusLabel(status: string): string {
  switch (status) {
    case SiteExpenseVoucherStatus.Draft:
      return 'Draft';
    case SiteExpenseVoucherStatus.Submitted:
      return 'Submitted';
    case SiteExpenseVoucherStatus.Verified:
      return 'Verified';
    case SiteExpenseVoucherStatus.Approved:
      return 'Approved';
    case SiteExpenseVoucherStatus.Posted:
      return 'Posted';
    case SiteExpenseVoucherStatus.Rejected:
      return 'Rejected';
    case SiteExpenseVoucherStatus.Returned:
      return 'Returned';
    case SiteExpenseVoucherStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function paymentModeLabel(mode: string): string {
  switch (mode) {
    case SiteExpensePaymentMode.Cash:
      return 'Cash';
    case SiteExpensePaymentMode.Upi:
      return 'UPI';
    case SiteExpensePaymentMode.BankTransfer:
      return 'Bank transfer';
    case SiteExpensePaymentMode.Cheque:
      return 'Cheque';
    case SiteExpensePaymentMode.Other:
      return 'Other';
    default:
      return mode;
  }
}

export function attachmentTypeLabel(type: string): string {
  switch (type) {
    case SiteExpenseAttachmentType.Bill:
      return 'Bill';
    case SiteExpenseAttachmentType.Photo:
      return 'Photo';
    case SiteExpenseAttachmentType.Signature:
      return 'Signature';
    case SiteExpenseAttachmentType.Other:
      return 'Other';
    default:
      return type;
  }
}
