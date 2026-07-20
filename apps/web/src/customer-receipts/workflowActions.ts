import type { CustomerReceiptCapabilities } from './roleAccess';
import {
  CustomerReceiptStatus,
  type PublicCustomerReceipt,
} from './types';

export function isReceiptDraft(row: PublicCustomerReceipt): boolean {
  return row.status === CustomerReceiptStatus.Draft;
}

export function isReceiptPosted(row: PublicCustomerReceipt): boolean {
  return row.status === CustomerReceiptStatus.Posted;
}

export function canPostReceipt(
  row: PublicCustomerReceipt,
  caps: CustomerReceiptCapabilities,
): boolean {
  return caps.canPost && isReceiptDraft(row);
}

export function canCancelReceipt(
  row: PublicCustomerReceipt,
  caps: CustomerReceiptCapabilities,
): boolean {
  return caps.canCancel && isReceiptDraft(row);
}

export function canOpenReceiptPdf(row: PublicCustomerReceipt): boolean {
  return Boolean(row.receiptPdfPath || row.receiptDocument);
}

export function canRegenerateReceiptPdf(
  row: PublicCustomerReceipt,
  caps: CustomerReceiptCapabilities,
): boolean {
  return caps.canRegeneratePdf && isReceiptPosted(row);
}
