import { Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import { computeApprovedRefund } from './refundMath';

type Props = {
  totalReceived: number;
  cancellationCharge: number;
  deductions: number;
  /** When set, show Nest snapshot instead of live recompute. */
  approvedRefundOverride?: number;
  dense?: boolean;
};

/**
 * Received / charge / deductions → approved refund.
 * Matches Nest `computeApprovedRefund`.
 */
export function RefundBreakdown({
  totalReceived,
  cancellationCharge,
  deductions,
  approvedRefundOverride,
  dense = false,
}: Props) {
  const live = computeApprovedRefund({
    totalReceived,
    cancellationCharge,
    deductions,
  });
  const refund = live.ok
    ? (approvedRefundOverride ?? live.approvedRefund)
    : (approvedRefundOverride ?? 0);

  return (
    <Stack
      spacing={dense ? 0.5 : 1}
      data-testid="refund-breakdown"
      sx={{
        p: dense ? 1 : 1.5,
        border: 1,
        borderColor: live.ok ? 'divider' : 'error.light',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Typography variant="subtitle2">Refund calculation</Typography>
      <Row label="Total received" value={formatInr(totalReceived)} />
      <Row
        label="Cancellation charge"
        value={`− ${formatInr(cancellationCharge)}`}
      />
      <Row label="Deductions" value={`− ${formatInr(deductions)}`} />
      <Row label="Approved refund" value={formatInr(refund)} emphasis />
      {!live.ok ? (
        <Typography variant="caption" color="error">
          {live.message}
        </Typography>
      ) : null}
    </Stack>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between' }}
    >
      <Typography
        variant="body2"
        color={emphasis ? 'text.primary' : 'text.secondary'}
        sx={{ fontWeight: emphasis ? 600 : 400 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: emphasis ? 700 : 500 }}
        data-testid={emphasis ? 'approved-refund-amount' : undefined}
      >
        {value}
      </Typography>
    </Stack>
  );
}
