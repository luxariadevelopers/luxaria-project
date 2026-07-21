import type { PermissionCode } from '@/navigation/permissionCatalog';

export type PaymentScheduleCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  /** Booking picker on generate (`GET /bookings`). */
  canViewBookings: boolean;
  /** Unit / customer labels on list & detail. */
  canViewUnits: boolean;
  canViewCustomers: boolean;
};

/**
 * Nest RBAC catalog uses `collection.*` for payment schedules.
 * - view → `collection.view`
 * - create / submit / revise / mark-due / demands → `collection.create`
 * - approve / reject / mark-overdue job → `collection.approve`
 */
export function resolvePaymentScheduleCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): PaymentScheduleCapabilities {
  return {
    canView: hasPermission('collection.view'),
    canCreate: hasPermission('collection.create'),
    canApprove: hasPermission('collection.approve'),
    canViewBookings: hasPermission('booking.view'),
    canViewUnits: hasPermission('unit.view'),
    canViewCustomers: hasPermission('customer.view'),
  };
}
