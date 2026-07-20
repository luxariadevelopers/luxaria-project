import type { PettyCashTransferCapabilities } from './roleAccess';
import {
  PettyCashFundTransferStatus,
  type PublicPettyCashFundTransfer,
} from './types';

export type TransferRowActionId =
  | 'verify'
  | 'post'
  | 'cancel'
  | 'proof';

/**
 * Status + permission gate for list actions.
 * Nest still enforces transitions (`draft → verified → posted`).
 */
export function resolveTransferRowActions(
  row: PublicPettyCashFundTransfer,
  caps: PettyCashTransferCapabilities,
): TransferRowActionId[] {
  const actions: TransferRowActionId[] = [];

  if (row.status === PettyCashFundTransferStatus.Draft && caps.canVerify) {
    actions.push('verify');
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
  if (
    caps.canFund &&
    row.status === PettyCashFundTransferStatus.Draft
  ) {
    actions.push('proof');
  }

  return actions;
}

export function isTransferPosted(
  row: Pick<PublicPettyCashFundTransfer, 'status' | 'journalEntryId' | 'postedAt'>,
): boolean {
  return (
    row.status === PettyCashFundTransferStatus.Posted &&
    (Boolean(row.journalEntryId) || Boolean(row.postedAt))
  );
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
