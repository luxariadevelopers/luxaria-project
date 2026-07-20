import { Alert, Chip, Stack, Typography } from '@mui/material';
import { MatchingStatusChip } from './MatchingStatusChip';
import type { PublicVendorInvoice } from './types';
import { VendorInvoiceMatchingStatus, VendorInvoiceVarianceSeverity } from './types';

type Props = {
  invoice: PublicVendorInvoice;
};

/**
 * Summarises three-way match outcome and variance severity counts.
 * Tolerance % is server-configured; client shows resulting statuses only.
 */
export function ToleranceIndicators({ invoice }: Props) {
  const variances = invoice.variances ?? [];
  const exceptions = variances.filter(
    (v) => v.severity === VendorInvoiceVarianceSeverity.Exception,
  ).length;
  const warnings = variances.filter(
    (v) => v.severity === VendorInvoiceVarianceSeverity.Warning,
  ).length;
  const infos = variances.filter(
    (v) => v.severity === VendorInvoiceVarianceSeverity.Info,
  ).length;

  let tone: 'success' | 'info' | 'warning' | 'error' = 'info';
  if (
    invoice.matchingStatus === VendorInvoiceMatchingStatus.Matched ||
    invoice.matchingStatus === VendorInvoiceMatchingStatus.MatchedWithTolerance
  ) {
    tone = 'success';
  } else if (
    invoice.matchingStatus === VendorInvoiceMatchingStatus.Exception ||
    invoice.matchingStatus === VendorInvoiceMatchingStatus.Rejected
  ) {
    tone = 'error';
  } else if (warnings > 0) {
    tone = 'warning';
  }

  return (
    <Stack spacing={1.5} data-testid="tolerance-indicators">
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="subtitle2">Matching status</Typography>
        <MatchingStatusChip status={invoice.matchingStatus} />
        {invoice.exceptionApproved ? (
          <Chip size="small" color="success" label="Exception approved" />
        ) : null}
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip size="small" label={`${variances.length} variance(s)`} />
        <Chip
          size="small"
          color={exceptions > 0 ? 'error' : 'default'}
          label={`${exceptions} exception`}
        />
        <Chip
          size="small"
          color={warnings > 0 ? 'warning' : 'default'}
          label={`${warnings} within tolerance`}
        />
        <Chip size="small" label={`${infos} info`} />
      </Stack>

      {invoice.matchingStatus ===
      VendorInvoiceMatchingStatus.MatchedWithTolerance ? (
        <Alert severity="info" variant="outlined">
          Variances are within configured server tolerances.
        </Alert>
      ) : null}

      {invoice.matchingStatus === VendorInvoiceMatchingStatus.Exception &&
      !invoice.exceptionApproved ? (
        <Alert severity={tone}>
          Out-of-tolerance variances require exception approval
          (vendor_invoice.approve + comment) before payment.
        </Alert>
      ) : null}

      {invoice.matchingRejectionReason ? (
        <Alert severity="error">
          Matching rejected: {invoice.matchingRejectionReason}
        </Alert>
      ) : null}
    </Stack>
  );
}
