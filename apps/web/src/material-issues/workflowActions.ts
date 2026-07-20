import type { MaterialIssueCapabilities } from './roleAccess';
import {
  MaterialIssueStatus,
  type PublicMaterialIssue,
} from './types';

export type MaterialIssueRowActionId =
  | 'open'
  | 'submit'
  | 'confirm'
  | 'return'
  | 'cancel'
  | 'attach_signature';

/**
 * Status + permission gate for list / detail actions.
 * Nest remains authoritative on transitions and stock checks.
 */
export function resolveMaterialIssueRowActions(
  row: PublicMaterialIssue,
  caps: MaterialIssueCapabilities,
): MaterialIssueRowActionId[] {
  const actions: MaterialIssueRowActionId[] = ['open'];

  if (row.status === MaterialIssueStatus.Draft && caps.canAttachSignatures) {
    const hasRecipient = Boolean(
      row.signatures?.recipientSignatureDocumentId &&
        row.signatures?.recipientSignatureChecksum,
    );
    if (!hasRecipient) {
      actions.push('attach_signature');
    }
  }

  if (row.status === MaterialIssueStatus.Draft && caps.canSubmit) {
    actions.push('submit');
  }

  if (row.status === MaterialIssueStatus.Submitted && caps.canConfirm) {
    actions.push('confirm');
  }

  if (row.status === MaterialIssueStatus.Confirmed && caps.canReturn) {
    const remaining = (row.items ?? []).some(
      (item) => item.remainingBaseQuantity > 1e-9,
    );
    if (remaining) {
      actions.push('return');
    }
  }

  if (
    (row.status === MaterialIssueStatus.Draft ||
      row.status === MaterialIssueStatus.Submitted) &&
    caps.canCancel
  ) {
    actions.push('cancel');
  }

  return actions;
}
