export type RfqCapabilities = {
  canView: boolean;
  canManage: boolean;
  canClose: boolean;
};

export function resolveRfqCapabilities(
  hasPermission: (code: string) => boolean,
): RfqCapabilities {
  return {
    canView: hasPermission('quotation.view'),
    canManage: hasPermission('quotation.manage'),
    canClose: hasPermission('purchase.order'),
  };
}
