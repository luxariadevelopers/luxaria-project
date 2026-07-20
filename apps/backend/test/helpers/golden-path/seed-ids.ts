import { Types } from 'mongoose';

/** Fixed ObjectIds for deterministic golden-path seeds (phase 138). */
export const GOLDEN_PATH_IDS = {
  project: '507f1f77bcf86cd799439011',
  material: '507f1f77bcf86cd799439012',
  vendor: '507f1f77bcf86cd799439013',
  materialExpenseAccount: '507f1f77bcf86cd799439014',
  wipAccount: '507f1f77bcf86cd799439015',
  vendorPayableAccount: '507f1f77bcf86cd799439016',
  bankLedgerAccount: '507f1f77bcf86cd799439017',
  customerAdvanceAccount: '507f1f77bcf86cd799439018',
  pettyCashLedgerAccount: '507f1f77bcf86cd799439019',
  siteExpenseAccount: '507f1f77bcf86cd79943901a',
  unit: '507f1f77bcf86cd79943901b',
  customer: '507f1f77bcf86cd79943901c',
  companyBankAccount: '507f1f77bcf86cd79943901d',
} as const;

export const GOLDEN_PATH_DATES = {
  requiredBy: '2026-08-15',
  orderDate: '2026-07-17',
  deliveryDate: '2026-08-01',
  receivedDate: '2026-07-18',
  invoiceDate: '2026-07-19',
  paymentDate: '2026-07-20',
  expenseDate: '2026-07-21',
  bookingDate: '2026-07-10',
  weekStart: '2026-07-13',
  weekEnd: '2026-07-19',
  demandDue: '2026-08-01',
} as const;

export const GOLDEN_PATH_ADMIN = {
  email: 'golden-path-admin@luxaria.test',
  password: 'GoldenPath138!Admin',
  fullName: 'Golden Path Admin',
  mobile: '9000000138',
} as const;

export function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}
