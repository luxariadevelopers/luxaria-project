import type { ContributionReceiptCapabilities } from './permissions';
import {
  ContributionReceiptStatus,
  type PublicContributionReceipt,
} from './types';

export type ReceiptRowActionId =
  | 'submit'
  | 'verify'
  | 'post'
  | 'cancel';

/**
 * Status + permission gate for detail actions.
 * Nest still enforces transitions and self-verify / self-post rules.
 */
export function resolveReceiptRowActions(
  row: PublicContributionReceipt,
  caps: ContributionReceiptCapabilities,
): ReceiptRowActionId[] {
  const actions: ReceiptRowActionId[] = [];

  if (row.status === ContributionReceiptStatus.Draft && caps.canSubmit) {
    actions.push('submit');
  }
  if (row.status === ContributionReceiptStatus.Submitted && caps.canVerify) {
    actions.push('verify');
  }
  if (row.status === ContributionReceiptStatus.Verified && caps.canPost) {
    actions.push('post');
  }
  if (
    caps.canCancel &&
    (row.status === ContributionReceiptStatus.Draft ||
      row.status === ContributionReceiptStatus.Submitted ||
      row.status === ContributionReceiptStatus.Verified)
  ) {
    actions.push('cancel');
  }

  return actions;
}
