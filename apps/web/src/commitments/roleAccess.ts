export type CommitmentCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canAmend: boolean;
  canCancel: boolean;
  canRecordReceipt: boolean;
};

/**
 * Nest RBAC — prefix is `contribution_commitment.*`
 * (prompt alias `commitment.*` is not in the catalog).
 */
export function resolveCommitmentCapabilities(
  hasPermission: (code: string) => boolean,
): CommitmentCapabilities {
  return {
    canView: hasPermission('contribution_commitment.view'),
    canCreate: hasPermission('contribution_commitment.create'),
    canSubmit: hasPermission('contribution_commitment.submit'),
    canApprove: hasPermission('contribution_commitment.approve'),
    canAmend: hasPermission('contribution_commitment.amend'),
    canCancel: hasPermission('contribution_commitment.cancel'),
    canRecordReceipt: hasPermission('contribution_commitment.record_receipt'),
  };
}
