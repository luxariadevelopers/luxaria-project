export type {
  StatusBadgeVariant,
  StatusCatalog,
  StatusCatalogDefinition,
  StatusDisplay,
} from './types';
export { createStatusCatalog } from './create-status-catalog';

export { ApprovalStatus, approvalStatusCatalog } from './approval-status';
export type { ApprovalStatus as ApprovalStatusType } from './approval-status';

export { JournalStatus, journalStatusCatalog } from './journal-status';
export type { JournalStatus as JournalStatusType } from './journal-status';

export {
  PurchaseRequestStatus,
  purchaseRequestStatusCatalog,
} from './purchase-request-status';
export type { PurchaseRequestStatus as PurchaseRequestStatusType } from './purchase-request-status';

export {
  PurchaseOrderStatus,
  purchaseOrderStatusCatalog,
} from './purchase-order-status';
export type { PurchaseOrderStatus as PurchaseOrderStatusType } from './purchase-order-status';

export {
  GoodsReceiptStatus,
  goodsReceiptStatusCatalog,
} from './goods-receipt-status';
export type { GoodsReceiptStatus as GoodsReceiptStatusType } from './goods-receipt-status';

export {
  VendorInvoiceStatus,
  VendorInvoiceMatchingStatus,
  vendorInvoiceStatusCatalog,
  vendorInvoiceMatchingStatusCatalog,
} from './vendor-invoice-status';
export type {
  VendorInvoiceStatus as VendorInvoiceStatusType,
  VendorInvoiceMatchingStatus as VendorInvoiceMatchingStatusType,
} from './vendor-invoice-status';

export {
  SiteExpenseVoucherStatus,
  siteExpenseVoucherStatusCatalog,
} from './site-expense-voucher-status';
export type { SiteExpenseVoucherStatus as SiteExpenseVoucherStatusType } from './site-expense-voucher-status';

export {
  SignedPaymentVoucherStatus,
  signedPaymentVoucherStatusCatalog,
} from './signed-payment-voucher-status';
export type { SignedPaymentVoucherStatus as SignedPaymentVoucherStatusType } from './signed-payment-voucher-status';

export {
  BookingStatus,
  ACTIVE_BOOKING_STATUSES,
  BOOKING_WORKFLOW_PROGRESSION,
  bookingStatusCatalog,
} from './booking-status';
export type { BookingStatus as BookingStatusType } from './booking-status';

export {
  ContractorBillStatus,
  EDITABLE_CONTRACTOR_BILL_STATUSES,
  contractorBillStatusCatalog,
} from './contractor-bill-status';
export type { ContractorBillStatus as ContractorBillStatusType } from './contractor-bill-status';

export {
  DOMAIN_STATUS_CATALOGS,
  getDomainStatusCatalog,
  getDomainStatusDisplay,
  getDomainStatusLabel,
} from './registry';
export type { DomainStatusKey } from './registry';
