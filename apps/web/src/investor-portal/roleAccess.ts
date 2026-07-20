import {
  canDownloadInvestorDocuments,
  canViewInvestorDocuments,
} from './permissions';

export type InvestorPortalCapabilities = {
  canViewPortal: boolean;
  canDownloadS3Documents: boolean;
};

export function resolveInvestorPortalCapabilities(
  hasPermission: (code: string) => boolean,
): InvestorPortalCapabilities {
  return {
    canViewPortal: canViewInvestorDocuments(hasPermission),
    canDownloadS3Documents: canDownloadInvestorDocuments(hasPermission),
  };
}
