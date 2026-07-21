import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';
import { validateMeasurementForm } from './validation';

export type BuildMeasurementOfflineEnqueueInput = {
  projectId: string;
  siteId?: string | null;
  dprId?: string | null;
  contractorId: string;
  boqItemId: string;
  boqCode?: string | null;
  location: string;
  sheetReference?: string | null;
  workDescription?: string | null;
  measurementDate: string;
  currentQuantity: number;
  previousQuantity: number;
  boqPlannedQuantity: number;
  unit?: string | null;
  drawingReference?: string | null;
  drawingId?: string | null;
  notes?: string | null;
  photos: LocalFile[];
  /** When true (default), create+submit in one POST. */
  submit?: boolean;
};

/**
 * Offline queue entry for work measurement create (+ optional submit).
 * Media uploads first; document IDs merge via photo_* / attachments keys
 * (Nest `mergePhotoDocumentIds`).
 */
export function buildMeasurementOfflineEnqueue(
  input: BuildMeasurementOfflineEnqueueInput,
): EnqueueTransactionInput {
  const formCheck = validateMeasurementForm({
    projectId: input.projectId,
    contractorId: input.contractorId,
    boqItemId: input.boqItemId,
    location: input.location,
    measurementDate: input.measurementDate,
    currentQuantity: input.currentQuantity,
    previousQuantity: input.previousQuantity,
    boqPlannedQuantity: input.boqPlannedQuantity,
    drawingReference: input.drawingReference,
    photoCount: input.photos.length,
    requirePhotos: true,
  });
  if (!formCheck.ok) {
    throw new Error(formCheck.message);
  }

  const media: EnqueueMediaInput[] = input.photos.map((photo, index) => ({
    localPath: photo.uri,
    mimeType: photo.mimeType,
    fileName: photo.name,
    fieldKey: `photo_${index}`,
    uploadMeta: {
      module: 'project_control',
      entityType: 'work_measurement',
      documentType: 'measurement_photo',
      size: photo.size,
    },
  }));

  const labelCode = input.boqCode?.trim() || input.boqItemId.slice(-6);

  return {
    type: 'work_measurement.create',
    label: `WM · ${labelCode} · ${input.measurementDate}`,
    projectId: input.projectId,
    endpoint: '/work-measurements',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      siteId: input.siteId ?? null,
      dprId: input.dprId ?? null,
      contractorId: input.contractorId,
      boqItemId: input.boqItemId,
      location: input.location.trim(),
      sheetReference: input.sheetReference?.trim() || null,
      workDescription: input.workDescription?.trim() || null,
      measurementDate: input.measurementDate.trim(),
      currentQuantity: input.currentQuantity,
      drawingReference: input.drawingReference?.trim() || null,
      drawingId: input.drawingId ?? null,
      notes: input.notes?.trim() || null,
      photoDocumentIds: [] as string[],
      submit: input.submit !== false,
      offlineCapturedAt: new Date().toISOString(),
      // Client hints for conflict review (server recomputes previous/cumulative)
      clientPreviousQuantity: input.previousQuantity,
      clientBoqPlannedQuantity: input.boqPlannedQuantity,
      clientUnit: input.unit ?? null,
    },
    media,
  };
}
