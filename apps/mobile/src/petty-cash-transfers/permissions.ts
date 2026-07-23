export type PettyCashTransferCapabilities = {
  canView: boolean;
  /** Nest folds create / update / verify / post / cancel into `petty_cash.fund`. */
  canFund: boolean;
  /** UI alias — Acknowledge maps to Nest verify. */
  canAcknowledge: boolean;
  canCreate: boolean;
  canVerify: boolean;
  canPost: boolean;
  canCancel: boolean;
};

/**
 * Nest RBAC — prefix is `petty_cash.*`
 * Phase prompt “acknowledge” → `POST …/verify` (`petty_cash.fund`).
 */
export function resolvePettyCashTransferCapabilities(
  hasPermission: (code: string) => boolean,
): PettyCashTransferCapabilities {
  const canFund = hasPermission('petty_cash.fund');
  return {
    canView: hasPermission('petty_cash.view'),
    canFund,
    canAcknowledge: canFund,
    canCreate: canFund,
    canVerify: canFund,
    canPost: canFund,
    canCancel: canFund,
  };
}
