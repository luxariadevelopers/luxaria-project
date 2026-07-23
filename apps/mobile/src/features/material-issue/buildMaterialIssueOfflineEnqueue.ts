import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';
import type { CreateMaterialIssueInput, MaterialUnit } from './types';
import {
  assertPositiveIssueQuantity,
  isDateOnly,
  isMongoObjectId,
} from './validation';

export const MATERIAL_ISSUE_OFFLINE_TYPE = 'material_issue.create' as const;

export const MATERIAL_ISSUE_RECIPIENT_SIG_FIELD = 'recipient_signature' as const;
export const MATERIAL_ISSUE_ISSUER_SIG_FIELD = 'issuer_signature' as const;

export type BuildMaterialIssueOfflineEnqueueInput = CreateMaterialIssueInput & {
  offlineCapturedAt?: string | null;
  /** Required for offline create → signatures → submit. */
  recipientSignature: LocalFile;
  /** Optional issuer / engineer signature. */
  issuerSignature?: LocalFile | null;
  /** Precomputed SHA-256 hex (from `computeLocalFileSha256`). */
  recipientSignatureChecksum: string;
  issuerSignatureChecksum?: string | null;
};

/** Offline queue: create + upload signatures + submit. */
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
  if (!input.recipientSignature?.uri) {
    throw new Error('Recipient signature is required');
  }
  const recipientChecksum = input.recipientSignatureChecksum?.trim().toLowerCase();
  if (!recipientChecksum || !/^[a-f0-9]{64}$/.test(recipientChecksum)) {
    throw new Error('Recipient signature checksum is required');
  }
  if (input.issuerSignature?.uri) {
    const issuerChecksum = input.issuerSignatureChecksum?.trim().toLowerCase();
    if (!issuerChecksum || !/^[a-f0-9]{64}$/.test(issuerChecksum)) {
      throw new Error('Issuer signature checksum is required when issuer signature is present');
    }
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

  // Issue id does not exist yet; bind docs to projectId (valid ObjectId) for presign.
  const projectId = input.projectId.trim();

  const media: EnqueueMediaInput[] = [
    {
      localPath: input.recipientSignature.uri,
      mimeType: input.recipientSignature.mimeType,
      fileName: input.recipientSignature.name,
      fieldKey: MATERIAL_ISSUE_RECIPIENT_SIG_FIELD,
      uploadMeta: {
        module: 'material_issues',
        entityType: 'material_issue',
        entityId: projectId,
        documentType: 'signature',
        projectId,
        size: input.recipientSignature.size,
        checksum: recipientChecksum,
      },
    },
  ];

  const issuerChecksum = input.issuerSignatureChecksum?.trim().toLowerCase() || null;
  if (input.issuerSignature?.uri && issuerChecksum) {
    media.push({
      localPath: input.issuerSignature.uri,
      mimeType: input.issuerSignature.mimeType,
      fileName: input.issuerSignature.name,
      fieldKey: MATERIAL_ISSUE_ISSUER_SIG_FIELD,
      uploadMeta: {
        module: 'material_issues',
        entityType: 'material_issue',
        entityId: projectId,
        documentType: 'issuer_signature',
        projectId,
        size: input.issuerSignature.size,
        checksum: issuerChecksum,
      },
    });
  }

  const payload: Record<string, unknown> = {
    projectId,
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
    submitAfterCreate: true,
    recipientSignatureChecksum: recipientChecksum,
  };

  if (issuerChecksum) {
    payload.issuerSignatureChecksum = issuerChecksum;
  }

  if (input.issuedBy?.trim()) {
    payload.issuedBy = input.issuedBy.trim();
  }

  return {
    type: MATERIAL_ISSUE_OFFLINE_TYPE,
    label: `Material issue · ${input.issueDate.trim()}`,
    projectId,
    endpoint: '/material-issues',
    method: 'POST',
    action: 'stock.issue',
    payload,
    media,
  };
}
