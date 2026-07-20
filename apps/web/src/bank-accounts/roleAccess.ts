/**
 * Nest permissions for company bank accounts
 * (`apps/backend/docs/COMPANY_BANK_ACCOUNTS_API.md`):
 * - `bank.view` — list, get (masked), balance, ledger
 * - `bank.manage` — create, update, activate/deactivate, set-default; also decrypts
 * - `bank.view_sensitive` — decrypt full account number on get
 *
 * Prompt aliases `bank_account.view/create/update` do **not** exist in the catalog.
 */

export type BankAccountCapabilities = {
  canView: boolean;
  canManage: boolean;
  /** Full account number on GET when Nest returns it. */
  canViewSensitive: boolean;
};

export function resolveBankAccountCapabilities(
  hasPermission: (code: string) => boolean,
): BankAccountCapabilities {
  const canManage = hasPermission('bank.manage');
  return {
    canView: hasPermission('bank.view'),
    canManage,
    canViewSensitive:
      canManage || hasPermission('bank.view_sensitive'),
  };
}

/** Status-gated manage actions (Nest: only active can be set as default). */
export type BankAccountManageAction =
  | 'activate'
  | 'deactivate'
  | 'set_default'
  | 'edit';

export function resolveBankAccountManageActions(
  status: string,
  caps: Pick<BankAccountCapabilities, 'canManage'>,
): BankAccountManageAction[] {
  if (!caps.canManage) return [];
  const actions: BankAccountManageAction[] = ['edit'];
  if (status === 'inactive') {
    actions.push('activate');
  }
  if (status === 'active') {
    actions.push('deactivate', 'set_default');
  }
  return actions;
}
