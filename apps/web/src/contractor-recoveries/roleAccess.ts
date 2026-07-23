export type ContractorRecoveryCapabilities = {
  canView: boolean;
  canManage: boolean;
};

/**
 * Nest RBAC — `contractor_recovery.view|manage`.
 */
export function resolveContractorRecoveryCapabilities(
  hasPermission: (code: string) => boolean,
): ContractorRecoveryCapabilities {
  return {
    canView: hasPermission('contractor_recovery.view'),
    canManage: hasPermission('contractor_recovery.manage'),
  };
}
