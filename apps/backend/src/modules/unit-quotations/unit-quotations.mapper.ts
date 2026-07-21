import type { Types } from 'mongoose';
import type {
  UnitQuotationAttachment,
  UnitQuotationPricing,
  UnitQuotationStatus,
  UnitQuotationTotalsSchemaClass,
} from './schemas/unit-quotation.schema';

export type PublicUnitQuotationPricing = {
  basePrice: number;
  plc: number;
  floorRise: number;
  carPark: number;
  clubHouse: number;
  corpusFund: number;
  registrationEstimate: number;
  gst: number;
  stampDutyEstimate: number;
  discount: number;
  offerAmount: number;
  otherCharges: number;
};

export type PublicUnitQuotationTotals = {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
};

export type PublicUnitQuotationAttachment = {
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string;
};

export type PublicUnitQuotation = {
  id: string;
  quotationNumber: string;
  companyId: string | null;
  projectId: string;
  unitId: string;
  leadId: string | null;
  customerId: string | null;
  version: number;
  rootQuotationId: string | null;
  revisedFromId: string | null;
  status: UnitQuotationStatus;
  validUntil: Date | null;
  pricing: PublicUnitQuotationPricing;
  totals: PublicUnitQuotationTotals;
  notes: string | null;
  terms: string | null;
  rejectionReason: string | null;
  issuedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  expiredAt: Date | null;
  convertedAt: Date | null;
  convertedBookingId: string | null;
  convertedReservationId: string | null;
  attachments: PublicUnitQuotationAttachment[];
  unitAvailabilityWarning: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapPricing(pricing: UnitQuotationPricing): PublicUnitQuotationPricing {
  return {
    basePrice: pricing.basePrice,
    plc: pricing.plc,
    floorRise: pricing.floorRise,
    carPark: pricing.carPark,
    clubHouse: pricing.clubHouse,
    corpusFund: pricing.corpusFund,
    registrationEstimate: pricing.registrationEstimate,
    gst: pricing.gst,
    stampDutyEstimate: pricing.stampDutyEstimate,
    discount: pricing.discount,
    offerAmount: pricing.offerAmount,
    otherCharges: pricing.otherCharges,
  };
}

function mapTotals(
  totals: UnitQuotationTotalsSchemaClass,
): PublicUnitQuotationTotals {
  return {
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
  };
}

function mapAttachment(
  attachment: UnitQuotationAttachment,
): PublicUnitQuotationAttachment {
  return {
    fileName: attachment.fileName,
    filePath: attachment.filePath,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes,
    uploadedAt: attachment.uploadedAt,
    uploadedBy: String(attachment.uploadedBy),
  };
}

export function toPublicUnitQuotation(
  row: {
    _id: Types.ObjectId | string;
    quotationNumber: string;
    companyId?: Types.ObjectId | string | null;
    projectId: Types.ObjectId | string;
    unitId: Types.ObjectId | string;
    leadId?: Types.ObjectId | string | null;
    customerId?: Types.ObjectId | string | null;
    version: number;
    rootQuotationId?: Types.ObjectId | string | null;
    revisedFromId?: Types.ObjectId | string | null;
    status: UnitQuotationStatus;
    validUntil?: Date | null;
    pricing: UnitQuotationPricing;
    totals: UnitQuotationTotalsSchemaClass;
    notes?: string | null;
    terms?: string | null;
    rejectionReason?: string | null;
    issuedAt?: Date | null;
    acceptedAt?: Date | null;
    rejectedAt?: Date | null;
    expiredAt?: Date | null;
    convertedAt?: Date | null;
    convertedBookingId?: Types.ObjectId | string | null;
    convertedReservationId?: Types.ObjectId | string | null;
    attachments?: UnitQuotationAttachment[];
    createdBy?: Types.ObjectId | string | null;
    updatedBy?: Types.ObjectId | string | null;
    createdAt?: Date;
    updatedAt?: Date;
  },
  options?: { unitAvailabilityWarning?: string | null },
): PublicUnitQuotation {
  return {
    id: String(row._id),
    quotationNumber: row.quotationNumber,
    companyId: oid(row.companyId),
    projectId: String(row.projectId),
    unitId: String(row.unitId),
    leadId: oid(row.leadId),
    customerId: oid(row.customerId),
    version: row.version,
    rootQuotationId: oid(row.rootQuotationId),
    revisedFromId: oid(row.revisedFromId),
    status: row.status,
    validUntil: row.validUntil ?? null,
    pricing: mapPricing(row.pricing),
    totals: mapTotals(row.totals),
    notes: row.notes ?? null,
    terms: row.terms ?? null,
    rejectionReason: row.rejectionReason ?? null,
    issuedAt: row.issuedAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    rejectedAt: row.rejectedAt ?? null,
    expiredAt: row.expiredAt ?? null,
    convertedAt: row.convertedAt ?? null,
    convertedBookingId: oid(row.convertedBookingId),
    convertedReservationId: oid(row.convertedReservationId),
    attachments: (row.attachments ?? []).map(mapAttachment),
    unitAvailabilityWarning: options?.unitAvailabilityWarning ?? null,
    createdBy: oid(row.createdBy),
    updatedBy: oid(row.updatedBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
