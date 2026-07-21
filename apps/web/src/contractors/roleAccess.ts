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

export const CONTRACTOR_DETAIL_TAB_IDS = [
  'overview',
  'bank',
  'documents',
  'projects',
  'performance',
] as const;

export type ContractorDetailTabId =
  (typeof CONTRACTOR_DETAIL_TAB_IDS)[number];

export type ContractorDetailTabDef = {
  id: ContractorDetailTabId;
  label: string;
  permission?: PermissionCode;
};

export const CONTRACTOR_DETAIL_TAB_DEFS: readonly ContractorDetailTabDef[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'bank', label: 'Bank' },
  { id: 'documents', label: 'Documents' },
  { id: 'projects', label: 'Projects' },
  { id: 'performance', label: 'Performance' },
] as const;
