/**
 * Nest RBAC for signed payment vouchers (labour + cash payment).
 *
 * Catalog: `payment.view` · `payment.release` · `payment.approve`
 * Mobile field capture uses release; web back-office adds approve/post/reverse.
 */
export type SignedPaymentVoucherCapabilities = {
  canView: boolean;
  canRelease: boolean;
  canApprove: boolean;
};

export function resolveSignedPaymentVoucherCapabilities(
  hasPermission: (code: string) => boolean,
): SignedPaymentVoucherCapabilities {
  return {
    canView: hasPermission('payment.view'),
    canRelease: hasPermission('payment.release'),
    canApprove: hasPermission('payment.approve'),
  };
}
