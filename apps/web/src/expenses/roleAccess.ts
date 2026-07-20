/**
 * Nest RBAC for site expense vouchers.
 *
 * Catalog codes: `expense.view` / `create` / `approve` / `post`.
 * Prompt aliases `expense.verify` and `expense.reverse` are **not** in Nest —
 * verify/reject/return use `expense.approve`; posted vouchers are immutable
 * (no expense reverse endpoint; journal reverse is a separate module).
 */
export type ExpenseCapabilities = {
  canView: boolean;
  /** Create, update draft/returned, submit, cancel. */
  canCreate: boolean;
  /**
   * Verify, approve, reject, return.
   * (Prompt alias `expense.verify` → this permission.)
   */
  canApprove: boolean;
  canPost: boolean;
  /** Alias of `canApprove` for verify action clarity. */
  canVerify: boolean;
  /** Alias of `canCreate` for cancel action clarity. */
  canCancel: boolean;
};

export function resolveExpenseCapabilities(
  hasPermission: (code: string) => boolean,
): ExpenseCapabilities {
  const canApprove = hasPermission('expense.approve');
  const canCreate = hasPermission('expense.create');
  return {
    canView: hasPermission('expense.view'),
    canCreate,
    canApprove,
    canPost: hasPermission('expense.post'),
    canVerify: canApprove,
    canCancel: canCreate,
  };
}
