import type { Types } from 'mongoose';
import type {
  WorkOrderAmendmentStatus,
  WorkOrderAmendmentType,
} from './schemas/work-order-amendment.schema';
import type {
  WorkOrderResponsibility,
  WorkOrderStatus,
} from './schemas/work-order.schema';
import type { BoqUnit } from '../boq/schemas/boq.schema';

export type PublicWorkOrderBoqLine = {
  id: string | null;
  boqItemId: string | null;
  boqCode: string | null;
  description: string;
  unit: BoqUnit;
  quantity: number;
  rate: number;
  value: number;
};

export type PublicWorkOrderMilestone = {
  name: string;
  dueDate: Date | null;
  percentComplete: number | null;
  notes: string | null;
};

export type PublicWorkOrderPaymentTerms = {
  description: string | null;
  advancePercent: number | null;
  billingCycle: string | null;
};

export type PublicWorkOrderRetention = {
  percentage: number;
  notes: string | null;
};

export type PublicWorkOrderRecovery = {
  type: string;
  amount: number;
  notes: string | null;
};

export type PublicWorkOrderRevision = {
  id: string | null;
  revision: number;
  amendmentId: string | null;
  boqScopeLines: PublicWorkOrderBoqLine[];
  locations: string[];
  startDate: Date;
  endDate: Date;
  milestones: PublicWorkOrderMilestone[];
  paymentTerms: PublicWorkOrderPaymentTerms;
  retention: PublicWorkOrderRetention;
  recoveries: PublicWorkOrderRecovery[];
  materialResponsibility: WorkOrderResponsibility;
  labourResponsibility: WorkOrderResponsibility;
  drawingIds: string[];
  terms: string | null;
  attachments: string[];
  contractValue: number;
  frozenBy: string;
  frozenAt: Date;
};

