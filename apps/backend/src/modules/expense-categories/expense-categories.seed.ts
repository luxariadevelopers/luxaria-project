export type ExpenseCategorySeedDef = {
  categoryCode: string;
  name: string;
  parentCode?: string | null;
  requiresBill?: boolean;
  requiresSignature?: boolean;
  requiresPhoto?: boolean;
  approvalLimit?: number | null;
};

/**
 * Standard site / construction expense categories for Luxaria.
 * Codes are stable; seed is idempotent by categoryCode.
 */
export const STANDARD_EXPENSE_CATEGORIES: ExpenseCategorySeedDef[] = [
  { categoryCode: 'LABOUR', name: 'Labour', requiresBill: false, requiresSignature: true },
  { categoryCode: 'MATERIAL', name: 'Material', requiresBill: true },
  { categoryCode: 'TRANSPORT', name: 'Transport', requiresBill: true, requiresPhoto: true },
  { categoryCode: 'FOOD', name: 'Food', requiresBill: true },
  {
    categoryCode: 'SITE_MAINTENANCE',
    name: 'Site Maintenance',
    requiresBill: true,
    requiresPhoto: true,
  },
  { categoryCode: 'TOOLS', name: 'Tools', requiresBill: true },
  { categoryCode: 'ELECTRICITY', name: 'Electricity', requiresBill: true },
  { categoryCode: 'WATER', name: 'Water', requiresBill: true },
  {
    categoryCode: 'APPROVAL_CHARGES',
    name: 'Approval Charges',
    requiresBill: true,
  },
  {
    categoryCode: 'PROFESSIONAL_CHARGES',
    name: 'Professional Charges',
    requiresBill: true,
    requiresSignature: true,
  },
  { categoryCode: 'OFFICE_EXPENSE', name: 'Office Expense', requiresBill: true },
  { categoryCode: 'MISCELLANEOUS', name: 'Miscellaneous', requiresBill: true, requiresPhoto: true },
];
