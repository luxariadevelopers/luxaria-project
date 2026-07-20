export type PettyCashTransferCapabilities = {
  canView: boolean;
  /** Nest folds create / update / verify / post / cancel into `petty_cash.fund`. */
  canFund: boolean;
  canCreate: boolean;
  canVerify: boolean;
  canPost: boolean;
  canCancel: boolean;
  /** Receiving / source bank selector. */
  canViewBankAccounts: boolean;
  /** Proof upload via documents module. */
  canUploadDocument: boolean;
};

/**
 * Nest RBAC — prefix is `petty_cash.*`
 * (prompt aliases like `petty_cash_transfer.create/verify/post` are not in the catalog).
 */
export function resolvePettyCashTransferCapabilities(
  hasPermission: (code: string) => boolean,
): PettyCashTransferCapabilities {
  const canFund = hasPermission('petty_cash.fund');
  return {
    canView: hasPermission('petty_cash.view'),
    canFund,
    canCreate: canFund,
    canVerify: canFund,
    canPost: canFund,
    canCancel: canFund,
    canViewBankAccounts: hasPermission('bank.view'),
    canUploadDocument: hasPermission('document.upload'),
  };
}
