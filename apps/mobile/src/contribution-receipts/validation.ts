import { ContributionPaymentMode } from './types';

const BANK_MODES = new Set<string>([
  ContributionPaymentMode.BankTransfer,
  ContributionPaymentMode.Cheque,
]);

export function paymentModeRequiresBankFields(mode: string): boolean {
  return BANK_MODES.has(mode);
}

export function assertAmountWithinCommitmentHeadroom(
  amount: number,
  pendingHeadroom: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(amount) || amount < 0.01) {
    return { ok: false, message: 'Amount must be at least 0.01.' };
  }
  if (amount > pendingHeadroom + 0.0001) {
    return {
      ok: false,
      message: `Amount exceeds remaining commitment (${pendingHeadroom}).`,
    };
  }
  return { ok: true };
}

export type ContributionReceiptCreateFormValues = {
  participantId: string;
  commitmentId: string;
  receivedDate: string;
  amount: string;
  paymentMode: string;
  bankAccountId: string;
  transactionReference: string;
  remarks: string;
};

export function validateContributionReceiptCreate(
  values: ContributionReceiptCreateFormValues,
  pendingHeadroom: number,
): string | null {
  if (!values.participantId.trim()) return 'Participant is required';
  if (!values.commitmentId.trim()) return 'Commitment allocation is required';
  if (!values.receivedDate.trim()) return 'Received date is required';
  const amount = Number(values.amount);
  const headroom = assertAmountWithinCommitmentHeadroom(amount, pendingHeadroom);
  if (!headroom.ok) return headroom.message;
  if (paymentModeRequiresBankFields(values.paymentMode)) {
    if (!values.bankAccountId.trim()) {
      return 'Bank account is required for bank transfer / cheque.';
    }
    if (!values.transactionReference.trim()) {
      return 'Transaction reference is required for bank transfer / cheque.';
    }
  }
  return null;
}

export function validateCancelReason(reason: string): string | null {
  if (reason.trim().length < 5) {
    return 'Cancellation reason must be at least 5 characters';
  }
  return null;
}
