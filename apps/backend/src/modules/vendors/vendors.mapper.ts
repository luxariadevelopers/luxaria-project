import type { Types } from 'mongoose';
import type { VendorDocumentCategory } from './schemas/vendor-document.schema';
import type { VendorProjectAssignmentStatus } from './schemas/vendor-project-assignment.schema';
import type {
  VendorStatus,
  VendorVerificationStatus,
} from './schemas/vendor.schema';

export type PublicVendorContact = {
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

export type PublicVendorBillingAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicVendorBankDetails = {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  accountNumberLast4: string | null;
};

export type PublicVendor = {
  id: string;
  companyId: string | null;
  vendorCode: string;
  legalName: string;
  tradeName: string | null;
  gstin: string | null;
  pan: string | null;
  contact: PublicVendorContact;
  billingAddress: PublicVendorBillingAddress;
  bankDetails: PublicVendorBankDetails;
  materialCategories: string[];
  paymentTerms: string | null;
  creditLimit: number;
  tdsApplicable: boolean;
  tdsPercentage: number | null;
  retentionPercentage: number;
  rating: number | null;
  verificationStatus: VendorVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  verificationNotes: string | null;
  status: VendorStatus;
  blockReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicVendorDocument = {
  id: string;
  vendorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: VendorDocumentCategory;
  uploadedBy: string | null;
  createdAt?: Date;
};

export type PublicVendorProjectAssignment = {
  id: string;
  vendorId: string;
  projectId: string;
  status: VendorProjectAssignmentStatus;
  notes: string | null;
  assignedBy: string | null;
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type VendorLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  vendorCode: string;
  legalName: string;
  tradeName?: string | null;
  gstin?: string | null;
  pan?: string | null;
  contact?: Partial<PublicVendorContact> | null;
  billingAddress?: Partial<PublicVendorBillingAddress> | null;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  } | null;
  materialCategories?: string[];
  paymentTerms?: string | null;
  creditLimit?: number;
  tdsApplicable?: boolean;
  tdsPercentage?: number | null;
  retentionPercentage?: number;
  rating?: number | null;
  verificationStatus: VendorVerificationStatus;
  verifiedBy?: Types.ObjectId | string | null;
  verifiedAt?: Date | null;
  verificationNotes?: string | null;
  status: VendorStatus;
  blockReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicVendor(
  vendor: VendorLike,
  accountNumber: string | null = null,
): PublicVendor {
  const contact = vendor.contact ?? {};
  const billing = vendor.billingAddress ?? {};
  const bank = vendor.bankDetails ?? {};

  return {
    id: String(vendor._id),
    companyId: vendor.companyId ? String(vendor.companyId) : null,
    vendorCode: vendor.vendorCode,
    legalName: vendor.legalName,
    tradeName: vendor.tradeName ?? null,
    gstin: vendor.gstin ?? null,
    pan: vendor.pan ?? null,
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
    billingAddress: {
      line1: billing.line1 ?? null,
      line2: billing.line2 ?? null,
      city: billing.city ?? null,
      state: billing.state ?? null,
      pincode: billing.pincode ?? null,
      country: billing.country ?? null,
    },
    bankDetails: {
      bankName: bank.bankName ?? null,
      branchName: bank.branchName ?? null,
      ifsc: bank.ifsc ?? null,
      accountHolderName: bank.accountHolderName ?? null,
      accountNumber,
      accountNumberLast4: bank.accountNumberLast4 ?? null,
    },
    materialCategories: vendor.materialCategories ?? [],
    paymentTerms: vendor.paymentTerms ?? null,
    creditLimit: vendor.creditLimit ?? 0,
    tdsApplicable: Boolean(vendor.tdsApplicable),
    tdsPercentage: vendor.tdsPercentage ?? null,
    retentionPercentage: vendor.retentionPercentage ?? 0,
    rating: vendor.rating ?? null,
    verificationStatus: vendor.verificationStatus,
    verifiedBy: vendor.verifiedBy ? String(vendor.verifiedBy) : null,
    verifiedAt: vendor.verifiedAt ?? null,
    verificationNotes: vendor.verificationNotes ?? null,
    status: vendor.status,
    blockReason: vendor.blockReason ?? null,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

export function toPublicVendorDocument(doc: {
  _id: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  sizeBytes: number;
  category: VendorDocumentCategory;
  uploadedBy?: Types.ObjectId | string | null;
  createdAt?: Date;
}): PublicVendorDocument {
  return {
    id: String(doc._id),
    vendorId: String(doc.vendorId),
    fileName: doc.fileName,
    filePath: doc.filePath,
    mimeType: doc.mimeType ?? null,
    sizeBytes: doc.sizeBytes,
    category: doc.category,
    uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
    createdAt: doc.createdAt,
  };
}

export function toPublicVendorProjectAssignment(row: {
  _id: Types.ObjectId | string;
  vendorId: Types.ObjectId | string;
  projectId: Types.ObjectId | string;
  status: VendorProjectAssignmentStatus;
  notes?: string | null;
  assignedBy?: Types.ObjectId | string | null;
  assignedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}): PublicVendorProjectAssignment {
  return {
    id: String(row._id),
    vendorId: String(row.vendorId),
    projectId: String(row.projectId),
    status: row.status,
    notes: row.notes ?? null,
    assignedBy: row.assignedBy ? String(row.assignedBy) : null,
    assignedAt: row.assignedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
