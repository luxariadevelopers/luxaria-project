export type ChartOfAccountsCapabilities = {
  canView: boolean;
  /**
   * Nest has no `account.create` / `account.update`.
   * All mutations use `account.manage`.
   */
  canManage: boolean;
};

export function resolveChartOfAccountsCapabilities(
  hasPermission: (code: string) => boolean,
): ChartOfAccountsCapabilities {
  return {
    canView: hasPermission('account.view'),
    canManage: hasPermission('account.manage'),
  };
}
