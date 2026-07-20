import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type { VendorQuotationStatus } from './schemas/vendor-quotation.schema';

export type PublicQuotationDocument = {
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string;
} | null;

export type PublicVendorQuotationItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  discount: number;
  total: number;
};

export type PublicVendorQuotation = {
  id: string;
  quotationNumber: string;
  purchaseRequestId: string;
  projectId: string;
  vendorId: string;
  quotationDate: Date;
  validityDate: Date;
  deliveryDays: number;
  paymentTerms: string | null;
  freight: number;
  taxes: number;
  discount: number;
  items: PublicVendorQuotationItem[];
  quotationDocument: PublicQuotationDocument;
  status: VendorQuotationStatus;
  revisionNumber: number;
  rootQuotationId: string | null;
  revisedFromId: string | null;
  finalizedBy: string | null;
  finalizedAt: Date | null;
  itemsSubtotal: number;
  grandTotal: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type QuotationCompareLine = {
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  unit: MaterialUnit | null;
  quotations: Array<{
    quotationId: string;
    quotationNumber: string;
    vendorId: string;
    quantity: number | null;
    rate: number | null;
    tax: number | null;
    discount: number | null;
    total: number | null;
  }>;
  lowestRate: number | null;
  lowestRateQuotationId: string | null;
};

export type QuotationComparison = {
  purchaseRequestId: string;
  quotations: PublicVendorQuotation[];
  lines: QuotationCompareLine[];
  lowestGrandTotalQuotationId: string | null;
  fastestDeliveryQuotationId: string | null;
};

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  quantity: number;
  unit: MaterialUnit;
  rate: number;
  tax: number;
  discount: number;
  total: number;
};

type DocLike = {
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  sizeBytes?: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId | string;
};

type QuotationLike = {
  _id: Types.ObjectId | string;
  quotationNumber: string;
  purchaseRequestId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  quotationDate: Date;
  validityDate: Date;
  deliveryDays: number;
  paymentTerms?: string | null;
  freight: number;
  taxes: number;
  discount: number;
  items?: ItemLike[];
  quotationDocument?: DocLike | null;
  status: VendorQuotationStatus;
  revisionNumber: number;
  rootQuotationId?: Types.ObjectId | string | null;
  revisedFromId?: Types.ObjectId | string | null;
  finalizedBy?: Types.ObjectId | string | null;
  finalizedAt?: Date | null;
  itemsSubtotal: number;
  grandTotal: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicVendorQuotationItem(
  item: ItemLike,
): PublicVendorQuotationItem {
  return {
    id: String(item._id ?? ''),
    materialId: String(item.materialId),
    materialCode: item.materialCode ?? null,
    materialName: item.materialName ?? null,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    tax: item.tax,
    discount: item.discount,
    total: item.total,
  };
}

export function toPublicVendorQuotation(
  row: QuotationLike,
): PublicVendorQuotation {
  const doc = row.quotationDocument ?? null;
  return {
    id: String(row._id),
    quotationNumber: row.quotationNumber,
    purchaseRequestId: String(row.purchaseRequestId),
    projectId: String(row.projectId),
    vendorId: String(row.vendorId),
    quotationDate: row.quotationDate,
    validityDate: row.validityDate,
    deliveryDays: row.deliveryDays,
    paymentTerms: row.paymentTerms ?? null,
    freight: row.freight,
    taxes: row.taxes,
    discount: row.discount,
    items: (row.items ?? []).map(toPublicVendorQuotationItem),
    quotationDocument: doc
      ? {
          fileName: doc.fileName,
          filePath: doc.filePath,
          mimeType: doc.mimeType ?? null,
          sizeBytes: doc.sizeBytes ?? 0,
          uploadedAt: doc.uploadedAt,
          uploadedBy: String(doc.uploadedBy),
        }
      : null,
    status: row.status,
    revisionNumber: row.revisionNumber,
    rootQuotationId: row.rootQuotationId ? String(row.rootQuotationId) : null,
    revisedFromId: row.revisedFromId ? String(row.revisedFromId) : null,
    finalizedBy: row.finalizedBy ? String(row.finalizedBy) : null,
    finalizedAt: row.finalizedAt ?? null,
    itemsSubtotal: row.itemsSubtotal,
    grandTotal: row.grandTotal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function buildQuotationComparison(
  purchaseRequestId: string,
  quotations: QuotationLike[],
): QuotationComparison {
  const publics = quotations.map(toPublicVendorQuotation);
  const materialMap = new Map<
    string,
    {
      materialCode: string | null;
      materialName: string | null;
      unit: MaterialUnit | null;
      byQuote: Map<
        string,
        {
          quantity: number;
          rate: number;
          tax: number;
          discount: number;
          total: number;
        }
      >;
    }
  >();

  for (const q of publics) {
    for (const item of q.items) {
      let entry = materialMap.get(item.materialId);
      if (!entry) {
        entry = {
          materialCode: item.materialCode,
          materialName: item.materialName,
          unit: item.unit,
          byQuote: new Map(),
        };
        materialMap.set(item.materialId, entry);
      }
      entry.byQuote.set(q.id, {
        quantity: item.quantity,
        rate: item.rate,
        tax: item.tax,
        discount: item.discount,
        total: item.total,
      });
    }
  }

  const lines: QuotationCompareLine[] = [...materialMap.entries()].map(
    ([materialId, entry]) => {
      const quotationsForLine = publics.map((q) => {
        const line = entry.byQuote.get(q.id) ?? null;
        return {
          quotationId: q.id,
          quotationNumber: q.quotationNumber,
          vendorId: q.vendorId,
          quantity: line?.quantity ?? null,
          rate: line?.rate ?? null,
          tax: line?.tax ?? null,
          discount: line?.discount ?? null,
          total: line?.total ?? null,
        };
      });

      let lowestRate: number | null = null;
      let lowestRateQuotationId: string | null = null;
      for (const row of quotationsForLine) {
        if (row.rate == null) continue;
        if (lowestRate == null || row.rate < lowestRate) {
          lowestRate = row.rate;
          lowestRateQuotationId = row.quotationId;
        }
      }

      return {
        materialId,
        materialCode: entry.materialCode,
        materialName: entry.materialName,
        unit: entry.unit,
        quotations: quotationsForLine,
        lowestRate,
        lowestRateQuotationId,
      };
    },
  );

  let lowestGrandTotalQuotationId: string | null = null;
  let lowestGrand = Number.POSITIVE_INFINITY;
  let fastestDeliveryQuotationId: string | null = null;
  let fastestDays = Number.POSITIVE_INFINITY;

  for (const q of publics) {
    if (q.grandTotal < lowestGrand) {
      lowestGrand = q.grandTotal;
      lowestGrandTotalQuotationId = q.id;
    }
    if (q.deliveryDays < fastestDays) {
      fastestDays = q.deliveryDays;
      fastestDeliveryQuotationId = q.id;
    }
  }

  return {
    purchaseRequestId,
    quotations: publics,
    lines,
    lowestGrandTotalQuotationId,
    fastestDeliveryQuotationId,
  };
}
