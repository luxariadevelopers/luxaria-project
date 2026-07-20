import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';

export type BuildDprOfflineEnqueueInput = {
  projectId: string;
  reportDate: string;
  weather: string;
  weatherNotes?: string | null;
  labourCount: number;
  skilledLabourCount?: number;
  unskilledLabourCount?: number;
  workPerformed: string;
  tomorrowPlan?: string | null;
  siteCashBalance?: number;
  staffPresent?: Array<{ name: string; role?: string | null }>;
  boqQuantities?: Array<{
    boqItemId: string;
    quantityCompleted: number;
    notes?: string | null;
  }>;
  materialsReceived?: Array<{
    materialName: string;
    quantity: number;
    unit?: string | null;
  }>;
  materialsIssued?: Array<{
    materialName: string;
    quantity: number;
    unit?: string | null;
  }>;
  equipmentUsed?: Array<{ name: string; hours: number }>;
  delays?: Array<{ reason: string; hoursLost: number }>;
  safetyIssues?: Array<{ description: string; severity?: string }>;
  qualityIssues?: Array<{ description: string; severity?: string }>;
  decisionsRequired?: Array<{ description: string; owner?: string | null }>;
  photos: LocalFile[];
  videos?: LocalFile[];
  clientDeviceId?: string | null;
};

/**
 * Offline queue entry for DPR create+submit.
 * Media uploads first; document IDs merge via photo_* / video_* fieldKeys.
 */
export function buildDprOfflineEnqueue(
  input: BuildDprOfflineEnqueueInput,
): EnqueueTransactionInput {
  if (!input.workPerformed.trim()) {
    throw new Error('workPerformed is required');
  }
  if (!(input.labourCount >= 0)) {
    throw new Error('labourCount must be ≥ 0');
  }

  const media: EnqueueMediaInput[] = input.photos.map((photo, index) => ({
    localPath: photo.uri,
    mimeType: photo.mimeType,
    fileName: photo.name,
    fieldKey: `photo_${index}`,
    uploadMeta: {
      module: 'site_operations',
      entityType: 'daily_progress_report',
      documentType: 'dpr_photo',
      size: photo.size,
    },
  }));

  for (const [index, video] of (input.videos ?? []).entries()) {
    media.push({
      localPath: video.uri,
      mimeType: video.mimeType,
      fileName: video.name,
      fieldKey: `video_${index}`,
      uploadMeta: {
        module: 'site_operations',
        entityType: 'daily_progress_report',
        documentType: 'dpr_video',
        size: video.size,
      },
    });
  }

  return {
    type: 'dpr.create',
    label: `DPR ${input.reportDate}`,
    projectId: input.projectId,
    endpoint: '/daily-progress-reports',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      reportDate: input.reportDate,
      weather: input.weather,
      weatherNotes: input.weatherNotes ?? null,
      labourCount: input.labourCount,
      skilledLabourCount: input.skilledLabourCount ?? 0,
      unskilledLabourCount: input.unskilledLabourCount ?? 0,
      workPerformed: input.workPerformed,
      tomorrowPlan: input.tomorrowPlan ?? null,
      siteCashBalance: input.siteCashBalance ?? 0,
      staffPresent: input.staffPresent ?? [],
      boqQuantities: input.boqQuantities ?? [],
      materialsReceived: input.materialsReceived ?? [],
      materialsIssued: input.materialsIssued ?? [],
      equipmentUsed: input.equipmentUsed ?? [],
      delays: input.delays ?? [],
      safetyIssues: input.safetyIssues ?? [],
      qualityIssues: input.qualityIssues ?? [],
      decisionsRequired: input.decisionsRequired ?? [],
      photoDocumentIds: [] as string[],
      videoDocumentIds: [] as string[],
      submit: true,
      clientDeviceId: input.clientDeviceId ?? null,
      offlineCapturedAt: new Date().toISOString(),
    },
    media,
  };
}
