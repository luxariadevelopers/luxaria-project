import type { WorkMeasurementCapabilities } from './roleAccess';
import {
  WorkMeasurementStatus,
  type PublicWorkMeasurement,
} from './types';

export type WorkMeasurementRowActionId =
  | 'open'
  | 'edit'
  | 'submit'
  | 'verify'
  | 'certify'
  | 'reject'
  | 'cancel';

export function resolveWorkMeasurementRowActions(
  row: PublicWorkMeasurement,
  caps: WorkMeasurementCapabilities,
  currentUserId?: string,
): WorkMeasurementRowActionId[] {
  const actions: WorkMeasurementRowActionId[] = ['open'];

  if (
    (row.status === WorkMeasurementStatus.Draft ||
      row.status === WorkMeasurementStatus.Rejected) &&
    caps.canUpdate
  ) {
    actions.push('edit');
  }

  if (
    (row.status === WorkMeasurementStatus.Draft ||
      row.status === WorkMeasurementStatus.Rejected) &&
    caps.canSubmit
  ) {
    actions.push('submit');
  }

  if (row.status === WorkMeasurementStatus.Submitted && caps.canVerify) {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('verify');
    }
  }

  if (row.status === WorkMeasurementStatus.Verified && caps.canCertify) {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('certify');
    }
  }

  if (row.status === WorkMeasurementStatus.Submitted && caps.canReject) {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('reject');
    }
  }

  if (
    (row.status === WorkMeasurementStatus.Draft ||
      row.status === WorkMeasurementStatus.Rejected) &&
    caps.canCancel
  ) {
    actions.push('cancel');
  }

  return actions;
}

export function isWorkMeasurementEditable(
  row: PublicWorkMeasurement,
): boolean {
  return (
    row.status === WorkMeasurementStatus.Draft ||
    row.status === WorkMeasurementStatus.Rejected
  );
}
