import type { Types } from 'mongoose';
import type { BoqUnit } from '../boq/schemas/boq.schema';
import type {
  RateContractScope,
  RateContractStatus,
} from './schemas/rate-contract.schema';

const oid = (v?: Types.ObjectId | string | null): string | null =>
  v ? String(v) : null;

export type PublicRateContractBoqItemRate = {
  id: string;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: BoqUnit;
  rate: number;
  remarks: string | null;
};

export type PublicRateContractLabourRate = {
  id: string;
  skill: string;
  category: string | null;
  unit: BoqUnit;
  rate: number;
  remarks: string | null;
};

export type PublicRateContractMaterialInclusiveRate = {
  id: string;
  description: string;
  unit: BoqUnit;
  rate: number;
  includesMaterials: string[];
  remarks: string | null;
};

export type PublicRateContractEquipmentRate = {
  id: string;
  equipmentType: string;
  unit: BoqUnit;
  rate: number;
  withOperator: boolean;
  fuelInclusive: boolean;
  remarks: string | null;
};

export type PublicRateContract = {
  id: string;
  contractNumber: string;
  version: number;
  supersedesId: string | null;
  companyId: string | null;
  contractorId: string;
  projectId: string | null;
  scope: RateContractScope;
  title: string | null;
  boqItemRates: PublicRateContractBoqItemRate[];
  labourRates: PublicRateContractLabourRate[];
  materialInclusiveRates: PublicRateContractMaterialInclusiveRate[];
  equipmentRates: PublicRateContractEquipmentRate[];
  validityFrom: Date;
  validityTo: Date;
  escalationClauses: Array<{
    indexName: string | null;
    formula: string | null;
    baseDate: Date | null;
    percent: number | null;
    notes: string | null;
  }>;
  taxConfig: {
    gstPercent: number | null;
    gstInclusive: boolean;
    tdsPercent: number | null;
    notes: string | null;
  };
  retentionPercent: number;
  securityDeposit: {
    amount: number | null;
    percent: number | null;
    instrumentType: string | null;
    notes: string | null;
  };
  advanceRecovery: {
    method: string | null;
    percentPerBill: number | null;
    startAfterBillNumber: number | null;
    notes: string | null;
  };
  penaltyRules: {
    ldPercentPerDay: number | null;
    ldCapPercent: number | null;
    description: string | null;
    notes: string | null;
  };
  status: RateContractStatus;
  activatedBy: string | null;
  activatedAt: Date | null;
  terminatedBy: string | null;
  terminatedAt: Date | null;
  terminationReason: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

type RateContractLike = {
  _id: Types.ObjectId | string;
  contractNumber: string;
  version: number;
  supersedesId?: Types.ObjectId | string | null;
  companyId?: Types.ObjectId | string | null;
  contractorId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string | null;
  scope: RateContractScope;
  title?: string | null;
  boqItemRates?: Array<{
    _id?: Types.ObjectId | string;
    boqItemId?: Types.ObjectId | string | null;
    boqCode?: string | null;
    description: string;
    unit: BoqUnit;
    rate: number;
    remarks?: string | null;
  }>;
  labourRates?: Array<{
    _id?: Types.ObjectId | string;
    skill: string;
    category?: string | null;
    unit: BoqUnit;
    rate: number;
    remarks?: string | null;
  }>;
  materialInclusiveRates?: Array<{
    _id?: Types.ObjectId | string;
    description: string;
    unit: BoqUnit;
    rate: number;
    includesMaterials?: string[];
    remarks?: string | null;
  }>;
  equipmentRates?: Array<{
    _id?: Types.ObjectId | string;
    equipmentType: string;
    unit: BoqUnit;
    rate: number;
    withOperator?: boolean;
    fuelInclusive?: boolean;
    remarks?: string | null;
  }>;
  validityFrom: Date;
  validityTo: Date;
  escalationClauses?: Array<{
    indexName?: string | null;
    formula?: string | null;
    baseDate?: Date | null;
    percent?: number | null;
    notes?: string | null;
  }>;
  taxConfig?: {
    gstPercent?: number | null;
    gstInclusive?: boolean;
    tdsPercent?: number | null;
    notes?: string | null;
  };
  retentionPercent: number;
  securityDeposit?: {
    amount?: number | null;
    percent?: number | null;
    instrumentType?: string | null;
    notes?: string | null;
  };
  advanceRecovery?: {
    method?: string | null;
    percentPerBill?: number | null;
    startAfterBillNumber?: number | null;
    notes?: string | null;
  };
  penaltyRules?: {
    ldPercentPerDay?: number | null;
    ldCapPercent?: number | null;
    description?: string | null;
    notes?: string | null;
  };
  status: RateContractStatus;
  activatedBy?: Types.ObjectId | string | null;
  activatedAt?: Date | null;
  terminatedBy?: Types.ObjectId | string | null;
  terminatedAt?: Date | null;
  terminationReason?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicRateContract(row: RateContractLike): PublicRateContract {
  return {
    id: String(row._id),
    contractNumber: row.contractNumber,
    version: row.version,
    supersedesId: oid(row.supersedesId),
    companyId: oid(row.companyId),
    contractorId: String(row.contractorId),
    projectId: oid(row.projectId),
    scope: row.scope,
    title: row.title ?? null,
    boqItemRates: (row.boqItemRates ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      boqItemId: oid(item.boqItemId),
      boqCode: item.boqCode ?? null,
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks ?? null,
    })),
    labourRates: (row.labourRates ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      skill: item.skill,
      category: item.category ?? null,
      unit: item.unit,
      rate: item.rate,
      remarks: item.remarks ?? null,
    })),
    materialInclusiveRates: (row.materialInclusiveRates ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      includesMaterials: item.includesMaterials ?? [],
      remarks: item.remarks ?? null,
    })),
    equipmentRates: (row.equipmentRates ?? []).map((item) => ({
      id: item._id ? String(item._id) : '',
      equipmentType: item.equipmentType,
      unit: item.unit,
      rate: item.rate,
      withOperator: item.withOperator ?? false,
      fuelInclusive: item.fuelInclusive ?? false,
      remarks: item.remarks ?? null,
    })),
    validityFrom: row.validityFrom,
    validityTo: row.validityTo,
    escalationClauses: (row.escalationClauses ?? []).map((c) => ({
      indexName: c.indexName ?? null,
      formula: c.formula ?? null,
      baseDate: c.baseDate ?? null,
      percent: c.percent ?? null,
      notes: c.notes ?? null,
    })),
    taxConfig: {
      gstPercent: row.taxConfig?.gstPercent ?? null,
      gstInclusive: row.taxConfig?.gstInclusive ?? false,
      tdsPercent: row.taxConfig?.tdsPercent ?? null,
      notes: row.taxConfig?.notes ?? null,
    },
    retentionPercent: row.retentionPercent,
    securityDeposit: {
      amount: row.securityDeposit?.amount ?? null,
      percent: row.securityDeposit?.percent ?? null,
      instrumentType: row.securityDeposit?.instrumentType ?? null,
      notes: row.securityDeposit?.notes ?? null,
    },
    advanceRecovery: {
      method: row.advanceRecovery?.method ?? null,
      percentPerBill: row.advanceRecovery?.percentPerBill ?? null,
      startAfterBillNumber: row.advanceRecovery?.startAfterBillNumber ?? null,
      notes: row.advanceRecovery?.notes ?? null,
    },
    penaltyRules: {
      ldPercentPerDay: row.penaltyRules?.ldPercentPerDay ?? null,
      ldCapPercent: row.penaltyRules?.ldCapPercent ?? null,
      description: row.penaltyRules?.description ?? null,
      notes: row.penaltyRules?.notes ?? null,
    },
    status: row.status,
    activatedBy: oid(row.activatedBy),
    activatedAt: row.activatedAt ?? null,
    terminatedBy: oid(row.terminatedBy),
    terminatedAt: row.terminatedAt ?? null,
    terminationReason: row.terminationReason ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
