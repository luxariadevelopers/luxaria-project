import { Paper, Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';

type Props = {
  itemsSubtotal: number;
  freight: number;
  taxes: number;
  discount: number;
  grandTotal: number;
};

export function QuotationTotalsSummary({
  itemsSubtotal,
  freight,
  taxes,
  discount,
  grandTotal,
}: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="quotation-totals-summary"
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Totals
      </Typography>
      <Stack spacing={0.5}>
        <Row label="Items subtotal" value={itemsSubtotal} />
        <Row label="Freight" value={freight} />
        <Row label="Header taxes" value={taxes} />
        <Row label="Header discount" value={discount} />
        <Stack
          direction="row"
          sx={{ pt: 0.5, justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle1">Grand total</Typography>
          <Typography variant="subtitle1">{formatInr(grandTotal)}</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between' }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {formatInr(value)}
      </Typography>
    </Stack>
  );
}
