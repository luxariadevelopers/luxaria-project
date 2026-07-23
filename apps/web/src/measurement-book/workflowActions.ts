import type { MeasurementBookCapabilities } from './roleAccess';
import type {
  MeasurementBookStatus,
  PublicMeasurementBookEntry,
} from './api';

export type MeasurementBookActionId =
  | 'submit'
  | 'acknowledge'
  | 'verify'
  | 'certify'
  | 'reject'
  | 'cancel'
  | 'revise';

const REJECTABLE: MeasurementBookStatus[] = [
  'submitted',
  'acknowledged',
  'verified',
];

/**
 * Status + permission gate for list actions.
 * Nest still enforces transitions (e.g. verifier ≠ measuredBy).
 */
export function resolveMeasurementBookActions(
  row: PublicMeasurementBookEntry,
  caps: MeasurementBookCapabilities,
  currentUserId?: string,
): MeasurementBookActionId[] {
  const actions: MeasurementBookActionId[] = [];
  const { status } = row;

  if (caps.canCreate && (status === 'draft' || status === 'rejected')) {
    actions.push('submit');
  }

  if (caps.canCreate && status === 'submitted') {
    actions.push('acknowledge');
  }

  if (
    caps.canCertify &&
    (status === 'submitted' || status === 'acknowledged')
  ) {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('verify');
    }
  }

  if (caps.canCertify && status === 'verified') {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('certify');
    }
  }

  if (caps.canCertify && REJECTABLE.includes(status)) {
    if (!currentUserId || row.measuredBy !== currentUserId) {
      actions.push('reject');
    }
  }

  if (caps.canCreate && (status === 'draft' || status === 'rejected')) {
    actions.push('cancel');
  }

  /** Nest `POST …/revise` — certified only (`measurement.create`). */
  if (caps.canCreate && status === 'certified') {
    actions.push('revise');
  }

  return actions;
}
