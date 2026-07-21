import axios from 'axios';
import { apiGet, apiPut } from '@/api/client';
import type {
  PublicApprovalWorkflow,
  UpsertApprovalWorkflowInput,
} from './types';

function normaliseWorkflow(
  row: PublicApprovalWorkflow,
): PublicApprovalWorkflow {
  return {
    ...row,
    name: row.name ?? null,
    allowSelfApprove: Boolean(row.allowSelfApprove),
    steps: [...(row.steps ?? [])]
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((step) => ({
        ...step,
        roleIds: step.roleIds ?? [],
        specificUserIds: step.specificUserIds ?? [],
        minimumAmount: step.minimumAmount ?? 0,
        maximumAmount: step.maximumAmount ?? null,
        requiresAll: Boolean(step.requiresAll),
        escalationHours: step.escalationHours ?? null,
        fallbackRole: step.fallbackRole ?? null,
      })),
  };
}

/**
 * `GET /approval-workflows/:module/:entityType` — `approval.configure`.
 * Returns null when no active workflow exists (404).
 */
export async function fetchApprovalWorkflow(
  module: string,
  entityType: string,
): Promise<PublicApprovalWorkflow | null> {
  const trimmedModule = module.trim().toLowerCase();
  const trimmedEntityType = entityType.trim().toLowerCase();
  if (!trimmedModule || !trimmedEntityType) {
    return null;
  }

  try {
    const res = await apiGet<PublicApprovalWorkflow>(
      `/approval-workflows/${encodeURIComponent(trimmedModule)}/${encodeURIComponent(trimmedEntityType)}`,
    );
    return res.data ? normaliseWorkflow(res.data) : null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/** `PUT /approval-workflows` — `approval.configure`. */
export async function upsertApprovalWorkflow(
  input: UpsertApprovalWorkflowInput,
): Promise<{ workflow: PublicApprovalWorkflow; message: string }> {
  const res = await apiPut<PublicApprovalWorkflow>('/approval-workflows', {
    ...input,
    module: input.module.trim().toLowerCase(),
    entityType: input.entityType.trim().toLowerCase(),
    name: input.name?.trim() ? input.name.trim() : null,
  });
  if (!res.data) {
    throw new Error(res.message || 'Save approval workflow failed');
  }
  return {
    workflow: normaliseWorkflow(res.data),
    message: res.message,
  };
}
