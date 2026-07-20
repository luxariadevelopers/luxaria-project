import type { PermissionCode } from '@/navigation/permissionCatalog';
import type { EntityDetailAction } from './types';

/** True when `status` is explicitly listed on the action. */
export function isActionAllowedForStatus(
  action: EntityDetailAction,
  status: string,
): boolean {
  return action.allowedStatuses.includes(status);
}

/**
 * Filter actions by permission AND explicit status allow-list.
 * Callers must still enforce route guards and handle API 403s.
 */
export function resolveVisibleActions(
  actions: readonly EntityDetailAction[],
  options: {
    status: string;
    hasPermission: (code: PermissionCode) => boolean;
  },
): EntityDetailAction[] {
  return actions.filter(
    (action) =>
      options.hasPermission(action.permission) &&
      isActionAllowedForStatus(action, options.status),
  );
}

/**
 * Runtime guard before invoking an action (status may have changed client-side).
 * Returns false when the combination is not allowed — do not call onClick.
 */
export function assertActionAllowed(
  action: EntityDetailAction,
  options: {
    status: string;
    hasPermission: (code: PermissionCode) => boolean;
  },
): boolean {
  return (
    options.hasPermission(action.permission) &&
    isActionAllowedForStatus(action, options.status)
  );
}
