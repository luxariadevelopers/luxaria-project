import { apiGet } from '@/api/client';
import { assertInvestorPortalApiPath } from './access';
import type {
  InvestorPortalMe,
  InvestorPortalProjectDetail,
  InvestorPortalProjectSummary,
} from './types';

function portalGet<T>(path: string) {
  assertInvestorPortalApiPath(path);
  return apiGet<T>(path);
}

export async function fetchInvestorPortalMe() {
  return portalGet<InvestorPortalMe>('/investor-portal/me');
}

export async function fetchInvestorPortalProjects() {
  return portalGet<InvestorPortalProjectSummary[]>('/investor-portal/projects');
}

export async function fetchInvestorPortalProject(projectId: string) {
  return portalGet<InvestorPortalProjectDetail>(
    `/investor-portal/projects/${encodeURIComponent(projectId)}`,
  );
}
