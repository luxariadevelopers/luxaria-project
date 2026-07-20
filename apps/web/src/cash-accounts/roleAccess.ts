export type CashAccountCapabilities = {
  canView: boolean;
  canManage: boolean;
  /** Confirm handover — Nest `cash.view` (outgoing/incoming custodians). */
  canConfirmHandover: boolean;
};

/**
 * Nest RBAC — `cash.view` / `cash.manage`.
 * Prompt alias `cash_account.*` is not in the catalog.
 */
export function resolveCashAccountCapabilities(
  hasPermission: (code: string) => boolean,
): CashAccountCapabilities {
  const canView = hasPermission('cash.view');
  return {
    canView,
    canManage: hasPermission('cash.manage'),
    canConfirmHandover: canView,
  };
}
