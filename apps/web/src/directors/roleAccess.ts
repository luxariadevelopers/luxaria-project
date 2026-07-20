export type DirectorCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canUploadDocument: boolean;
  canViewShareholding: boolean;
};

/**
 * UI capability matrix from Nest RBAC codes (hiding alone is not the guard).
 */
export function resolveDirectorCapabilities(
  hasPermission: (code: string) => boolean,
): DirectorCapabilities {
  return {
    canView: hasPermission('director.view'),
    canCreate: hasPermission('director.create'),
    canUpdate: hasPermission('director.update'),
    canUploadDocument: hasPermission('director.upload_document'),
    canViewShareholding: hasPermission('shareholding.view'),
  };
}
