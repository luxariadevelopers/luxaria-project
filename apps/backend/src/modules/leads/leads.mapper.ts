import { Types } from 'mongoose';
import type {
  LeadAttachment,
  LeadContact,
  LeadFollowUp,
  LeadSource,
  LeadStatus,
  LeadTask,
  LeadTaskStatus,
} from './schemas/lead.schema';

export type PublicLeadContact = {
  fullName: string;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
};

export type PublicLeadFollowUp = {
  id: string;
  at: string;
  note: string;
  by: string | null;
  nextFollowUpAt: string | null;
};

export type PublicLeadTask = {
  id: string;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  status: LeadTaskStatus;
};

export type PublicLeadAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
};

export type PublicLead = {
  id: string;
  leadNumber: string;
  companyId: string | null;
  projectId: string | null;
  source: LeadSource;
  campaignName: string | null;
  status: LeadStatus;
  contact: PublicLeadContact;
  familyDetails: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredLocation: string | null;
  unitPreference: string | null;
  fundingSource: string | null;
  loanRequired: boolean;
  assignedTo: string | null;
  convertedCustomerId: string | null;
  lostReason: string | null;
  notes: string | null;
  followUps: PublicLeadFollowUp[];
  tasks: PublicLeadTask[];
  attachments: PublicLeadAttachment[];
  siteVisitAt: string | null;
  wonAt: string | null;
  lostAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const oid = (v: Types.ObjectId | string | null | undefined): string | null =>
  v ? String(v) : null;

const iso = (v: Date | null | undefined): string | null =>
  v ? v.toISOString() : null;

const mapContact = (contact: LeadContact): PublicLeadContact => ({
  fullName: contact.fullName,
  email: contact.email ?? null,
  phone: contact.phone ?? null,
  alternatePhone: contact.alternatePhone ?? null,
});

const mapFollowUp = (row: LeadFollowUp & { _id?: Types.ObjectId }): PublicLeadFollowUp => ({
  id: String(row._id),
  at: row.at.toISOString(),
  note: row.note,
  by: oid(row.by),
  nextFollowUpAt: iso(row.nextFollowUpAt),
});

const mapTask = (row: LeadTask & { _id?: Types.ObjectId }): PublicLeadTask => ({
  id: String(row._id ?? new Types.ObjectId()),
  title: row.title,
  dueAt: iso(row.dueAt),
  completedAt: iso(row.completedAt),
  completedBy: oid(row.completedBy),
  status: row.status,
});

const mapAttachment = (
  row: LeadAttachment & { _id?: Types.ObjectId },
): PublicLeadAttachment => ({
  id: String(row._id),
  fileName: row.fileName,
  filePath: row.filePath,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  uploadedAt: row.uploadedAt.toISOString(),
  uploadedBy: String(row.uploadedBy),
});

export function toPublicLead(row: {
  _id: Types.ObjectId | string;
  leadNumber: string;
  companyId?: Types.ObjectId | string | null;
  projectId?: Types.ObjectId | string | null;
  source: LeadSource;
  campaignName?: string | null;
  status: LeadStatus;
  contact: LeadContact;
  familyDetails?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredLocation?: string | null;
  unitPreference?: string | null;
  fundingSource?: string | null;
  loanRequired?: boolean;
  assignedTo?: Types.ObjectId | string | null;
  convertedCustomerId?: Types.ObjectId | string | null;
  lostReason?: string | null;
  notes?: string | null;
  followUps?: (LeadFollowUp & { _id?: Types.ObjectId })[];
  tasks?: (LeadTask & { _id?: Types.ObjectId })[];
  attachments?: (LeadAttachment & { _id?: Types.ObjectId })[];
  siteVisitAt?: Date | null;
  wonAt?: Date | null;
  lostAt?: Date | null;
  createdBy?: Types.ObjectId | string | null;
  updatedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicLead {
  return {
    id: String(row._id),
    leadNumber: row.leadNumber,
    companyId: oid(row.companyId),
    projectId: oid(row.projectId),
    source: row.source,
    campaignName: row.campaignName ?? null,
    status: row.status,
    contact: mapContact(row.contact),
    familyDetails: row.familyDetails ?? null,
    budgetMin: row.budgetMin ?? null,
    budgetMax: row.budgetMax ?? null,
    preferredLocation: row.preferredLocation ?? null,
    unitPreference: row.unitPreference ?? null,
    fundingSource: row.fundingSource ?? null,
    loanRequired: row.loanRequired ?? false,
    assignedTo: oid(row.assignedTo),
    convertedCustomerId: oid(row.convertedCustomerId),
    lostReason: row.lostReason ?? null,
    notes: row.notes ?? null,
    followUps: (row.followUps ?? []).map(mapFollowUp),
    tasks: (row.tasks ?? []).map(mapTask),
    attachments: (row.attachments ?? []).map(mapAttachment),
    siteVisitAt: iso(row.siteVisitAt),
    wonAt: iso(row.wonAt),
    lostAt: iso(row.lostAt),
    createdBy: oid(row.createdBy),
    updatedBy: oid(row.updatedBy),
    createdAt: iso(row.createdAt) ?? undefined,
    updatedAt: iso(row.updatedAt) ?? undefined,
  };
}
