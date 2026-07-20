export type BookingCancellationCapabilities = {
  canView: boolean;
  /** Nest `booking.cancel` — request, review, submit-approval, release-unit, documents */
  canRequest: boolean;
  canReview: boolean;
  canSubmitApproval: boolean;
  canReleaseUnit: boolean;
  canAttachDocument: boolean;
  /** Nest `booking.approve` */
  canApprove: boolean;
  canReject: boolean;
  /** Nest `collection.refund` */
  canRefund: boolean;
  /** For refund bank selector */
  canViewBankAccounts: boolean;
};

/**
 * Nest RBAC (permissions.catalog) — not the prompt aliases
 * `booking_cancel.view/request/approve/refund`.
 *
 * - view → `booking.view`
 * - request/review/release → `booking.cancel`
 * - approve/reject → `booking.approve`
 * - refund → `collection.refund`
 */
export function resolveBookingCancellationCapabilities(
  hasPermission: (code: string) => boolean,
): BookingCancellationCapabilities {
  const canCancel = hasPermission('booking.cancel');
  const canApprove = hasPermission('booking.approve');
  return {
    canView: hasPermission('booking.view'),
    canRequest: canCancel,
    canReview: canCancel,
    canSubmitApproval: canCancel,
    canReleaseUnit: canCancel,
    canAttachDocument: canCancel,
    canApprove,
    canReject: canApprove,
    canRefund: hasPermission('collection.refund'),
    canViewBankAccounts: hasPermission('bank.view'),
  };
}
