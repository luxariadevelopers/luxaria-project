import type { PermissionCode } from '@/navigation/permissionCatalog';

export type BookingCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
};

/**
 * Nest RBAC codes (permissions.catalog.ts):
 * - `booking.view` — list / get / booking form PDF
 * - `booking.create` — create, update, transition, cancel
 * - `booking.approve` — approve/reject discount, expire-holds job
 */
export function resolveBookingCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): BookingCapabilities {
  return {
    canView: hasPermission('booking.view'),
    canCreate: hasPermission('booking.create'),
    canApprove: hasPermission('booking.approve'),
  };
}
