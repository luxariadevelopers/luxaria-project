import type { RunningBillCapabilities } from './roleAccess';
import { ContractorBillStatus, type PublicContractorBill } from './types';

export type RunningBillDetailActionId =
  | 'submit'
  | 'engineer_verify'
  | 'pm_certify'
  | 'finance_verify'
  | 'director_approve'
  | 'reject'
  | 'cancel';

/**
 * Status + permission gate for detail workflow (Phase 095).
 * Nest still enforces transitions and segregation of duties.
 */
export function resolveRunningBillDetailActions(
  row: Pick<PublicContractorBill, 'status'>,
  caps: RunningBillCapabilities,
): RunningBillDetailActionId[] {
  const actions: RunningBillDetailActionId[] = [];
  const { status } = row;

  if (
    (status === ContractorBillStatus.Draft ||
      status === ContractorBillStatus.Rejected) &&
    caps.canSubmit
  ) {
    actions.push('submit');
  }

  if (status === ContractorBillStatus.Claimed && caps.canVerify) {
    actions.push('engineer_verify', 'reject');
  }

  if (
    status === ContractorBillStatus.EngineerVerified &&
    caps.canCertify
  ) {
    actions.push('pm_certify', 'reject');
  }

  if (
    status === ContractorBillStatus.PmCertified &&
    caps.canFinanceVerify
  ) {
    actions.push('finance_verify', 'reject');
  }

  if (
    status === ContractorBillStatus.FinanceVerified &&
    caps.canApprove
  ) {
    actions.push('director_approve', 'reject');
  }

  if (
    caps.canCreate &&
    (status === ContractorBillStatus.Draft ||
      status === ContractorBillStatus.Rejected)
  ) {
    actions.push('cancel');
  }

  return actions;
}

export function isRunningBillEditable(
  status: PublicContractorBill['status'],
): boolean {
  return (
    status === ContractorBillStatus.Draft ||
    status === ContractorBillStatus.Rejected
  );
}
