import type { Types } from 'mongoose';
import type { AddressEmbed } from './schemas/address.embed';
import type { CompanyAddressType } from './schemas/company-address-history.schema';
import type { CompanyCapitalType } from './schemas/company-capital-history.schema';
import type { CompanyStatus } from './schemas/company.schema';

export type PublicCompany = {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName: string;
  cin: string | null;
  pan: string | null;
  tan: string | null;
  gstin: string | null;
  registeredAddress: AddressEmbed;
  corporateAddress: AddressEmbed;
  email: string | null;
  phone: string | null;
  website: string | null;
  authorisedShareCapital: number;
  paidUpShareCapital: number;
  financialYearStartMonth: number;
  logo: string | null;
  status: CompanyStatus;
  isPrimary: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type CompanyLike = {
  _id: Types.ObjectId | string;
  companyCode: string;
  legalName: string;
  tradeName: string;
  cin?: string | null;
  pan?: string | null;
  tan?: string | null;
  gstin?: string | null;
  registeredAddress: AddressEmbed;
  corporateAddress: AddressEmbed;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  authorisedShareCapital: number;
  paidUpShareCapital: number;
  financialYearStartMonth: number;
  logo?: string | null;
  status: CompanyStatus;
  isPrimary?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPublicCompany(company: CompanyLike): PublicCompany {
  return {
    id: String(company._id),
    companyCode: company.companyCode,
    legalName: company.legalName,
    tradeName: company.tradeName,
    cin: company.cin ?? null,
    pan: company.pan ?? null,
    tan: company.tan ?? null,
    gstin: company.gstin ?? null,
    registeredAddress: company.registeredAddress,
    corporateAddress: company.corporateAddress,
    email: company.email ?? null,
    phone: company.phone ?? null,
    website: company.website ?? null,
    authorisedShareCapital: company.authorisedShareCapital,
    paidUpShareCapital: company.paidUpShareCapital,
    financialYearStartMonth: company.financialYearStartMonth,
    logo: company.logo ?? null,
    status: company.status,
    isPrimary: Boolean(company.isPrimary),
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export type PublicAddressHistory = {
  id: string;
  companyId: string;
  addressType: CompanyAddressType;
  address: AddressEmbed;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  changeReason: string | null;
  createdAt?: Date;
};

export type PublicCapitalHistory = {
  id: string;
  companyId: string;
  capitalType: CompanyCapitalType;
  previousAmount: number;
  newAmount: number;
  effectiveFrom: Date;
  changeReason: string | null;
  reference: string | null;
  createdAt?: Date;
};
