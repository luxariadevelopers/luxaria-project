export type InvestorCapabilities = {
  canView: boolean;
  canViewAll: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canVerifyKyc: boolean;
  canActivate: boolean;
  canUploadDocument: boolean;
};

/**
 * Nest RBAC codes:
 * - prompt alias `investor.verify` → `investor.verify_kyc`
 * - prompt alias `investor.view_sensitive` → full account via owner / `investor.view_all`
 *   (catalog has no `investor.view_sensitive`)
 */
export function resolveInvestorCapabilities(
  hasPermission: (code: string) => boolean,
): InvestorCapabilities {
  return {
    canView: hasPermission('investor.view'),
    canViewAll: hasPermission('investor.view_all'),
    canCreate: hasPermission('investor.create'),
    canUpdate: hasPermission('investor.update'),
    canVerifyKyc: hasPermission('investor.verify_kyc'),
    canActivate: hasPermission('investor.activate'),
    canUploadDocument: hasPermission('investor.upload_document'),
  };
}
