/**
 * Nest RBAC for vendor invoices (`VENDOR_INVOICES_API.md`).
 *
 * Prompt aliases `vendor_invoice.submit` / `vendor_invoice.exception` are
 * **not** Nest codes — submit uses `vendor_invoice.create`; exception approval
 * uses `vendor_invoice.approve` with `exceptionApprovalComment`.
 */

export type VendorInvoiceCapabilities = {
  canView: boolean;
  /** Create, update draft, submit, cancel. */
  canCreate: boolean;
  /** Alias of `canCreate` for submit clarity. */
  canSubmit: boolean;
  canVerify: boolean;
  canMatch: boolean;
  /** Approve matched invoice / approve matching exceptions. */
  canApprove: boolean;
  canPost: boolean;
  /** Nest `payment.release` — mark posted invoice paid. */
  canMarkPaid: boolean;
  /** PO selector — Nest `purchase.view`. */
  canViewPurchaseOrders: boolean;
  /** GRN selector — Nest `grn.create` (list/get). */
  canViewGoodsReceipts: boolean;
  /** Vendor picker — Nest `vendor.view`. */
  canViewVendors: boolean;
  /** Invoice scan via documents module. */
  canUploadDocument: boolean;
};

export function resolveVendorInvoiceCapabilities(
  hasPermission: (code: string) => boolean,
): VendorInvoiceCapabilities {
  const canCreate = hasPermission('vendor_invoice.create');
  return {
    canView: hasPermission('vendor_invoice.view'),
    canCreate,
    canSubmit: canCreate,
    canVerify: hasPermission('vendor_invoice.verify'),
    canMatch: hasPermission('vendor_invoice.match'),
    canApprove: hasPermission('vendor_invoice.approve'),
    canPost: hasPermission('vendor_invoice.post'),
    canMarkPaid: hasPermission('payment.release'),
    canViewPurchaseOrders: hasPermission('purchase.view'),
    canViewGoodsReceipts: hasPermission('grn.create'),
    canViewVendors: hasPermission('vendor.view'),
    canUploadDocument: hasPermission('document.upload'),
  };
}
