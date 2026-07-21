import type { Types } from 'mongoose';
import type { CustomerDocumentCategory } from './schemas/customer-document.schema';
import type {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerStatus,
  CustomerType,
} from './schemas/customer.schema';

export type PublicCustomerContact = {
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
};

export type PublicCustomerAddress = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
};

export type PublicCustomerBankDetails = {
  accountHolderName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  branch: string | null;
};

export type PublicCustomerNominee = {
  fullName: string | null;
  relationship: string | null;
  phone: string | null;
  address: string | null;
};

export type PublicCustomerCommunicationPreferences = {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  postal: boolean;
};

export type PublicCustomerJointApplicant = {
  fullName: string | null;
  relationship: string | null;
  pan: string | null;
  aadhaarReference: string | null;
  /** Decrypted when caller is authorized; otherwise null */
  aadhaar: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicCustomer = {
  id: string;
  companyId: string | null;
  customerCode: string;
  customerType: CustomerType;
  fullName: string;
  jointApplicant: PublicCustomerJointApplicant;
  pan: string | null;
  aadhaarReference: string | null;
  /** Decrypted when caller is authorized; otherwise null */
  aadhaar: string | null;
  passportNumber: string | null;
  gstin: string | null;
  contact: PublicCustomerContact;
  additionalContacts: PublicCustomerContact[];
  address: PublicCustomerAddress;
  bankDetails: PublicCustomerBankDetails;
  nominee: PublicCustomerNominee;
  communicationPreferences: PublicCustomerCommunicationPreferences;
  occupation: string | null;
  fundingType: CustomerFundingType;
  loanBank: string | null;
  sourceLeadId: string | null;
  kycStatus: CustomerKycStatus;
  kycVerifiedBy: string | null;
  kycVerifiedAt: Date | null;
  kycNotes: string | null;
  status: CustomerStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PublicCustomerDocument = {
  id: string;
  customerId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number;
  category: CustomerDocumentCategory;
  isSensitive: boolean;
  uploadedBy: string | null;
  createdAt?: Date;
};

type CustomerLike = {
  _id: Types.ObjectId | string;
  companyId?: Types.ObjectId | string | null;
  customerCode: string;
  customerType?: CustomerType;
  fullName: string;
  jointApplicant?: {
    fullName?: string | null;
    relationship?: string | null;
    pan?: string | null;
    aadhaarReference?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  pan?: string | null;
  aadhaarReference?: string | null;
  passportNumber?: string | null;
  gstin?: string | null;
  contact?: Partial<PublicCustomerContact> | null;
  additionalContacts?: Partial<PublicCustomerContact>[] | null;
  address?: Partial<PublicCustomerAddress> | null;
  bankDetails?: Partial<PublicCustomerBankDetails> | null;
  nominee?: Partial<PublicCustomerNominee> | null;
  communicationPreferences?: Partial<PublicCustomerCommunicationPreferences> | null;
  occupation?: string | null;
  fundingType: CustomerFundingType;
  loanBank?: string | null;
  sourceLeadId?: Types.ObjectId | string | null;
  kycStatus: CustomerKycStatus;
  kycVerifiedBy?: Types.ObjectId | string | null;
  kycVerifiedAt?: Date | null;
  kycNotes?: string | null;
  status: CustomerStatus;
  createdAt?: Date;
  updatedAt?: Date;
};

function mapContact(
  contact: Partial<PublicCustomerContact> | null | undefined,
): PublicCustomerContact {
  return {
    email: contact?.email ?? null,
    phone: contact?.phone ?? null,
    alternatePhone: contact?.alternatePhone ?? null,
  };
}

export function toPublicCustomer(
  customer: CustomerLike,
  options: {
    aadhaar?: string | null;
    jointApplicantAadhaar?: string | null;
  } = {},
): PublicCustomer {
  const contact = customer.contact ?? {};
  const address = customer.address ?? {};
  const joint = customer.jointApplicant ?? {};
  const bank = customer.bankDetails ?? {};
  const nominee = customer.nominee ?? {};
  const prefs = customer.communicationPreferences ?? {};

  return {
    id: String(customer._id),
    companyId: customer.companyId ? String(customer.companyId) : null,
    customerCode: customer.customerCode,
    customerType: customer.customerType ?? ('individual' as CustomerType),
    fullName: customer.fullName,
    jointApplicant: {
      fullName: joint.fullName ?? null,
      relationship: joint.relationship ?? null,
      pan: joint.pan ?? null,
      aadhaarReference: joint.aadhaarReference ?? null,
      aadhaar: options.jointApplicantAadhaar ?? null,
      phone: joint.phone ?? null,
      email: joint.email ?? null,
    },
    pan: customer.pan ?? null,
    aadhaarReference: customer.aadhaarReference ?? null,
    aadhaar: options.aadhaar ?? null,
    passportNumber: customer.passportNumber ?? null,
    gstin: customer.gstin ?? null,
    contact: mapContact(contact),
    additionalContacts: (customer.additionalContacts ?? []).map((c) =>
      mapContact(c),
    ),
    address: {
      addressLine1: address.addressLine1 ?? null,
      addressLine2: address.addressLine2 ?? null,
      city: address.city ?? null,
      state: address.state ?? null,
      pincode: address.pincode ?? null,
      country: address.country ?? null,
    },
    bankDetails: {
      accountHolderName: bank.accountHolderName ?? null,
      bankName: bank.bankName ?? null,
      accountNumber: bank.accountNumber ?? null,
      ifsc: bank.ifsc ?? null,
      branch: bank.branch ?? null,
    },
    nominee: {
      fullName: nominee.fullName ?? null,
      relationship: nominee.relationship ?? null,
      phone: nominee.phone ?? null,
      address: nominee.address ?? null,
    },
    communicationPreferences: {
      email: prefs.email ?? true,
      sms: prefs.sms ?? true,
      whatsapp: prefs.whatsapp ?? false,
      postal: prefs.postal ?? false,
    },
    occupation: customer.occupation ?? null,
    fundingType: customer.fundingType,
    loanBank: customer.loanBank ?? null,
    sourceLeadId: customer.sourceLeadId ? String(customer.sourceLeadId) : null,
    kycStatus: customer.kycStatus,
    kycVerifiedBy: customer.kycVerifiedBy
      ? String(customer.kycVerifiedBy)
      : null,
    kycVerifiedAt: customer.kycVerifiedAt ?? null,
    kycNotes: customer.kycNotes ?? null,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
