import { Alert, Stack, Typography } from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatInr } from '@/format';
import { buildVendorPayableSummary } from './payableSummary';
import type {
  PublicVendorInvoiceRow,
  PublicVendorPaymentRow,
  VendorLedgerPlaceholder,
} from './types';

type Props = {
  canView: boolean;
  invoices: readonly PublicVendorInvoiceRow[];
  payments: readonly PublicVendorPaymentRow[];
  ledger: VendorLedgerPlaceholder | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

/** Payable summary — finance tab (`payment.view` + invoice/payment lists). */
export function VendorPayableSummary({
  canView,
  invoices,
  payments,
  ledger,
  loading,
  error,
  onRetry,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Payable summary unavailable"
        message="You need payment.view to open the vendor payable summary."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading payable summary…
      </Typography>
    );
  }

  const summary = buildVendorPayableSummary({ invoices, payments, ledger });

  if (
    summary.invoiceCount === 0 &&
    summary.paymentCount === 0 &&
    summary.ledgerClosingBalance == null
  ) {
    return (
      <EmptyState
        title="No payable activity"
        description="Invoices, payments, and ledger balances for this vendor will appear here."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-payable-summary">
      {ledger?.note ? (
        <Alert severity="info" variant="outlined">
          {ledger.note}
        </Alert>
      ) : null}
      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Field
          label="Open payable (from invoices)"
          value={formatInr(summary.openPayable)}
        />
        <Field
          label="Paid on invoices"
          value={formatInr(summary.paidTotal)}
        />
        <Field
          label="Payments total"
          value={formatInr(summary.paymentAmountTotal)}
        />
        <Field
          label="Invoice / payment rows"
          value={`${summary.invoiceCount} / ${summary.paymentCount}`}
        />
        <Field
          label="Ledger closing balance"
          value={
            summary.ledgerClosingBalance != null
              ? formatInr(summary.ledgerClosingBalance)
              : '—'
          }
        />
      </Stack>
    </Stack>
  );
}
