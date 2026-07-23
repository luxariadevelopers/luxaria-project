export type ShareholdingCapabilities = {
  canView: boolean;
  canPropose: boolean;
  canApprove: boolean;
  canPostCapital: boolean;
};

export function resolveShareholdingCapabilities(
  hasPermission: (code: string) => boolean,
): ShareholdingCapabilities {
  return {
    canView: hasPermission('shareholding.view'),
    canPropose: hasPermission('shareholding.propose'),
    canApprove: hasPermission('shareholding.approve'),
    canPostCapital: hasPermission('company.update'),
  };
}
