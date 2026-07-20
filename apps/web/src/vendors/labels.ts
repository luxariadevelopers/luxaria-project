import {
  VendorInvoiceStatus,
  VendorPaymentStatus,
  VendorStatus,
  VendorVerificationStatus,
  type VendorStatus as VendorStatusValue,
  type VendorVerificationStatus as VendorVerificationStatusValue,
} from './types';

const STATUS_LABELS: Record<VendorStatusValue, string> = {
  [VendorStatus.Draft]: 'Draft',
  [VendorStatus.PendingVerification]: 'Pending verification',
  [VendorStatus.Active]: 'Active',
  [VendorStatus.Blocked]: 'Blocked',
  [VendorStatus.Inactive]: 'Inactive',
};

const VERIFICATION_LABELS: Record<VendorVerificationStatusValue, string> = {
  [VendorVerificationStatus.Pending]: 'Pending',
  [VendorVerificationStatus.Verified]: 'Verified',
  [VendorVerificationStatus.Rejected]: 'Rejected',
};

const INVOICE_STATUS_LABELS: Record<VendorInvoiceStatus, string> = {
  [VendorInvoiceStatus.Draft]: 'Draft',
  [VendorInvoiceStatus.Submitted]: 'Submitted',
  [VendorInvoiceStatus.Verification]: 'Verification',
  [VendorInvoiceStatus.Matching]: 'Matching',
  [VendorInvoiceStatus.Approval]: 'Approval',
  [VendorInvoiceStatus.Posted]: 'Posted',
  [VendorInvoiceStatus.Paid]: 'Paid',
  [VendorInvoiceStatus.Cancelled]: 'Cancelled',
};

const PAYMENT_STATUS_LABELS: Record<VendorPaymentStatus, string> = {
  [VendorPaymentStatus.Draft]: 'Draft',
  [VendorPaymentStatus.Approval]: 'Approval',
  [VendorPaymentStatus.Released]: 'Released',
  [VendorPaymentStatus.Verified]: 'Verified',
  [VendorPaymentStatus.Posted]: 'Posted',
  [VendorPaymentStatus.Cancelled]: 'Cancelled',
};

export function vendorStatusLabel(status: VendorStatusValue): string {
  return STATUS_LABELS[status] ?? status;
}

export function vendorVerificationLabel(
  status: VendorVerificationStatusValue,
): string {
  return VERIFICATION_LABELS[status] ?? status;
}

export function formatVendorRating(rating: number | null | undefined): string {
  if (rating == null || Number.isNaN(rating)) return '—';
  return `${rating.toFixed(1)} / 5`;
}

export function vendorInvoiceStatusLabel(status: VendorInvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status] ?? status;
}

export function vendorPaymentStatusLabel(status: VendorPaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}
