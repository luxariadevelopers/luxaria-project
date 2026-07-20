import type { EnqueueMediaInput, EnqueueTransactionInput } from '@/offline/types';
import type { LocalFile } from '@/utils/fileUpload';

export type GrnLineInput = {
  materialId: string;
  purchaseOrderLineId?: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  unit: string;
};

export type BuildGrnOfflineEnqueueInput = {
  projectId: string;
  purchaseOrderId: string;
  vendorId?: string;
  deliveryChallanNumber?: string | null;
  vehicleNumber?: string | null;
  receivedDate: string;
  latitude: number;
  longitude: number;
  items: GrnLineInput[];
  photos: LocalFile[];
  challanDocument?: LocalFile | null;
  weighbridgeDocument?: LocalFile | null;
  purchaseOrderNumber?: string;
};

/**
 * Builds an offline queue entry for GRN create+submit.
 * Media uploads first; document IDs merge into payload via fieldKey.
 */
export function buildGrnOfflineEnqueue(
  input: BuildGrnOfflineEnqueueInput,
): EnqueueTransactionInput {
  if (!input.photos.length) {
    throw new Error('At least one receipt photo is required');
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error('GPS coordinates are required');
  }
  if (!input.items.length) {
    throw new Error('At least one GRN line is required');
  }
  for (const item of input.items) {
    if (!(item.receivedQuantity > 0)) {
      throw new Error('receivedQuantity must be greater than 0');
    }
  }

  const media: EnqueueMediaInput[] = input.photos.map((photo, index) => ({
    localPath: photo.uri,
    mimeType: photo.mimeType,
    fileName: photo.name,
    // Unique keys so sync merge does not overwrite an array field
    fieldKey: `photo_${index}`,
    uploadMeta: {
      module: 'procurement',
      entityType: 'goods_receipt',
      documentType: 'receipt_photo',
      size: photo.size,
    },
  }));

  if (input.challanDocument) {
    media.push({
      localPath: input.challanDocument.uri,
      mimeType: input.challanDocument.mimeType,
      fileName: input.challanDocument.name,
      fieldKey: 'challanDocument',
      uploadMeta: {
        module: 'procurement',
        entityType: 'goods_receipt',
        documentType: 'delivery_challan',
        size: input.challanDocument.size,
      },
    });
  }

  if (input.weighbridgeDocument) {
    media.push({
      localPath: input.weighbridgeDocument.uri,
      mimeType: input.weighbridgeDocument.mimeType,
      fileName: input.weighbridgeDocument.name,
      fieldKey: 'weighbridgeDocument',
      uploadMeta: {
        module: 'procurement',
        entityType: 'goods_receipt',
        documentType: 'weighbridge',
        size: input.weighbridgeDocument.size,
      },
    });
  }

  return {
    type: 'grn.create',
    label: input.purchaseOrderNumber
      ? `GRN · ${input.purchaseOrderNumber}`
      : `GRN · PO ${input.purchaseOrderId.slice(-6)}`,
    projectId: input.projectId,
    endpoint: '/goods-receipts',
    method: 'POST',
    payload: {
      projectId: input.projectId,
      purchaseOrderId: input.purchaseOrderId,
      vendorId: input.vendorId,
      deliveryChallanNumber: input.deliveryChallanNumber ?? null,
      vehicleNumber: input.vehicleNumber ?? null,
      receivedDate: input.receivedDate,
      latitude: input.latitude,
      longitude: input.longitude,
      submit: true,
      // Filled from uploaded photo_* document IDs by the sync engine
      photos: [] as string[],
      items: input.items.map((item) => ({
        materialId: item.materialId,
        purchaseOrderLineId: item.purchaseOrderLineId ?? null,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        unit: item.unit,
      })),
    },
    media,
  };
}
