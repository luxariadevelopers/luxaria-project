export const PETTY_CASH_PERMISSIONS = {
  view: 'petty_cash.view',
  request: 'petty_cash.request',
  approve: 'petty_cash.approve',
  fund: 'petty_cash.fund',
  cashView: 'cash.view',
} as const;

export type PettyCashCapabilities = {
  canView: boolean;
  canRequest: boolean;
  canApprove: boolean;
  /** Live cash balances — Nest `cash.view` */
  canViewCash: boolean;
  /** Fund-transfer verify/post — Nest `petty_cash.fund` */
  canFund: boolean;
};

export function resolvePettyCashCapabilities(
  hasPermission: (c: string) => boolean,
): PettyCashCapabilities {
  return {
    canView: hasPermission(PETTY_CASH_PERMISSIONS.view),
    canRequest: hasPermission(PETTY_CASH_PERMISSIONS.request),
    canApprove: hasPermission(PETTY_CASH_PERMISSIONS.approve),
    canViewCash: hasPermission(PETTY_CASH_PERMISSIONS.cashView),
    canFund: hasPermission(PETTY_CASH_PERMISSIONS.fund),
  };
}
