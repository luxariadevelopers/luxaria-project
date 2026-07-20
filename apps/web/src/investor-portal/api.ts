import { apiGet } from '@/api/client';
import type {
  InvestorPortalMe,
  InvestorPortalProjectSummary,
} from './types';

export async function fetchInvestorPortalMe() {
  return apiGet<InvestorPortalMe>('/investor-portal/me');
}

export async function fetchInvestorPortalProjects() {
  return apiGet<InvestorPortalProjectSummary[]>('/investor-portal/projects');
}
