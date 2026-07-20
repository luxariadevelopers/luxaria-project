import { CompanyStatus } from './schemas/company.schema';

/** ₹1,00,00,000 authorised share capital */
export const LUXARIA_AUTHORISED_SHARE_CAPITAL = 10_000_000;

export const LUXARIA_COMPANY_SEED = {
  companyCode: 'CMP-0001',
  legalName: 'Luxaria Developers Pvt. Ltd.',
  tradeName: 'Luxaria Developers',
  cin: null as string | null,
  pan: null as string | null,
  tan: null as string | null,
  gstin: null as string | null,
  registeredAddress: {
    line1: 'Registered Office',
    line2: null as string | null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  },
  corporateAddress: {
    line1: 'Corporate Office',
    line2: null as string | null,
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    country: 'India',
  },
  email: 'info@luxariadevelopers.com',
  phone: null as string | null,
  website: null as string | null,
  authorisedShareCapital: LUXARIA_AUTHORISED_SHARE_CAPITAL,
  paidUpShareCapital: 0,
  financialYearStartMonth: 4,
  logo: null as string | null,
  status: CompanyStatus.Active,
  isPrimary: true,
};
