export const PROJECT_FINANCE_PERMISSIONS = {
  projectView: 'project.view',
  reportView: 'report.view',
  accountManage: 'account.manage',
  costCentreManage: 'cost_centre.manage',
} as const;

export type ProjectFinanceCapabilities = {
  canView: boolean;
  canManageAccounts: boolean;
  canManageCostCentres: boolean;
};

export function resolveProjectFinanceCapabilities(
  hasPermission: (code: string) => boolean,
): ProjectFinanceCapabilities {
  return {
    canView:
      hasPermission(PROJECT_FINANCE_PERMISSIONS.projectView) &&
      hasPermission(PROJECT_FINANCE_PERMISSIONS.reportView),
    canManageAccounts: hasPermission(
      PROJECT_FINANCE_PERMISSIONS.accountManage,
    ),
    canManageCostCentres: hasPermission(
      PROJECT_FINANCE_PERMISSIONS.costCentreManage,
    ),
  };
}
