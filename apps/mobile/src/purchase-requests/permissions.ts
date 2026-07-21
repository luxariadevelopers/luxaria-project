export const PURCHASE_PERMISSIONS = {
  view: 'purchase.view',
  request: 'purchase.request',
  approve: 'purchase.approve',
} as const;

export function resolvePurchaseRequestCapabilities(hasPermission: (c: string) => boolean) {
  return {
    canView: hasPermission(PURCHASE_PERMISSIONS.view),
    canRequest: hasPermission(PURCHASE_PERMISSIONS.request),
    canApprove: hasPermission(PURCHASE_PERMISSIONS.approve),
  };
}
