/**
 * Nest RBAC codes for weekly petty-cash requirements.
 * Catalog uses `petty_cash.*` (not `petty_cash_request.*`).
 */
export type PettyCashRequestCapabilities = {
  canView: boolean;
  /** Create, update draft/returned, submit, cancel. */
  canRequest: boolean;
  /** PM / finance review, reject, return. */
  canApprove: boolean;
  /** Fund / close (later phases; exposed for guards). */
  canFund: boolean;
  /** Account picker + live balance preview. */
  canViewCash: boolean;
};

export function resolvePettyCashRequestCapabilities(
  hasPermission: (code: string) => boolean,
): PettyCashRequestCapabilities {
  return {
    canView: hasPermission('petty_cash.view'),
    canRequest: hasPermission('petty_cash.request'),
    canApprove: hasPermission('petty_cash.approve'),
    canFund: hasPermission('petty_cash.fund'),
    canViewCash: hasPermission('cash.view'),
  };
}
