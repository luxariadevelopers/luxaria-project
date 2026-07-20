import type { PettyCashRequestCapabilities } from './roleAccess';
import {
  PettyCashRequirementStatus,
  type PublicPettyCashRequirement,
} from './types';

export type PettyCashRequestRowActionId =
  | 'submit'
  | 'cancel'
  | 'pm_approve'
  | 'finance_approve'
  | 'reject'
  | 'return'
  | 'fund'
  | 'close';

export type PettyCashRequestActionId =
  | 'save'
  | PettyCashRequestRowActionId;

export function isPettyCashRequestEditable(status: string): boolean {
  return (
    status === PettyCashRequirementStatus.Draft ||
    status === PettyCashRequirementStatus.Returned
  );
}

/**
 * Status + permission gate for list row actions (Phase 048).
 * Nest still enforces transitions and requester/self-approve rules.
 */
export function resolvePettyCashRequestRowActions(
  row: Pick<PublicPettyCashRequirement, 'status'>,
  caps: PettyCashRequestCapabilities,
): PettyCashRequestRowActionId[] {
  const actions: PettyCashRequestRowActionId[] = [];

  if (isPettyCashRequestEditable(row.status) && caps.canRequest) {
    actions.push('submit', 'cancel');
  }

  if (
    caps.canApprove &&
    (row.status === PettyCashRequirementStatus.Submitted ||
      row.status === PettyCashRequirementStatus.ProjectManagerReview)
  ) {
    actions.push('pm_approve', 'reject', 'return');
  }

  if (
    caps.canApprove &&
    row.status === PettyCashRequirementStatus.FinanceReview
  ) {
    actions.push('finance_approve', 'reject', 'return');
  }

  if (
    caps.canFund &&
    row.status === PettyCashRequirementStatus.Approved
  ) {
    actions.push('fund');
  }

  if (caps.canFund && row.status === PettyCashRequirementStatus.Funded) {
    actions.push('close');
  }

  return actions;
}

/**
 * Status + permission gate for detail actions (Phase 049).
 * Includes save for draft/returned editors.
 */
export function resolvePettyCashRequestActions(
  row: Pick<PublicPettyCashRequirement, 'status'>,
  caps: PettyCashRequestCapabilities,
): PettyCashRequestActionId[] {
  const actions: PettyCashRequestActionId[] = [];
  if (isPettyCashRequestEditable(row.status) && caps.canRequest) {
    actions.push('save');
  }
  actions.push(...resolvePettyCashRequestRowActions(row, caps));
  return actions;
}
