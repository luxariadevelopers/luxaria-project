import type { PettyCashTransferCapabilities } from './permissions';
import {
  PettyCashFundTransferStatus,
  type PublicPettyCashFundTransfer,
} from './types';

export type TransferRowActionId = 'acknowledge' | 'post' | 'cancel';

/**
 * Status + permission gate for list/detail actions.
 * Acknowledge → Nest `POST …/verify` (`petty_cash.fund`).
 */
export function resolveTransferRowActions(
  row: PublicPettyCashFundTransfer,
  caps: PettyCashTransferCapabilities,
): TransferRowActionId[] {
  const actions: TransferRowActionId[] = [];

  if (
    row.status === PettyCashFundTransferStatus.Draft &&
    (caps.canAcknowledge || caps.canVerify)
  ) {
    actions.push('acknowledge');
  }
  if (row.status === PettyCashFundTransferStatus.Verified && caps.canPost) {
    actions.push('post');
  }
  if (
    caps.canCancel &&
    (row.status === PettyCashFundTransferStatus.Draft ||
      row.status === PettyCashFundTransferStatus.Verified)
  ) {
    actions.push('cancel');
  }

  return actions;
}

/** Verify requires transaction reference + payment proof (Nest 400 otherwise). */
export function canVerifyTransfer(
  row: Pick<
    PublicPettyCashFundTransfer,
    'status' | 'transactionReference' | 'paymentProof'
  >,
): boolean {
  return (
    row.status === PettyCashFundTransferStatus.Draft &&
    Boolean(row.transactionReference?.trim()) &&
    Boolean(row.paymentProof?.trim())
  );
}
