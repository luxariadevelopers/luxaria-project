export type ContractorAgreementCapabilities = {
  canView: boolean;
  canManage: boolean;
  canApprove: boolean;
};

/**
 * Nest RBAC — exact codes are `contractor_agreement.view`,
 * `contractor_agreement.manage`, `contractor_agreement.approve`.
 */
export function resolveContractorAgreementCapabilities(
  hasPermission: (code: string) => boolean,
): ContractorAgreementCapabilities {
  return {
    canView: hasPermission('contractor_agreement.view'),
    canManage: hasPermission('contractor_agreement.manage'),
    canApprove: hasPermission('contractor_agreement.approve'),
  };
}
