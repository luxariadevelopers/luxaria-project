import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';
import { STOCK_COUNT_OFFLINE_TYPE, type CountLine } from './types';
import { validateCountHeader, validateCountLines } from './validation';

export type BuildStockCountOfflineEnqueueInput = {
  projectId: string;
  countDate: string;
  location?: string | null;
  notes?: string | null;
  lines: CountLine[];
  labelHint?: string;
};

function photoFileFromLine(line: CountLine): LocalFile | null {
  if (!line.photoUri) return null;
  return {
    uri: line.photoUri,
    name: line.photoName ?? `count-${line.materialId.slice(-6)}.jpg`,
    mimeType: line.photoMimeType ?? 'image/jpeg',
    size: line.photoSize ?? undefined,
  };
}

/**
 * Offline queue entry: media first, then POST `/stock-counts`,
 * then POST `/stock-counts/:id/submit` (transport follow-up).
 */
export function buildStockCountOfflineEnqueue(
  input: BuildStockCountOfflineEnqueueInput,
): EnqueueTransactionInput {
  const header = validateCountHeader({
    projectId: input.projectId,
    countDate: input.countDate,
  });
  if (!header.ok) {
    throw new Error(header.message);
  }

  const linesCheck = validateCountLines(input.lines);
  if (!linesCheck.ok) {
    if (linesCheck.formError) throw new Error(linesCheck.formError);
    const first = Object.values(linesCheck.lineErrors)[0];
    throw new Error(
      first?.reason ?? first?.physicalQuantity ?? 'Count lines are invalid',
    );
  }

  const media: EnqueueMediaInput[] = [];
  const items = input.lines.map((line, index) => {
    const photo = photoFileFromLine(line);
    if (photo) {
      media.push({
        localPath: photo.uri,
        mimeType: photo.mimeType,
        fileName: photo.name,
        fieldKey: `itemPhoto_${index}`,
        uploadMeta: {
          module: 'inventory',
          entityType: 'stock_count',
          documentType: 'count_evidence_photo',
          size: photo.size,
        },
      });
    }
    return {
      materialId: line.materialId,
      physicalQuantity: line.physicalQuantity,
      reason: line.reason.trim() ? line.reason.trim() : null,
      photo: null as string | null,
    };
  });

  return {
    type: STOCK_COUNT_OFFLINE_TYPE,
    label: input.labelHint
      ? `Stock count · ${input.labelHint}`
      : `Stock count · ${input.countDate}`,
    projectId: input.projectId,
    endpoint: '/stock-counts',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      countDate: input.countDate,
      location: input.location?.trim() ? input.location.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      items,
      submitAfterCreate: true,
    },
    media,
  };
}
