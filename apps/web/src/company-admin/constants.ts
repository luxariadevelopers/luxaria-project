import { CompanyAddressType, CompanyCapitalType, type CompanyStatus } from './types';

export const COMPANY_PERMISSIONS = {
  view: 'company.view',
  update: 'company.update',
  uploadLogo: 'company.upload_logo',
} as const;

export const FINANCIAL_YEAR_MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export const ADDRESS_TYPE_LABELS: Record<CompanyAddressType, string> = {
  [CompanyAddressType.Registered]: 'Registered',
  [CompanyAddressType.Corporate]: 'Corporate',
};

export const CAPITAL_TYPE_LABELS: Record<CompanyCapitalType, string> = {
  [CompanyCapitalType.Authorised]: 'Authorised share capital',
  [CompanyCapitalType.PaidUp]: 'Paid-up share capital',
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const COMPANY_LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const COMPANY_LOGO_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif';

export function financialYearMonthLabel(month: number): string {
  return (
    FINANCIAL_YEAR_MONTH_OPTIONS.find((option) => option.value === month)?.label ?? `Month ${month}`
  );
}
