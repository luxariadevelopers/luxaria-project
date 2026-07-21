import type { Types } from 'mongoose';
import type {
  ContractorDocumentCategory,
  ContractorDocumentVerificationStatus,
} from './schemas/contractor-document.schema';
import type { ContractorProjectAssignmentStatus } from './schemas/contractor-project-assignment.schema';
import type {
  ContractorStatus,
  ContractorStatusAction,
  ContractorType,
  ContractorVerificationStatus,
} from './schemas/contractor.schema';
import { complianceIsValid } from './contractors.validation';

export type PublicContractorContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  contactPerson: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicContractorContactEntry = {
  label: string;
  isPrimary: boolean;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  contactPerson: string | null;
  designation: string | null;
};

export type PublicContractorAddress = {
  label: string;
  isPrimary: boolean;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicContractorBankDetails = {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  accountNumberLast4: string | null;
};

export type PublicContractorLabourLicence = {
  licenceNumber: string | null;
  issuedBy: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  notes: string | null;
  isValid: boolean | null;
};

export type PublicContractorInsurance = {
  policyNumber: string | null;
  insurer: string | null;
  coverageType: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  notes: string | null;
  isValid: boolean | null;
};

export type PublicContractorStatusEvent = {
  fromStatus: string;
  toStatus: string;
  action: ContractorStatusAction;
  reason: string | null;
  actorId: string;
  at: Date;
};

export type PublicContractor = {
  id: string;
  companyId: string | null;
  contractorCode: string;
  legalName: string;
  tradeName: string | null;
  contractorType: ContractorType;
  pan: string | null;
  gstin: string | null;
  contact: PublicContractorContact;
  contacts: PublicContractorContactEntry[];
  addresses: PublicContractorAddress[];
  bankDetails: PublicContractorBankDetails;
  labourLicence: PublicContractorLabourLicence;
  insurance: PublicContractorInsurance;
  workCategories: string[];
  rating: number | null;
  verificationStatus: ContractorVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  verificationNotes: string | null;
  status: ContractorStatus;
  blockReason: string | null;
  statusReason: string | null;
  statusEvents: PublicContractorStatusEvent[];
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicContractorDocument = {
  id: string;
  contractorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: ContractorDocumentCategory;
  verificationStatus: ContractorDocumentVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  verificationNotes: string | null;
  expiresAt: Date | null;
  uploadedBy: string | null;
  createdAt?: Date;
};

export type PublicContractorProjectAssignment = {
  id: string;
  contractorId: string;
  projectId: string;
  status: ContractorProjectAssignmentStatus;
  notes: string | null;
  assignedBy: string | null;
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type ContractorLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  contractorCode: string;
  legalName: string;
  tradeName?: string | null;
  contractorType: ContractorType;
  pan?: string | null;
  gstin?: string | null;
  contact?: Partial<PublicContractorContact> | null;
  contacts?: Partial<PublicContractorContactEntry>[] | null;
  addresses?: Partial<PublicContractorAddress>[] | null;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  } | null;
  labourLicence?: {
    licenceNumber?: string | null;
    issuedBy?: string | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    notes?: string | null;
  } | null;
  insurance?: {
    policyNumber?: string | null;
    insurer?: string | null;
    coverageType?: string | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    notes?: string | null;
  } | null;
  workCategories?: string[];
  rating?: number | null;
  verificationStatus: ContractorVerificationStatus;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  verificationNotes?: string | null;
  status: ContractorStatus;
  blockReason?: string | null;
  statusReason?: string | null;
  statusEvents?: {
    fromStatus: string;
    toStatus: string;
    action: ContractorStatusAction;
    reason?: string | null;
    actorId: Types.ObjectId | string;
    at: Date;
  }[];
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicContractor(
  contractor: ContractorLike,
  accountNumber: string | null = null,
): PublicContractor {
  const contact = contractor.contact ?? {};
  const bank = contractor.bankDetails ?? {};
  const licence = contractor.labourLicence ?? {};
  const insurance = contractor.insurance ?? {};

  return {
    id: String(contractor._id),
    companyId: contractor.companyId ? String(contractor.companyId) : null,
    contractorCode: contractor.contractorCode,
    legalName: contractor.legalName,
    tradeName: contractor.tradeName ?? null,
    contractorType: contractor.contractorType,
    pan: contractor.pan ?? null,
    gstin: contractor.gstin ?? null,
    contact: {
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      alternatePhone: contact.alternatePhone ?? null,
      contactPerson: contact.contactPerson ?? null,
      addressLine1: contact.addressLine1 ?? null,
      addressLine2: contact.addressLine2 ?? null,
      city: contact.city ?? null,
      state: contact.state ?? null,
      pincode: contact.pincode ?? null,
      country: contact.country ?? null,
    },
    contacts: (contractor.contacts ?? []).map((c) => ({
      label: c.label ?? 'Contact',
      isPrimary: Boolean(c.isPrimary),
      email: c.email ?? null,
      phone: c.phone ?? null,
      alternatePhone: c.alternatePhone ?? null,
      contactPerson: c.contactPerson ?? null,
      designation: c.designation ?? null,
    })),
    addresses: (contractor.addresses ?? []).map((a) => ({
      label: a.label ?? 'Address',
      isPrimary: Boolean(a.isPrimary),
      line1: a.line1 ?? null,
      line2: a.line2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      pincode: a.pincode ?? null,
      country: a.country ?? null,
    })),
    bankDetails: {
      bankName: bank.bankName ?? null,
      branchName: bank.branchName ?? null,
      ifsc: bank.ifsc ?? null,
      accountHolderName: bank.accountHolderName ?? null,
      accountNumber,
      accountNumberLast4: bank.accountNumberLast4 ?? null,
    },
    labourLicence: {
      licenceNumber: licence.licenceNumber ?? null,
      issuedBy: licence.issuedBy ?? null,
      validFrom: licence.validFrom ?? null,
      validTo: licence.validTo ?? null,
      notes: licence.notes ?? null,
      isValid: complianceIsValid({ validTo: licence.validTo ?? null }),
    },
    insurance: {
      policyNumber: insurance.policyNumber ?? null,
      insurer: insurance.insurer ?? null,
      coverageType: insurance.coverageType ?? null,
      validFrom: insurance.validFrom ?? null,
      validTo: insurance.validTo ?? null,
      notes: insurance.notes ?? null,
      isValid: complianceIsValid({ validTo: insurance.validTo ?? null }),
    },
    workCategories: contractor.workCategories ?? [],
    rating: contractor.rating ?? null,
    verificationStatus: contractor.verificationStatus,
    verifiedBy: contractor.verifiedBy ? String(contractor.verifiedBy) : null,
    verifiedAt: contractor.verifiedAt ?? null,
    verificationNotes: contractor.verificationNotes ?? null,
    status: contractor.status,
    blockReason: contractor.blockReason ?? null,
    statusReason: contractor.statusReason ?? null,
    statusEvents: (contractor.statusEvents ?? []).map((e) => ({
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      action: e.action,
      reason: e.reason ?? null,
      actorId: String(e.actorId),
      at: e.at,
    })),
    notes: contractor.notes ?? null,
    createdAt: contractor.createdAt,
    updatedAt: contractor.updatedAt,
  };
}

export function toPublicContractorDocument(doc: {
  _id: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  sizeBytes: number;
  category: ContractorDocumentCategory;
  verificationStatus?: ContractorDocumentVerificationStatus;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  verificationNotes?: string | null;
  expiresAt?: Date | null;
  uploadedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
}): PublicContractorDocument {
  return {
    id: String(doc._id),
    contractorId: String(doc.contractorId),
    fileName: doc.fileName,
    filePath: doc.filePath,
    mimeType: doc.mimeType ?? null,
    sizeBytes: doc.sizeBytes,
    category: doc.category,
    verificationStatus:
      doc.verificationStatus ??
      ('pending' as ContractorDocumentVerificationStatus),
    verifiedBy: doc.verifiedBy ? String(doc.verifiedBy) : null,
    verifiedAt: doc.verifiedAt ?? null,
    verificationNotes: doc.verificationNotes ?? null,
    expiresAt: doc.expiresAt ?? null,
    uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
    createdAt: doc.createdAt,
  };
}

export function toPublicContractorProjectAssignment(row: {
  _id: Types.ObjectId | string;
  contractorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  status: ContractorProjectAssignmentStatus;
  notes?: string | null;
  assignedBy?: Types.ObjectId | string | null;
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicContractorProjectAssignment {
  return {
    id: String(row._id),
    contractorId: String(row.contractorId),
    projectId: String(row.projectId),
    status: row.status,
    notes: row.notes ?? null,
    assignedBy: row.assignedBy ? String(row.assignedBy) : null,
    assignedAt: row.assignedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
