/**
 * Nest RBAC for vendor payments (`VENDOR_PAYMENTS_API.md`).
 *
 * Prompt aliases `vendor_payment.create/approve/release/post` are **not** Nest
 * codes. Nest uses:
 * - `payment.view` — list/get
 * - `payment.release` — create, update, submit, bank release, cancel
 * - `payment.approve` — approve, verify, post
 */

export type VendorPaymentCapabilities = {
  canView: boolean;
  /** Create, update draft, submit, release, cancel. */
  canRelease: boolean;
  canCreate: boolean;
  canSubmit: boolean;
  canBankRelease: boolean;
  canCancel: boolean;
  /** Approve, verify, post. */
  canApprove: boolean;
  canVerify: boolean;
  canPost: boolean;
  canViewBankAccounts: boolean;
  canViewVendors: boolean;
  canViewInvoices: boolean;
  canUploadDocument: boolean;
};

export function resolveVendorPaymentCapabilities(
  hasPermission: (code: string) => boolean,
): VendorPaymentCapabilities {
  const canRelease = hasPermission('payment.release');
  const canApprove = hasPermission('payment.approve');
  return {
    canView: hasPermission('payment.view'),
    canRelease,
    canCreate: canRelease,
    canSubmit: canRelease,
    canBankRelease: canRelease,
    canCancel: canRelease,
    canApprove,
    canVerify: canApprove,
    canPost: canApprove,
    canViewBankAccounts: hasPermission('bank.view'),
    canViewVendors: hasPermission('vendor.view'),
    canViewInvoices: hasPermission('vendor_invoice.view'),
    canUploadDocument: hasPermission('document.upload'),
  };
}
