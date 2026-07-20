import type { MaterialCoefficientCapabilities } from './roleAccess';
import {
  MaterialCoefficientStatus,
  type PublicMaterialCoefficient,
} from './types';

export type MaterialCoefficientActionId =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'createVersion';

const EDITABLE: MaterialCoefficientStatus[] = [
  MaterialCoefficientStatus.Draft,
  MaterialCoefficientStatus.Rejected,
];

export function resolveMaterialCoefficientActions(
  row: PublicMaterialCoefficient,
  caps: MaterialCoefficientCapabilities,
): MaterialCoefficientActionId[] {
  const actions: MaterialCoefficientActionId[] = [];

  if (
    caps.canManage &&
    EDITABLE.includes(row.status)
  ) {
    actions.push('edit', 'submit');
  }

  if (
    caps.canManage &&
    (row.status === MaterialCoefficientStatus.Active ||
      row.status === MaterialCoefficientStatus.Superseded ||
      row.status === MaterialCoefficientStatus.Rejected)
  ) {
    actions.push('createVersion');
  }

  if (
    caps.canApprove &&
    row.status === MaterialCoefficientStatus.PendingApproval
  ) {
    actions.push('approve', 'reject');
  }

  return actions;
}

export function canEditCoefficient(
  row: PublicMaterialCoefficient,
  caps: MaterialCoefficientCapabilities,
): boolean {
  return resolveMaterialCoefficientActions(row, caps).includes('edit');
}

export function canCreateVersion(
  row: PublicMaterialCoefficient,
  caps: MaterialCoefficientCapabilities,
): boolean {
  return resolveMaterialCoefficientActions(row, caps).includes('createVersion');
}
