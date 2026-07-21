import { apiPatch, apiPost } from '@/api/client';
import type {
  PublishInvestorReportInput,
  PublishedInvestorReport,
  RecordInvestorProfitInput,
  RecordedInvestorProfitAllocation,
  UpdateDistributedProfitInput,
  UpdatedInvestorProfitAllocation,
} from './types';

/**
 * Staff manage clients for investor portal write endpoints.
 * Requires `investor_portal.manage` + project access (`projectId` in body).
 * Not used from `/investor/*` self-service routes.
 */

/** `POST /investor-portal/reports` */
export async function publishInvestorReport(input: PublishInvestorReportInput) {
  return apiPost<PublishedInvestorReport>('/investor-portal/reports', input);
}

/** `POST /investor-portal/profit-allocations` */
export async function recordInvestorProfitAllocation(
  input: RecordInvestorProfitInput,
) {
  return apiPost<RecordedInvestorProfitAllocation>(
    '/investor-portal/profit-allocations',
    input,
  );
}

/** `PATCH /investor-portal/profit-allocations/:id/distributed` */
export async function updateInvestorDistributedProfit(
  allocationId: string,
  input: UpdateDistributedProfitInput,
) {
  return apiPatch<UpdatedInvestorProfitAllocation>(
    `/investor-portal/profit-allocations/${allocationId}/distributed`,
    input,
  );
}
