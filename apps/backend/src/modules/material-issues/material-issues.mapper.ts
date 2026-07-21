import type { Types } from 'mongoose';
import type { MaterialUnit } from '../material-master/schemas/material.schema';
import type {
  MaterialIssueStatus,
  MaterialIssueTarget,
  MaterialReturnType,
} from './schemas/material-issue.schema';

export type PublicMaterialIssueSignatures = {
  recipientSignatureDocumentId: string | null;
  recipientSignatureChecksum: string | null;
  issuerSignatureDocumentId: string | null;
  issuerSignatureChecksum: string | null;
  recipientSignedAt: Date | null;
};

export type PublicMaterialIssueItem = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  unit: MaterialUnit;
  quantity: number;
  baseUnit: MaterialUnit;
  baseUnitQuantity: number;
  returnedBaseQuantity: number;
  remainingBaseQuantity: number;
  batch: string | null;
  notes: string | null;
  stockLedgerEntryId: string | null;
};

export type PublicMaterialReturnItem = {
  id: string;
  materialId: string;
  unit: MaterialUnit;
  quantity: number;
  baseUnitQuantity: number;
  reason: string | null;
  returnType: MaterialReturnType | null;
  stockLedgerEntryId: string | null;
};

export type PublicMaterialIssueReturn = {
  id: string;
  returnNumber: string;
  returnDate: Date;
  returnedBy: string;
  items: PublicMaterialReturnItem[];
  notes: string | null;
  postedAt: Date | null;
};

export type PublicMaterialIssue = {
  id: string;
  issueNumber: string;
  projectId: string;
  issueDate: Date;
  issuedBy: string;
  receivedBy: string;
  contractorId: string | null;
  blockId: string | null;
  floorId: string | null;
  boqItemId: string | null;
  workLocation: string | null;
  issueTarget: MaterialIssueTarget;
  issueSiteId: string | null;
  dprId: string | null;
  issueEmployeeId: string | null;
  issueDepartment: string | null;
  issueEquipmentRef: string | null;
  issueLabourRef: string | null;
  storeLocation: string;
  items: PublicMaterialIssueItem[];
  signatures: PublicMaterialIssueSignatures;
  status: MaterialIssueStatus;
  returns: PublicMaterialIssueReturn[];
  notes: string | null;
  submittedBy: string | null;
  submittedAt: Date | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function oid(value?: Types.ObjectId | string | null): string | null {
  return value ? String(value) : null;
}

type ItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  materialCode?: string | null;
  materialName?: string | null;
  unit: MaterialUnit;
  quantity: number;
  baseUnit: MaterialUnit;
  baseUnitQuantity: number;
  returnedBaseQuantity?: number;
  batch?: string | null;
  notes?: string | null;
  stockLedgerEntryId?: Types.ObjectId | string | null;
};

type ReturnItemLike = {
  _id?: Types.ObjectId | string;
  materialId: Types.ObjectId | string;
  unit: MaterialUnit;
  quantity: number;
  baseUnitQuantity: number;
  reason?: string | null;
  returnType?: MaterialReturnType | null;
  stockLedgerEntryId?: Types.ObjectId | string | null;
};

type ReturnLike = {
  _id?: Types.ObjectId | string;
  returnNumber: string;
  returnDate: Date;
  returnedBy: Types.ObjectId | string;
  items: ReturnItemLike[];
  notes?: string | null;
  postedAt?: Date | null;
};

