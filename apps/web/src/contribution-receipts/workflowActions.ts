import type { ContributionReceiptCapabilities } from './roleAccess';
import {
  ContributionReceiptStatus,
  type PublicContributionReceipt,
} from './types';

export type ReceiptRowActionId =
  | 'submit'
  | 'verify'
  | 'post'
  | 'cancel'
  | 'documents'
  | 'download_pdf';

/**
 * Status + permission gate for list actions.
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
  if (
    caps.canUploadDocument &&
    row.status !== ContributionReceiptStatus.Cancelled
  ) {
    actions.push('documents');
  }
  if (
    row.status === ContributionReceiptStatus.Posted &&
    (row.receiptPdfPath || row.receiptDocument)
  ) {
    actions.push('download_pdf');
  }

  return actions;
}

/** Posted receipts have balances applied and (usually) a PDF path. */
export function isReceiptPosted(
  row: Pick<
    PublicContributionReceipt,
    'status' | 'balancesApplied' | 'postedAt'
  >,
): boolean {
  return (
    row.status === ContributionReceiptStatus.Posted &&
    (row.balancesApplied || Boolean(row.postedAt))
  );
}

export function canDownloadReceiptPdf(
  row: Pick<
    PublicContributionReceipt,
    'status' | 'receiptPdfPath' | 'receiptDocument'
  >,
): boolean {
  return (
    row.status === ContributionReceiptStatus.Posted &&
    Boolean(row.receiptPdfPath || row.receiptDocument)
  );
}
