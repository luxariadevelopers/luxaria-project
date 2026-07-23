import type { WorkOrderCapabilities } from './roleAccess';
import type {
  PublicWorkOrder,
  PublicWorkOrderAmendment,
  WorkOrderStatus,
} from './types';

export type WorkOrderActionId =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'issue'
  | 'accept'
  | 'start'
  | 'partially_complete'
  | 'complete'
  | 'close'
  | 'cancel'
  | 'amend';

const CANCELABLE: WorkOrderStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'issued',
];

const AMENDABLE: WorkOrderStatus[] = [
  'approved',
  'issued',
  'accepted',
  'in_progress',
  'partially_completed',
];

function hasOpenAmendment(
  amendments: readonly PublicWorkOrderAmendment[],
): boolean {
  return amendments.some(
    (row) => row.status === 'draft' || row.status === 'pending_approval',
  );
}

/**
 * Status + permission gate for list / detail actions.
 * Nest still enforces transitions and project access.
 */
export function resolveWorkOrderActions(
  row: PublicWorkOrder,
  caps: WorkOrderCapabilities,
  amendments: readonly PublicWorkOrderAmendment[] = [],
): WorkOrderActionId[] {
  const actions: WorkOrderActionId[] = [];
  const status = row.status;

  if (caps.canCreate && status === 'draft') {
    actions.push('edit', 'submit');
  }

  if (caps.canApprove && status === 'pending_approval') {
    actions.push('approve');
  }

  if (caps.canIssue && status === 'approved') {
    actions.push('issue');
  }

  if (caps.canCreate && status === 'issued') {
    actions.push('accept');
  }

  if (caps.canCreate && status === 'accepted') {
    actions.push('start');
  }

  if (caps.canCreate && status === 'in_progress') {
    actions.push('partially_complete', 'complete');
  }

  if (caps.canCreate && status === 'partially_completed') {
    actions.push('complete');
  }

  if (caps.canClose && status === 'completed') {
    actions.push('close');
  }

  if (caps.canClose && CANCELABLE.includes(status)) {
    actions.push('cancel');
  }

  if (
    caps.canCreate &&
    AMENDABLE.includes(status) &&
    row.activeRevision >= 1 &&
    !hasOpenAmendment(amendments)
  ) {
    actions.push('amend');
  }

  return actions;
}

export type AmendmentActionId = 'approve' | 'reject';

export function resolveAmendmentActions(
  amendment: PublicWorkOrderAmendment,
  caps: WorkOrderCapabilities,
): AmendmentActionId[] {
  if (
    caps.canApprove &&
    amendment.status === 'pending_approval'
  ) {
    return ['approve', 'reject'];
  }
  return [];
}
