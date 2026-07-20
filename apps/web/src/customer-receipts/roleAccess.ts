export type CustomerReceiptCapabilities = {
  canView: boolean;
  canCreate: boolean;
  /** Nest posts drafts via `POST …/:id/post` — permission `collection.approve`. */
  canPost: boolean;
  canCancel: boolean;
  canRegeneratePdf: boolean;
  /** Bank account selector on create (`GET /company-bank-accounts`). */
  canViewBankAccounts: boolean;
  /** Booking picker (`GET /bookings`). Falls back to id text fields. */
  canViewBookings: boolean;
};

/**
 * Nest RBAC catalog uses `collection.*` (not `customer_receipt.*`).
 * Prompt aliases map as:
 * - view → `collection.view`
 * - create → `collection.create`
 * - verify/post → `collection.approve` (no separate verify route)
 */
export function resolveCustomerReceiptCapabilities(
  hasPermission: (code: string) => boolean,
): CustomerReceiptCapabilities {
  const canView = hasPermission('collection.view');
  return {
    canView,
    canCreate: hasPermission('collection.create'),
    canPost: hasPermission('collection.approve'),
    canCancel: hasPermission('collection.create'),
    canRegeneratePdf: canView,
    canViewBankAccounts: hasPermission('bank.view'),
    canViewBookings: hasPermission('booking.view'),
  };
}
