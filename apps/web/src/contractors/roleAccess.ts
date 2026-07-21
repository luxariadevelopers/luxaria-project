import type { PermissionCode } from '@/navigation/permissionCatalog';

export type ContractorCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canBlock: boolean;
  canActivate: boolean;
  canVerify: boolean;
};

/**
 * Nest RBAC:
 * - `contractor.view` — list / get
 * - `contractor.manage` — create, update, verify, activate, block
 */
export function resolveContractorCapabilities(
  hasPermission: (code: PermissionCode | string) => boolean,
): ContractorCapabilities {
  const manage = hasPermission('contractor.manage');
  return {
    canView: hasPermission('contractor.view'),
    canCreate: manage,
    canUpdate: manage,
    canBlock: manage,
    canActivate: manage,
    canVerify: manage,
  };
}
