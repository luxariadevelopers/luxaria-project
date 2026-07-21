import type { EnqueueTransactionInput } from '@/offline/types';
import type { CreateMaterialIssueInput, MaterialUnit } from './types';
import {
  assertPositiveIssueQuantity,
  isDateOnly,
  isMongoObjectId,
} from './validation';

export const MATERIAL_ISSUE_OFFLINE_TYPE = 'material_issue.create' as const;

export type BuildMaterialIssueOfflineEnqueueInput = CreateMaterialIssueInput & {
  offlineCapturedAt?: string | null;
};

/** Offline queue: create material issue draft (JSON-only; no signatures). */
export function buildMaterialIssueOfflineEnqueue(
  input: BuildMaterialIssueOfflineEnqueueInput,
): EnqueueTransactionInput {
  if (!isMongoObjectId(input.projectId)) {
    throw new Error('projectId is required');
  }
  if (!isDateOnly(input.issueDate)) {
    throw new Error('issueDate must be YYYY-MM-DD');
  }
  if (!isMongoObjectId(input.receivedBy)) {
    throw new Error('receivedBy is required');
  }
  if (!isMongoObjectId(input.boqItemId)) {
    throw new Error('boqItemId is required');
  }
  const workLocation = input.workLocation.trim();
  if (!workLocation) {
    throw new Error('workLocation is required');
  }
  if (input.contractorId?.trim() && !isMongoObjectId(input.contractorId)) {
    throw new Error('contractorId is invalid');
  }
  if (input.blockId?.trim() && !isMongoObjectId(input.blockId)) {
    throw new Error('blockId is invalid');
  }
  if (!input.items?.length) {
    throw new Error('At least one material line is required');
  }

  for (const item of input.items) {
    if (!isMongoObjectId(item.materialId)) {
      throw new Error('materialId is required on each line');
    }
    const check = assertPositiveIssueQuantity({
      materialLabel: item.materialId,
      quantity: item.quantity,
    });
    if (!check.ok) {
      throw new Error(check.message);
    }
    if (!item.unit?.trim()) {
      throw new Error('unit is required on each line');
    }
  }

  const payload: Record<string, unknown> = {
    projectId: input.projectId.trim(),
    issueDate: input.issueDate.trim(),
    receivedBy: input.receivedBy.trim(),
    boqItemId: input.boqItemId.trim(),
    workLocation,
    contractorId: input.contractorId?.trim() || null,
    blockId: input.blockId?.trim() || null,
    floorId: input.floorId?.trim() || null,
    storeLocation: input.storeLocation?.trim() || null,
    notes: input.notes?.trim() || null,
    items: input.items.map((item) => ({
      materialId: item.materialId.trim(),
      quantity: item.quantity,
      unit: item.unit as MaterialUnit,
      batch: item.batch?.trim() || null,
      notes: item.notes?.trim() || null,
    })),
    offlineCapturedAt: input.offlineCapturedAt ?? new Date().toISOString(),
  };

  if (input.issuedBy?.trim()) {
    payload.issuedBy = input.issuedBy.trim();
  }

  return {
    type: MATERIAL_ISSUE_OFFLINE_TYPE,
    label: `Material issue · ${input.issueDate.trim()}`,
    projectId: input.projectId.trim(),
    endpoint: '/material-issues',
    method: 'POST',
    payload,
  };
}
