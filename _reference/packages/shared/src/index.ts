export const ROLES = [
  'ADMIN',
  'DIRECTOR',
  'INVESTOR',
  'FINANCE',
  'PURCHASE',
  'MANAGER',
  'SITE_ENGINEER',
] as const;

export type Role = (typeof ROLES)[number];

export const CONTRIBUTION_MODES = ['cash', 'bank'] as const;
export type ContributionMode = (typeof CONTRIBUTION_MODES)[number];

export const ACCOUNT_TYPES = [
  'BANK',
  'CASH',
  'PETTY_CASH',
  'GST_INPUT',
  'GST_OUTPUT',
  'GST_PAYABLE',
  'OTHER',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const PROJECT_STAGES = [
  'LAND',
  'FOUNDATION',
  'STRUCTURE',
  'FINISHING',
  'HANDOVER',
  'COMPLETED',
] as const;
export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const PAYMENT_TERMS = ['AGAINST_BILL', 'WEEKLY', 'MONTHLY'] as const;
export type PaymentTerms = (typeof PAYMENT_TERMS)[number];

export const BILL_STATUS = ['UNCLEARED', 'PARTIAL', 'CLEARED'] as const;
export type BillStatus = (typeof BILL_STATUS)[number];

/** Store money as integer paise (₹1 = 100) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(fromPaise(paise));
}

export function gstNetPayable(inputPaise: number, outputPaise: number, paidPaise: number): number {
  return outputPaise - inputPaise - paidPaise;
}

export const COMPANY_DEFAULTS = {
  name: 'Luxaria Developers Pvt Limited',
  shareCapitalPaise: toPaise(1_00_00_000),
  directorEquityPercent: 25,
  directorCount: 4,
} as const;
