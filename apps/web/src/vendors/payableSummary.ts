import type {
  PublicVendorInvoiceRow,
  PublicVendorPaymentRow,
  VendorLedgerPlaceholder,
} from './types';

export type VendorPayableSummary = {
  invoiceCount: number;
  openPayable: number;
  paidTotal: number;
  paymentCount: number;
  paymentAmountTotal: number;
  ledgerClosingBalance: number | null;
  currency: string;
};

/**
 * Compose a payable snapshot from existing list + ledger placeholder APIs.
 * Does not invent balances — sums Nest `remainingPayable` / payment amounts.
 */
export function buildVendorPayableSummary(args: {
  invoices: readonly PublicVendorInvoiceRow[];
  payments: readonly PublicVendorPaymentRow[];
  ledger: VendorLedgerPlaceholder | null | undefined;
}): VendorPayableSummary {
  const openPayable = args.invoices.reduce(
    (sum, row) => sum + (Number.isFinite(row.remainingPayable) ? row.remainingPayable : 0),
    0,
  );
  const paidTotal = args.invoices.reduce(
    (sum, row) => sum + (Number.isFinite(row.paidAmount) ? row.paidAmount : 0),
    0,
  );
  const paymentAmountTotal = args.payments.reduce(
    (sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0),
    0,
  );

  return {
    invoiceCount: args.invoices.length,
    openPayable,
    paidTotal,
    paymentCount: args.payments.length,
    paymentAmountTotal,
    ledgerClosingBalance:
      args.ledger && Number.isFinite(args.ledger.closingBalance)
        ? args.ledger.closingBalance
        : null,
    currency: args.ledger?.currency ?? 'INR',
  };
}
