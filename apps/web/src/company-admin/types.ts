/**
 * Public shapes returned by `apps/backend/src/modules/company`.
 * Keep this module aligned with the Company mapper and DTOs; it intentionally
 * does not model unsupported list, create, or lifecycle-action endpoints.
 */

export const CompanyStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const CompanyAddressType = {
  Registered: 'registered',
  Corporate: 'corporate',
} as const;

export type CompanyAddressType = (typeof CompanyAddressType)[keyof typeof CompanyAddressType];

export const CompanyCapitalType = {
  Authorised: 'authorised',
  PaidUp: 'paid_up',
} as const;

export type CompanyCapitalType = (typeof CompanyCapitalType)[keyof typeof CompanyCapitalType];

export type CompanyAddress = {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type PublicCompany = {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName: string;
  cin: string | null;
  pan: string | null;
  tan: string | null;
  gstin: string | null;
  registeredAddress: CompanyAddress;
  corporateAddress: CompanyAddress;
  email: string | null;
  phone: string | null;
  website: string | null;
  authorisedShareCapital: number;
  paidUpShareCapital: number;
  financialYearStartMonth: number;
  logo: string | null;
  status: CompanyStatus;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicAddressHistory = {
  id: string;
  companyId: string;
  addressType: CompanyAddressType;
  address: CompanyAddress;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeReason: string | null;
  createdAt?: string;
};

export type PublicCapitalHistory = {
  id: string;
  companyId: string;
  capitalType: CompanyCapitalType;
  previousAmount: number;
  newAmount: number;
  effectiveFrom: string;
  changeReason: string | null;
  reference: string | null;
  createdAt?: string;
};

export type CompanyPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type PaginatedCompanyHistory<T> = {
  items: T[];
  meta: CompanyPaginationMeta;
};

export type UpdateCompanyInput = {
  tradeName?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  financialYearStartMonth?: number;
  registeredAddress?: CompanyAddress;
  corporateAddress?: CompanyAddress;
  addressChangeReason?: string | null;
};

export type UpdateStatutoryInput = {
  cin?: string | null;
  pan?: string | null;
  tan?: string | null;
  gstin?: string | null;
  legalName?: string;
};

export type UpdateCapitalInput = {
  capitalType: CompanyCapitalType;
  newAmount: number;
  effectiveFrom?: string;
  changeReason?: string | null;
  reference?: string | null;
};

export type ListAddressHistoryQuery = {
  page?: number;
  limit?: number;
  addressType?: CompanyAddressType;
};

export type ListCapitalHistoryQuery = {
  page?: number;
  limit?: number;
  capitalType?: CompanyCapitalType;
};
