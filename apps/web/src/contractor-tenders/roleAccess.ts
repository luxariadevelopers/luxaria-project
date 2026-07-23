/**
 * Nest RBAC for contractor tenders:
 * - `tender.view` — list / get / compare
 * - `tender.manage` — create, invite, record bids, recommend, cancel
 * - `tender.award` — award
 */
export type TenderCapabilities = {
  canView: boolean;
  canManage: boolean;
  canAward: boolean;
  canViewContractors: boolean;
};

export function resolveTenderCapabilities(
  hasPermission: (code: string) => boolean,
): TenderCapabilities {
  return {
    canView: hasPermission('tender.view'),
    canManage: hasPermission('tender.manage'),
    canAward: hasPermission('tender.award'),
    canViewContractors: hasPermission('contractor.view'),
  };
}
