export type ContributionReceiptCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canSubmit: boolean;
  canVerify: boolean;
  canPost: boolean;
  canCancel: boolean;
  canUploadDocument: boolean;
  canViewBankAccounts: boolean;
};

/**
 * Nest RBAC — prefix is `contribution_receipt.*`
 */
export function resolveContributionReceiptCapabilities(
  hasPermission: (code: string) => boolean,
): ContributionReceiptCapabilities {
  return {
    canView: hasPermission('contribution_receipt.view'),
    canCreate: hasPermission('contribution_receipt.create'),
    canSubmit: hasPermission('contribution_receipt.submit'),
    canVerify: hasPermission('contribution_receipt.verify'),
    canPost: hasPermission('contribution_receipt.post'),
    canCancel: hasPermission('contribution_receipt.cancel'),
    canUploadDocument: hasPermission('contribution_receipt.upload_document'),
    canViewBankAccounts: hasPermission('bank.view'),
  };
}