type IssueLike = {
  _id: Types.ObjectId | string;
  issueNumber: string;
  projectId: Types.ObjectId | string;
  issueDate: Date;
  issuedBy: Types.ObjectId | string;
  receivedBy: Types.ObjectId | string;
  contractorId?: Types.ObjectId | string | null;
  blockId?: Types.ObjectId | string | null;
  floorId?: string | null;
  boqItemId?: Types.ObjectId | string | null;
  workLocation?: string | null;
  issueTarget?: MaterialIssueTarget;
  issueSiteId?: Types.ObjectId | string | null;
  dprId?: Types.ObjectId | string | null;
  issueEmployeeId?: Types.ObjectId | string | null;
  issueDepartment?: string | null;
  issueEquipmentRef?: string | null;
  issueLabourRef?: string | null;
  storeLocation?: string;
  items: ItemLike[];
  signatures?: {
    recipientSignatureDocumentId?: Types.ObjectId | string | null;
    recipientSignatureChecksum?: string | null;
    issuerSignatureDocumentId?: Types.ObjectId | string | null;
    issuerSignatureChecksum?: string | null;
    recipientSignedAt?: Date | null;
  } | null;
  status: MaterialIssueStatus;
  returns?: ReturnLike[];
  notes?: string | null;
  submittedBy?: Types.ObjectId | string | null;
  submittedAt?: Date | null;
  confirmedBy?: Types.ObjectId | string | null;
  confirmedAt?: Date | null;
  cancelledBy?: Types.ObjectId | string | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicMaterialIssue(row: IssueLike): PublicMaterialIssue {
  const signatures = row.signatures ?? {};
  return {
    id: String(row._id),
    issueNumber: row.issueNumber,
    projectId: String(row.projectId),
    issueDate: row.issueDate,
    issuedBy: String(row.issuedBy),
    receivedBy: String(row.receivedBy),
    contractorId: oid(row.contractorId),
    blockId: oid(row.blockId),
    floorId: row.floorId ?? null,
    boqItemId: oid(row.boqItemId),
    workLocation: row.workLocation ?? null,
    issueTarget: row.issueTarget ?? ('boq_work' as MaterialIssueTarget),
    issueSiteId: oid(row.issueSiteId),
    dprId: oid(row.dprId),
    issueEmployeeId: oid(row.issueEmployeeId),
    issueDepartment: row.issueDepartment ?? null,
    issueEquipmentRef: row.issueEquipmentRef ?? null,
    issueLabourRef: row.issueLabourRef ?? null,
    storeLocation: row.storeLocation ?? '',
    items: (row.items ?? []).map((item) => {
      const returned = item.returnedBaseQuantity ?? 0;
      return {
        id: item._id ? String(item._id) : '',
        materialId: String(item.materialId),
        materialCode: item.materialCode ?? null,
        materialName: item.materialName ?? null,
        unit: item.unit,
        quantity: item.quantity,
        baseUnit: item.baseUnit,
        baseUnitQuantity: item.baseUnitQuantity,
        returnedBaseQuantity: returned,
        remainingBaseQuantity: Math.max(
          0,
          Math.round((item.baseUnitQuantity - returned) * 1e6) / 1e6,
        ),
        batch: item.batch ?? null,
        notes: item.notes ?? null,
        stockLedgerEntryId: item.stockLedgerEntryId
          ? String(item.stockLedgerEntryId)
          : null,
      };
    }),
    signatures: {
      recipientSignatureDocumentId: oid(
        signatures.recipientSignatureDocumentId,
      ),
      recipientSignatureChecksum:
        signatures.recipientSignatureChecksum ?? null,
      issuerSignatureDocumentId: oid(signatures.issuerSignatureDocumentId),
      issuerSignatureChecksum: signatures.issuerSignatureChecksum ?? null,
      recipientSignedAt: signatures.recipientSignedAt ?? null,
    },
    status: row.status,
    returns: (row.returns ?? []).map((ret) => ({
      id: ret._id ? String(ret._id) : '',
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate,
      returnedBy: String(ret.returnedBy),
      items: (ret.items ?? []).map((item) => ({
        id: item._id ? String(item._id) : '',
        materialId: String(item.materialId),
        unit: item.unit,
        quantity: item.quantity,
        baseUnitQuantity: item.baseUnitQuantity,
        reason: item.reason ?? null,
        returnType: item.returnType ?? null,
        stockLedgerEntryId: item.stockLedgerEntryId
          ? String(item.stockLedgerEntryId)
          : null,
      })),
      notes: ret.notes ?? null,
      postedAt: ret.postedAt ?? null,
    })),
    notes: row.notes ?? null,
    submittedBy: oid(row.submittedBy),
    submittedAt: row.submittedAt ?? null,
    confirmedBy: oid(row.confirmedBy),
    confirmedAt: row.confirmedAt ?? null,
    cancelledBy: oid(row.cancelledBy),
    cancelledAt: row.cancelledAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
