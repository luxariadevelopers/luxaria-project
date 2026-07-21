export const PETTY_CASH_PERMISSIONS = {
  view: 'petty_cash.view',
  request: 'petty_cash.request',
  approve: 'petty_cash.approve',
} as const;

export function resolvePettyCashCapabilities(hasPermission: (c: string) => boolean) {
  return {
    canView: hasPermission(PETTY_CASH_PERMISSIONS.view),
    canRequest: hasPermission(PETTY_CASH_PERMISSIONS.request),
    canApprove: hasPermission(PETTY_CASH_PERMISSIONS.approve),
  };
}
