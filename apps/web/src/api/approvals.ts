import type {
  ApiResponse,
  ApprovalTimelinePayload,
} from '@luxaria/shared-types';
import { apiClient } from './client';

/**
 * `GET /projects/:projectId/approvals/:id/timeline`
 * Permission: `approval.view` (+ project read access on the backend).
 */
export async function getApprovalTimeline(
  projectId: string,
  approvalId: string,
): Promise<ApprovalTimelinePayload> {
  const { data } = await apiClient.get<ApiResponse<ApprovalTimelinePayload>>(
    `/projects/${projectId}/approvals/${approvalId}/timeline`,
  );
  if (!data.data) {
    throw new Error(data.message || 'Approval timeline failed');
  }
  return data.data;
}
