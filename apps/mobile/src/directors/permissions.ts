export type DirectorCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canViewShareholding: boolean;
};

export function resolveDirectorCapabilities(
  hasPermission: (code: string) => boolean,
): DirectorCapabilities {
  return {
    canView: hasPermission('director.view'),
    canCreate: hasPermission('director.create'),
    canUpdate: hasPermission('director.update'),
    canViewShareholding: hasPermission('shareholding.view'),
  };
}
