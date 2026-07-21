import type { Types } from 'mongoose';
import type {
  GstDirection,
  GstDocumentStatus,
  GstDocumentType,
  GstPartyType,
  GstSupplyType,
} from './schemas/gst-document.schema';
import type { GstReturnStatus, GstReturnType } from './schemas/gst-return.schema';

export type PublicGstDocument = {
  id: string;
  documentNumber: string;
  companyId: string;
  projectId: string | null;
  documentType: GstDocumentType;
  direction: GstDirection;
  partyType: GstPartyType;
  partyId: string | null;
  partyGstin: string | null;
  partyName: string;
  documentDate: Date;
  supplyType: GstSupplyType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  hsnSac: string | null;
  placeOfSupply: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  status: GstDocumentStatus;
  journalEntryId: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicGstReturn = {
  id: string;
  returnNumber: string;
  companyId: string;
  returnType: GstReturnType;
  periodMonth: number;
  periodYear: number;
  status: GstReturnStatus;
  taxableOutward: number;
  cgstOutward: number;
  sgstOutward: number;
  igstOutward: number;
  taxableInward: number;
  cgstInward: number;
  sgstInward: number;
  igstInward: number;
  itcAvailable: number;
  taxPayable: number;
  filedAt: Date | null;
  acknowledgementNumber: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GstRegisterRow = {
  id: string;
  documentNumber: string;
  documentDate: Date;
  documentType: GstDocumentType;
  direction: GstDirection;
  partyName: string;
  partyGstin: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  status: GstDocumentStatus;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

export function toPublicGstDocument(row: {
  _id: Types.ObjectId | string;
  documentNumber: string;
  companyId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  documentType: GstDocumentType;
  direction: GstDirection;
  partyType: GstPartyType;
  partyId?: Types.ObjectId | string | null;
  partyGstin?: string | null;
  partyName: string;
  documentDate: Date;
  supplyType: GstSupplyType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  hsnSac?: string | null;
  placeOfSupply?: string | null;
  sourceModule?: string | null;
  sourceEntityType?: string | null;
  sourceEntityId?: string | null;
  status: GstDocumentStatus;
  journalEntryId?: Types.ObjectId | string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicGstDocument {
  return {
    id: String(row._id),
    documentNumber: row.documentNumber,
    companyId: String(row.companyId),
    projectId: oid(row.projectId),
    documentType: row.documentType,
    direction: row.direction,
    partyType: row.partyType,
    partyId: oid(row.partyId),
    partyGstin: row.partyGstin ?? null,
    partyName: row.partyName,
    documentDate: row.documentDate,
    supplyType: row.supplyType,
    taxableValue: row.taxableValue,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    cess: row.cess,
    totalValue: row.totalValue,
    hsnSac: row.hsnSac ?? null,
    placeOfSupply: row.placeOfSupply ?? null,
    sourceModule: row.sourceModule ?? null,
    sourceEntityType: row.sourceEntityType ?? null,
    sourceEntityId: row.sourceEntityId ?? null,
    status: row.status,
    journalEntryId: oid(row.journalEntryId),
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicGstReturn(row: {
  _id: Types.ObjectId | string;
  returnNumber: string;
  companyId: Types.ObjectId | string;
  returnType: GstReturnType;
  periodMonth: number;
  periodYear: number;
  status: GstReturnStatus;
  taxableOutward: number;
  cgstOutward: number;
  sgstOutward: number;
  igstOutward: number;
  taxableInward: number;
  cgstInward: number;
  sgstInward: number;
  igstInward: number;
  itcAvailable: number;
  taxPayable: number;
  filedAt?: Date | null;
  acknowledgementNumber?: string | null;
  notes?: string | null;
  createdBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicGstReturn {
  return {
    id: String(row._id),
    returnNumber: row.returnNumber,
    companyId: String(row.companyId),
    returnType: row.returnType,
    periodMonth: row.periodMonth,
    periodYear: row.periodYear,
    status: row.status,
    taxableOutward: row.taxableOutward,
    cgstOutward: row.cgstOutward,
    sgstOutward: row.sgstOutward,
    igstOutward: row.igstOutward,
    taxableInward: row.taxableInward,
    cgstInward: row.cgstInward,
    sgstInward: row.sgstInward,
    igstInward: row.igstInward,
    itcAvailable: row.itcAvailable,
    taxPayable: row.taxPayable,
    filedAt: row.filedAt ?? null,
    acknowledgementNumber: row.acknowledgementNumber ?? null,
    notes: row.notes ?? null,
    createdBy: oid(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toGstRegisterRow(row: {
  _id: Types.ObjectId | string;
  documentNumber: string;
  documentDate: Date;
  documentType: GstDocumentType;
  direction: GstDirection;
  partyName: string;
  partyGstin?: string | null;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalValue: number;
  status: GstDocumentStatus;
}): GstRegisterRow {
  return {
    id: String(row._id),
    documentNumber: row.documentNumber,
    documentDate: row.documentDate,
    documentType: row.documentType,
    direction: row.direction,
    partyName: row.partyName,
    partyGstin: row.partyGstin ?? null,
    taxableValue: row.taxableValue,
    cgst: row.cgst,
    sgst: row.sgst,
    igst: row.igst,
    cess: row.cess,
    totalValue: row.totalValue,
    status: row.status,
  };
}
