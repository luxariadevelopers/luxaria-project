export const FINANCIAL_YEAR_PERMISSIONS = {
  view: 'financial_year.view',
  manage: 'financial_year.manage',
  unlock: 'financial_year.unlock',
} as const;

export type FinancialYearCapabilities = {
  canView: boolean;
  canManage: boolean;
  canApproveUnlock: boolean;
};

/** Mirrors FinancialYearController guards exactly. */
export function resolveFinancialYearCapabilities(
  hasPermission: (permission: string) => boolean,
): FinancialYearCapabilities {
  return {
    canView: hasPermission(FINANCIAL_YEAR_PERMISSIONS.view),
    canManage: hasPermission(FINANCIAL_YEAR_PERMISSIONS.manage),
    canApproveUnlock: hasPermission(FINANCIAL_YEAR_PERMISSIONS.unlock),
  };
}
