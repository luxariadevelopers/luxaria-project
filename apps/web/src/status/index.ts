/**
 * Re-exports of shared domain status catalogs (Micro Phase 003).
 * Prefer these helpers so labels stay identical across web and mobile.
 */
export {
  ApprovalStatus,
  BookingStatus,
  ContractorBillStatus,
  DOMAIN_STATUS_CATALOGS,
  GoodsReceiptStatus,
  JournalStatus,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  SignedPaymentVoucherStatus,
  SiteExpenseVoucherStatus,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
  ACTIVE_BOOKING_STATUSES,
  approvalStatusCatalog,
  bookingStatusCatalog,
  contractorBillStatusCatalog,
  getDomainStatusDisplay,
  getDomainStatusLabel,
  goodsReceiptStatusCatalog,
  journalStatusCatalog,
  purchaseOrderStatusCatalog,
  purchaseRequestStatusCatalog,
  signedPaymentVoucherStatusCatalog,
  siteExpenseVoucherStatusCatalog,
  vendorInvoiceMatchingStatusCatalog,
  vendorInvoiceStatusCatalog,
} from '@luxaria/shared-types';
export type {
  DomainStatusKey,
  StatusBadgeVariant,
  StatusDisplay,
} from '@luxaria/shared-types';
