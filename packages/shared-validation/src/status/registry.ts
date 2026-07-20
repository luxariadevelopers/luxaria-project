import { approvalStatusCatalog } from './approval-status';
import { bookingStatusCatalog } from './booking-status';
import { contractorBillStatusCatalog } from './contractor-bill-status';
import { goodsReceiptStatusCatalog } from './goods-receipt-status';
import { journalStatusCatalog } from './journal-status';
import { purchaseOrderStatusCatalog } from './purchase-order-status';
import { purchaseRequestStatusCatalog } from './purchase-request-status';
import { signedPaymentVoucherStatusCatalog } from './signed-payment-voucher-status';
import { siteExpenseVoucherStatusCatalog } from './site-expense-voucher-status';
import type { StatusCatalog, StatusDisplay } from './types';
import {
  vendorInvoiceMatchingStatusCatalog,
  vendorInvoiceStatusCatalog,
} from './vendor-invoice-status';

/**
 * Domain keys for workflow statuses centralised in Micro Phase 003.
 */
export const DOMAIN_STATUS_CATALOGS = {
  approval: approvalStatusCatalog,
  journal: journalStatusCatalog,
  purchaseRequest: purchaseRequestStatusCatalog,
  purchaseOrder: purchaseOrderStatusCatalog,
  goodsReceipt: goodsReceiptStatusCatalog,
  vendorInvoice: vendorInvoiceStatusCatalog,
  vendorInvoiceMatching: vendorInvoiceMatchingStatusCatalog,
  siteExpenseVoucher: siteExpenseVoucherStatusCatalog,
  signedPaymentVoucher: signedPaymentVoucherStatusCatalog,
  booking: bookingStatusCatalog,
  contractorBill: contractorBillStatusCatalog,
} as const;

export type DomainStatusKey = keyof typeof DOMAIN_STATUS_CATALOGS;

export function getDomainStatusCatalog(
  domain: DomainStatusKey,
): StatusCatalog<string> {
  return DOMAIN_STATUS_CATALOGS[domain] as StatusCatalog<string>;
}

export function getDomainStatusLabel(
  domain: DomainStatusKey,
  status: string,
  fallback = 'Unknown',
): string {
  return getDomainStatusCatalog(domain).label(status, fallback);
}

export function getDomainStatusDisplay(
  domain: DomainStatusKey,
  status: string,
  fallbackLabel = 'Unknown',
): StatusDisplay {
  return getDomainStatusCatalog(domain).display(status, fallbackLabel);
}
