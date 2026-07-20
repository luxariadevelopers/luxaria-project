import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';
import type { CreateMaterialReturnInput, MaterialUnit } from './types';
import { assertPositiveReturnQuantity } from './validation';

export type BuildMaterialReturnOfflineEnqueueInput = {
  projectId: string;
  issueId: string;
  issueNumber?: string;
  returnDate: string;
  returnedBy?: string;
  notes?: string | null;
  items: Array<{
    materialId: string;
    materialLabel?: string;
    quantity: number;
    unit: MaterialUnit | string;
    reason?: string | null;
    remainingBaseQuantity: number;
  }>;
  photos: LocalFile[];
};

/**
 * Offline queue entry for `POST /material-issues/:id/returns`.
 * Media uploads first; document IDs are folded into `notes` at sync time
 * (Nest CreateMaterialReturnDto has no photo fields — see sanitizeReturnSyncPayload).
 */
export function buildMaterialReturnOfflineEnqueue(
  input: BuildMaterialReturnOfflineEnqueueInput,
): EnqueueTransactionInput {
  if (!input.issueId.trim()) {
    throw new Error('Source material issue is required');
  }
  if (!input.returnDate.trim()) {
    throw new Error('returnDate is required');
  }
  if (!input.photos.length) {
    throw new Error('At least one return photo is required');
  }
  if (!input.items.length) {
    throw new Error('At least one return line is required');
  }

  for (const item of input.items) {
    const check = assertPositiveReturnQuantity({
      materialLabel: item.materialLabel || item.materialId,
      returnQuantity: item.quantity,
      remainingBaseQuantity: item.remainingBaseQuantity,
    });
    if (!check.ok) {
      throw new Error(check.message);
    }
  }

  const media: EnqueueMediaInput[] = input.photos.map((photo, index) => ({
    localPath: photo.uri,
    mimeType: photo.mimeType,
    fileName: photo.name,
    fieldKey: `photo_${index}`,
    uploadMeta: {
      module: 'inventory',
      entityType: 'material_return',
      documentType: 'return_photo',
      entityId: input.issueId,
      size: photo.size,
    },
  }));

  const payload: CreateMaterialReturnInput & Record<string, unknown> = {
    returnDate: input.returnDate,
    notes: input.notes?.trim() || null,
    items: input.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit as MaterialUnit,
      reason: item.reason?.trim() || null,
    })),
  };

  if (input.returnedBy?.trim()) {
    payload.returnedBy = input.returnedBy.trim();
  }

  return {
    type: 'material_return.create',
    label: input.issueNumber
      ? `Return · ${input.issueNumber}`
      : `Return · MI ${input.issueId.slice(-6)}`,
    projectId: input.projectId,
    endpoint: `/material-issues/${encodeURIComponent(input.issueId)}/returns`,
    method: 'POST',
    payload,
    media,
  };
}
