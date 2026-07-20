import { Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import { computeExpectedTotalAmount, computeNetInvoicePayable } from './totals';

type Props = {
  taxableValue: number;
  gst: number;
  freight: number;
  discount: number;
  tds: number;
  retention: number;
  totalAmount: number;
};

/**
 * Header tax / payable summary for invoice capture (Nest assertHeaderTotals).
 */
export function InvoiceTaxTotals({
  taxableValue,
  gst,
  freight,
  discount,
  tds,
  retention,
  totalAmount,
}: Props) {
  const expected = computeExpectedTotalAmount({
    taxableValue,
    gst,
    freight,
  });
  const netPayable = computeNetInvoicePayable({
    totalAmount,
    tds,
    retention,
  });
  const mismatch = Math.abs(expected - totalAmount) > 0.05;

  return (
    <Stack spacing={0.5} data-testid="invoice-tax-totals">
      <Row label="Taxable value" value={taxableValue} />
      <Row label="GST" value={gst} />
      <Row label="Freight" value={freight} />
      <Row label="Discount (memo)" value={discount} />
      <Row label="Total amount" value={totalAmount} emphasize />
      {mismatch ? (
        <Typography variant="caption" color="error">
          Expected total (taxable + GST + freight): {formatInr(expected)}
        </Typography>
      ) : null}
      <Row label="TDS" value={tds} />
      <Row label="Retention" value={retention} />
      <Row label="Net payable" value={netPayable} emphasize />
    </Stack>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography
        variant="body2"
        color={emphasize ? 'text.primary' : 'text.secondary'}
        fontWeight={emphasize ? 600 : 400}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={emphasize ? 600 : 400}
        data-testid={`invoice-total-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {formatInr(value)}
      </Typography>
    </Stack>
  );
}
