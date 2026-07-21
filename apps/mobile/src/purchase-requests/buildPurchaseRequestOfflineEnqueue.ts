import type { EnqueueTransactionInput } from '@/offline/types';
import type { CreatePurchaseRequestInput } from './types';

export const PURCHASE_REQUEST_OFFLINE_TYPE = 'purchase_request.create' as const;

/** Offline queue: create+submit purchase request (JSON-only). */
export function buildPurchaseRequestOfflineEnqueue(
  input: CreatePurchaseRequestInput & { offlineCapturedAt?: string | null },
): EnqueueTransactionInput {
  if (!input.projectId) throw new Error('projectId is required');
  if (!input.requiredByDate) throw new Error('requiredByDate is required');
  if (!input.justification?.trim()) throw new Error('justification is required');
  if (!input.items?.length) throw new Error('At least one line is required');

  for (const item of input.items) {
    if (!item.materialId) throw new Error('materialId is required on each line');
    if (!(item.requestedQuantity > 0)) {
      throw new Error('requestedQuantity must be greater than 0');
    }
    if (!item.unit?.trim()) throw new Error('unit is required on each line');
  }

  return {
    type: PURCHASE_REQUEST_OFFLINE_TYPE,
    label: `Purchase request · ${input.requiredByDate}`,
    projectId: input.projectId,
    endpoint: '/purchase-requests',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      siteId: input.siteId ?? null,
      warehouseSiteId: input.warehouseSiteId ?? null,
      requiredByDate: input.requiredByDate,
      priority: input.priority,
      justification: input.justification.trim(),
      items: input.items.map((item) => ({
        materialId: item.materialId,
        requestedQuantity: item.requestedQuantity,
        unit: item.unit,
        estimatedRate: item.estimatedRate ?? null,
        remarks: item.remarks ?? null,
      })),
      submitAfterCreate: true,
    },
  };
}
