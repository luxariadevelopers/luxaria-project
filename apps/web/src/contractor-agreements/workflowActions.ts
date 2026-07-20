import { assertCanStartAmendment } from './versionHelpers';
import type { ContractorAgreementCapabilities } from './roleAccess';
import {
  ContractorAgreementStatus,
  type PublicContractorAgreement,
} from './types';

export type AgreementRowActionId =
  | 'edit'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'amend'
  | 'terminate'
  | 'attach_document';

/**
 * Status + permission gate for list / detail actions.
 * Nest still enforces transitions and project access.
 */
export function resolveAgreementRowActions(
  row: PublicContractorAgreement,
  caps: ContractorAgreementCapabilities,
  versions: readonly PublicContractorAgreement[] = [],
): AgreementRowActionId[] {
  const actions: AgreementRowActionId[] = [];

  if (
    caps.canManage &&
    (row.status === ContractorAgreementStatus.Draft ||
      row.status === ContractorAgreementStatus.Rejected)
  ) {
    actions.push('edit', 'submit', 'attach_document');
  }

  if (
    caps.canApprove &&
    row.status === ContractorAgreementStatus.PendingApproval
  ) {
    actions.push('approve', 'reject');
  }

  if (caps.canManage && row.status === ContractorAgreementStatus.Active) {
    const amendCheck = assertCanStartAmendment({ source: row, versions });
    if (amendCheck.ok) {
      actions.push('amend');
    }
    actions.push('terminate');
  }

  return actions;
}
