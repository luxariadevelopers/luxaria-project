import type { Types } from 'mongoose';
import type { InvestorDocumentCategory } from './schemas/investor-document.schema';
import type {
  InvestorKycStatus,
  InvestorStatus,
  InvestorType,
} from './schemas/investor.schema';

export type PublicInvestorContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicInvestorBankDetails = {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  /** Decrypted when caller is authorized; otherwise null */
  accountNumber: string | null;
  accountNumberLast4: string | null;
};

export type PublicInvestorNominee = {
  fullName: string | null;
  relationship: string | null;
  pan: string | null;
  phone: string | null;
  email: string | null;
  sharePercent: number | null;
};

export type PublicInvestor = {
  id: string;
  companyId: string | null;
  investorCode: string;
  investorType: InvestorType;
  legalName: string;
  pan: string | null;
  gstin: string | null;
  cin: string | null;
  userId: string | null;
  directorId: string | null;
  contact: PublicInvestorContact;
  bankDetails: PublicInvestorBankDetails;
  nominee: PublicInvestorNominee;
  kycStatus: InvestorKycStatus;
  kycVerifiedBy: string | null;
  kycVerifiedAt: Date | null;
  kycNotes: string | null;
  status: InvestorStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicInvestorDocument = {
  id: string;
  investorId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
  category: InvestorDocumentCategory;
  uploadedBy: string | null;
  createdAt?: Date;
};

type InvestorLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  investorCode: string;
  investorType: InvestorType;
  legalName: string;
  pan?: string | null;
  gstin?: string | null;
  cin?: string | null;
  userId?: Types.ObjectId | string | null;
  directorId?: Types.ObjectId | string | null;
  contact?: Partial<PublicInvestorContact> | null;
  bankDetails?: {
    bankName?: string | null;
    branchName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  } | null;
  nominee?: Partial<PublicInvestorNominee> | null;
  kycStatus: InvestorKycStatus;
  kycVerifiedBy?: Types.ObjectId | string | null;
  kycVerifiedAt?: Date | null;
  kycNotes?: string | null;
  status: InvestorStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicInvestor(
  investor: InvestorLike,
  accountNumber: string | null = null,
): PublicInvestor {
  const contact = investor.contact ?? {};
  const bank = investor.bankDetails ?? {};
  const nominee = investor.nominee ?? {};

  return {
    id: String(investor._id),
    companyId: investor.companyId ? String(investor.companyId) : null,
    investorCode: investor.investorCode,
    investorType: investor.investorType,
    legalName: investor.legalName,
    pan: investor.pan ?? null,
    gstin: investor.gstin ?? null,
    cin: investor.cin ?? null,
    userId: investor.userId ? String(investor.userId) : null,
    directorId: investor.directorId ? String(investor.directorId) : null,
    contact: {
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      alternatePhone: contact.alternatePhone ?? null,
      addressLine1: contact.addressLine1 ?? null,
      addressLine2: contact.addressLine2 ?? null,
      city: contact.city ?? null,
      state: contact.state ?? null,
      pincode: contact.pincode ?? null,
      country: contact.country ?? null,
    },
    bankDetails: {
      bankName: bank.bankName ?? null,
      branchName: bank.branchName ?? null,
      ifsc: bank.ifsc ?? null,
      accountHolderName: bank.accountHolderName ?? null,
      accountNumber,
      accountNumberLast4: bank.accountNumberLast4 ?? null,
    },
    nominee: {
      fullName: nominee.fullName ?? null,
      relationship: nominee.relationship ?? null,
      pan: nominee.pan ?? null,
      phone: nominee.phone ?? null,
      email: nominee.email ?? null,
      sharePercent: nominee.sharePercent ?? null,
    },
    kycStatus: investor.kycStatus,
    kycVerifiedBy: investor.kycVerifiedBy
      ? String(investor.kycVerifiedBy)
      : null,
    kycVerifiedAt: investor.kycVerifiedAt ?? null,
    kycNotes: investor.kycNotes ?? null,
    status: investor.status,
    createdAt: investor.createdAt,
    updatedAt: investor.updatedAt,
  };
}
