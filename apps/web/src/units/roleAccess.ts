/**
 * Nest permissions for units (`apps/backend/docs/UNITS_API.md`):
 * - `unit.view` — list, get
 * - `unit.manage` — create, update, status change, delete
 *
 * Prompt aliases `unit.create` / `unit.update` / `unit.block` map to `unit.manage`
 * (no separate Nest codes).
 *
 * Linked booking panel uses:
 * - `booking.view` — list/get bookings by unitId
 *
 * Document context uses:
 * - `document.view` — list
 * - `document.upload` — upload
 */

export type UnitCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canBlock: boolean;
  canChangeStatus: boolean;
  canManage: boolean;
  canViewBookings: boolean;
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
};

export function resolveUnitCapabilities(
  hasPermission: (code: string) => boolean,
): UnitCapabilities {
  const manage = hasPermission('unit.manage');
  return {
    canView: hasPermission('unit.view'),
    canCreate: manage,
    canUpdate: manage,
    canBlock: manage,
    canChangeStatus: manage,
    canManage: manage,
    canViewBookings: hasPermission('booking.view'),
    canViewDocuments: hasPermission('document.view'),
    canUploadDocuments: hasPermission('document.upload'),
  };
}
