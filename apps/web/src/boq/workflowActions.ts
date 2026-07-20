import {
  canDirectActivateVersion,
  requiresApprovalToActivate,
} from './activation';
import type { BoqCapabilities } from './roleAccess';
import {
  BoqItemStatus,
  BoqVersionStatus,
  type PublicBoqItem,
  type PublicBoqVersion,
} from './types';

export type BoqItemActionId = 'edit';

export type BoqVersionActionId =
  | 'submit'
  | 'activate'
  | 'approve'
  | 'reject'
  | 'compare';

/** Draft items on editable versions can be maintained with `boq.manage`. */
export function resolveBoqItemActions(
  item: PublicBoqItem,
  caps: BoqCapabilities,
  version?: PublicBoqVersion | null,
): BoqItemActionId[] {
  if (!caps.canManage) return [];
  if (item.status === BoqItemStatus.Cancelled) return [];
  if (
    version &&
    version.status !== BoqVersionStatus.Draft &&
    version.status !== BoqVersionStatus.Rejected
  ) {
    return [];
  }
  if (item.status !== BoqItemStatus.Draft && item.status !== BoqItemStatus.Active) {
    // Nest still allows PATCH on editable versions for non-cancelled items;
    // UI focuses draft maintenance per Phase 079.
    if (item.status === BoqItemStatus.OnHold) {
      return ['edit'];
    }
  }
  return ['edit'];
}

export function resolveBoqVersionActions(
  version: PublicBoqVersion,
  caps: BoqCapabilities,
): BoqVersionActionId[] {
  const actions: BoqVersionActionId[] = ['compare'];

  if (
    caps.canManage &&
    (version.status === BoqVersionStatus.Draft ||
      version.status === BoqVersionStatus.Rejected)
  ) {
    actions.push('submit');
  }

  if (caps.canManage && canDirectActivateVersion(version)) {
    actions.push('activate');
  }

  if (
    caps.canApprove &&
    version.status === BoqVersionStatus.PendingApproval
  ) {
    actions.push('approve', 'reject');
  }

  // Variation on draft: submit only (approve path after pending).
  if (
    requiresApprovalToActivate(version.versionType) &&
    actions.includes('activate')
  ) {
    return actions.filter((a) => a !== 'activate');
  }

  return actions;
}