export type PublicWorkOrder = {
  id: string;
  workOrderNumber: string;
  activeRevision: number;
  projectId: string;
  siteId: string | null;
  contractorId: string;
  rateContractId: string | null;
  agreementId: string | null;
  boqScopeLines: PublicWorkOrderBoqLine[];
  locations: string[];
  startDate: Date;
  endDate: Date;
  milestones: PublicWorkOrderMilestone[];
  paymentTerms: PublicWorkOrderPaymentTerms;
  retention: PublicWorkOrderRetention;
  recoveries: PublicWorkOrderRecovery[];
  materialResponsibility: WorkOrderResponsibility;
  labourResponsibility: WorkOrderResponsibility;
  drawingIds: string[];
  terms: string | null;
  attachments: string[];
  contractValue: number;
  revisions: PublicWorkOrderRevision[];
  status: WorkOrderStatus;
  notes: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  issuedAt: Date | null;
  acceptedAt: Date | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicWorkOrderAmendment = {
  id: string;
  amendmentNumber: string;
  workOrderId: string;
  projectId: string;
  targetRevision: number;
  baseRevision: number;
  type: WorkOrderAmendmentType;
  status: WorkOrderAmendmentStatus;
  reason: string;
  proposed: {
    boqScopeLines: PublicWorkOrderBoqLine[];
    locations: string[];
    startDate: Date;
    endDate: Date;
    milestones: PublicWorkOrderMilestone[];
    paymentTerms: PublicWorkOrderPaymentTerms;
    retention: PublicWorkOrderRetention;
    recoveries: PublicWorkOrderRecovery[];
    materialResponsibility: WorkOrderResponsibility;
    labourResponsibility: WorkOrderResponsibility;
    drawingIds: string[];
    terms: string | null;
    attachments: string[];
    contractValue: number;
  };
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

function mapBoqLine(line: {
  _id?: Types.ObjectId | string;
  boqItemId?: Types.ObjectId | string | null;
  boqCode?: string | null;
  description: string;
  unit: BoqUnit;
  quantity: number;
  rate: number;
  value: number;
}): PublicWorkOrderBoqLine {
  return {
    id: line._id ? String(line._id) : null,
    boqItemId: oid(line.boqItemId),
    boqCode: line.boqCode ?? null,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    rate: line.rate,
    value: line.value,
  };
}

function mapMilestone(m: {
  name: string;
  dueDate?: Date | null;
  percentComplete?: number | null;
  notes?: string | null;
}): PublicWorkOrderMilestone {
  return {
    name: m.name,
    dueDate: m.dueDate ?? null,
    percentComplete: m.percentComplete ?? null,
    notes: m.notes ?? null,
  };
}

function mapPaymentTerms(p?: {
  description?: string | null;
  advancePercent?: number | null;
  billingCycle?: string | null;
} | null): PublicWorkOrderPaymentTerms {
  return {
    description: p?.description ?? null,
    advancePercent: p?.advancePercent ?? null,
    billingCycle: p?.billingCycle ?? null,
  };
}

function mapRetention(r?: {
  percentage?: number;
  notes?: string | null;
} | null): PublicWorkOrderRetention {
  return {
    percentage: r?.percentage ?? 0,
    notes: r?.notes ?? null,
  };
}

function mapRecovery(r: {
  type: string;
  amount: number;
  notes?: string | null;
}): PublicWorkOrderRecovery {
  return {
    type: r.type,
    amount: r.amount,
    notes: r.notes ?? null,
  };
}

export function toPublicWorkOrder(row: {
  _id: Types.ObjectId | string;
  workOrderNumber: string;
  activeRevision: number;
  projectId: Types.ObjectId | string;
  siteId?: Types.ObjectId | string | null;
  contractorId: Types.ObjectId | string;
  rateContractId?: Types.ObjectId | string | null;
  agreementId?: Types.ObjectId | string | null;
  boqScopeLines?: Array<{
    _id?: Types.ObjectId | string;
    boqItemId?: Types.ObjectId | string | null;
    boqCode?: string | null;
    description: string;
    unit: BoqUnit;
    quantity: number;
    rate: number;
    value: number;
  }>;
  locations?: string[];
  startDate: Date;
  endDate: Date;
  milestones?: Array<{
    name: string;
    dueDate?: Date | null;
    percentComplete?: number | null;
    notes?: string | null;
  }>;
  paymentTerms?: {
    description?: string | null;
    advancePercent?: number | null;
    billingCycle?: string | null;
  } | null;
  retention?: { percentage?: number; notes?: string | null } | null;
  recoveries?: Array<{ type: string; amount: number; notes?: string | null }>;
  materialResponsibility: WorkOrderResponsibility;
  labourResponsibility: WorkOrderResponsibility;
  drawingIds?: Array<Types.ObjectId | string>;
  terms?: string | null;
  attachments?: string[];
  contractValue: number;
  revisions?: Array<{
    _id?: Types.ObjectId | string;
    revision: number;
    amendmentId?: Types.ObjectId | string | null;
    boqScopeLines?: Array<{
      _id?: Types.ObjectId | string;
      boqItemId?: Types.ObjectId | string | null;
      boqCode?: string | null;
      description: string;
      unit: BoqUnit;
      quantity: number;
      rate: number;
      value: number;
    }>;
    locations?: string[];
    startDate: Date;
    endDate: Date;
    milestones?: Array<{
      name: string;
      dueDate?: Date | null;
      percentComplete?: number | null;
      notes?: string | null;
    }>;
    paymentTerms?: {
      description?: string | null;
      advancePercent?: number | null;
      billingCycle?: string | null;
    } | null;
    retention?: { percentage?: number; notes?: string | null } | null;
    recoveries?: Array<{
      type: string;
      amount: number;
      notes?: string | null;
    }>;
    materialResponsibility: WorkOrderResponsibility;
    labourResponsibility: WorkOrderResponsibility;
    drawingIds?: Array<Types.ObjectId | string>;
    terms?: string | null;
    attachments?: string[];
    contractValue: number;
    frozenBy: Types.ObjectId | string;
    frozenAt: Date;
  }>;
  status: WorkOrderStatus;
  notes?: string | null;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  issuedAt?: Date | null;
  acceptedAt?: Date | null;
  closedAt?: Date | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicWorkOrder {
  return {
    id: String(row._id),
    workOrderNumber: row.workOrderNumber,
    activeRevision: row.activeRevision,
    projectId: String(row.projectId),
    siteId: oid(row.siteId),
    contractorId: String(row.contractorId),
    rateContractId: oid(row.rateContractId),
    agreementId: oid(row.agreementId),
    boqScopeLines: (row.boqScopeLines ?? []).map(mapBoqLine),
    locations: row.locations ?? [],
    startDate: row.startDate,
    endDate: row.endDate,
    milestones: (row.milestones ?? []).map(mapMilestone),
    paymentTerms: mapPaymentTerms(row.paymentTerms),
    retention: mapRetention(row.retention),
    recoveries: (row.recoveries ?? []).map(mapRecovery),
    materialResponsibility: row.materialResponsibility,
    labourResponsibility: row.labourResponsibility,
    drawingIds: (row.drawingIds ?? []).map(String),
    terms: row.terms ?? null,
    attachments: row.attachments ?? [],
    contractValue: row.contractValue,
    revisions: (row.revisions ?? []).map((rev) => ({
      id: rev._id ? String(rev._id) : null,
      revision: rev.revision,
      amendmentId: oid(rev.amendmentId),
      boqScopeLines: (rev.boqScopeLines ?? []).map(mapBoqLine),
      locations: rev.locations ?? [],
      startDate: rev.startDate,
      endDate: rev.endDate,
      milestones: (rev.milestones ?? []).map(mapMilestone),
      paymentTerms: mapPaymentTerms(rev.paymentTerms),
      retention: mapRetention(rev.retention),
      recoveries: (rev.recoveries ?? []).map(mapRecovery),
      materialResponsibility: rev.materialResponsibility,
      labourResponsibility: rev.labourResponsibility,
      drawingIds: (rev.drawingIds ?? []).map(String),
      terms: rev.terms ?? null,
      attachments: rev.attachments ?? [],
      contractValue: rev.contractValue,
      frozenBy: String(rev.frozenBy),
      frozenAt: rev.frozenAt,
    })),
    status: row.status,
    notes: row.notes ?? null,
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    issuedAt: row.issuedAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
    closedAt: row.closedAt ?? null,
    cancelledAt: row.cancelledAt ?? null,
    cancellationReason: row.cancellationReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPublicWorkOrderAmendment(row: {
  _id: Types.ObjectId | string;
  amendmentNumber: string;
  workOrderId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  targetRevision: number;
  baseRevision: number;
  type: WorkOrderAmendmentType;
  status: WorkOrderAmendmentStatus;
  reason: string;
  proposed: {
    boqScopeLines?: Array<{
      _id?: Types.ObjectId | string;
      boqItemId?: Types.ObjectId | string | null;
      boqCode?: string | null;
      description: string;
      unit: BoqUnit;
      quantity: number;
      rate: number;
      value: number;
    }>;
    locations?: string[];
    startDate: Date;
    endDate: Date;
    milestones?: Array<{
      name: string;
      dueDate?: Date | null;
      percentComplete?: number | null;
      notes?: string | null;
    }>;
    paymentTerms?: {
      description?: string | null;
      advancePercent?: number | null;
      billingCycle?: string | null;
    } | null;
    retention?: { percentage?: number; notes?: string | null } | null;
    recoveries?: Array<{
      type: string;
      amount: number;
      notes?: string | null;
    }>;
    materialResponsibility: WorkOrderResponsibility;
    labourResponsibility: WorkOrderResponsibility;
    drawingIds?: Array<Types.ObjectId | string>;
    terms?: string | null;
    attachments?: string[];
    contractValue: number;
  };
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicWorkOrderAmendment {
  return {
    id: String(row._id),
    amendmentNumber: row.amendmentNumber,
    workOrderId: String(row.workOrderId),
    projectId: String(row.projectId),
    targetRevision: row.targetRevision,
    baseRevision: row.baseRevision,
    type: row.type,
    status: row.status,
    reason: row.reason,
    proposed: {
      boqScopeLines: (row.proposed.boqScopeLines ?? []).map(mapBoqLine),
      locations: row.proposed.locations ?? [],
      startDate: row.proposed.startDate,
      endDate: row.proposed.endDate,
      milestones: (row.proposed.milestones ?? []).map(mapMilestone),
      paymentTerms: mapPaymentTerms(row.proposed.paymentTerms),
      retention: mapRetention(row.proposed.retention),
      recoveries: (row.proposed.recoveries ?? []).map(mapRecovery),
      materialResponsibility: row.proposed.materialResponsibility,
      labourResponsibility: row.proposed.labourResponsibility,
      drawingIds: (row.proposed.drawingIds ?? []).map(String),
      terms: row.proposed.terms ?? null,
      attachments: row.proposed.attachments ?? [],
      contractValue: row.proposed.contractValue,
    },
    submittedAt: row.submittedAt ?? null,
    approvedAt: row.approvedAt ?? null,
    rejectedAt: row.rejectedAt ?? null,
    rejectionReason: row.rejectionReason ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
