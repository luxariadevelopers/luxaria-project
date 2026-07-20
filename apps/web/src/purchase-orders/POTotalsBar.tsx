import { Stack, Typography } from '@mui/material';
import { formatInr } from '@/format';
import type { PoTotalsPreview } from './totals';

type Props = {
  totals: PoTotalsPreview;
  issues?: string[];
};

/**
 * Live PO totals preview (subtotal, taxes, freight, discount, grand total).
 */
export function POTotalsBar({ totals, issues = [] }: Props) {
  return (
    <Stack spacing={0.5} data-testid="po-totals-bar">
      <Typography variant="body2">
        Subtotal: <strong>{formatInr(totals.subtotal)}</strong>
        {' · '}
        Tax: <strong>{formatInr(totals.taxes)}</strong>
        {' · '}
        Freight: <strong>{formatInr(totals.freight)}</strong>
        {' · '}
        Discount: <strong>{formatInr(totals.discount)}</strong>
      </Typography>
      <Typography variant="subtitle1">
        Total: <strong>{formatInr(totals.total)}</strong>
      </Typography>
      {issues.length > 0 ? (
        <Typography variant="caption" color="error">
          {issues[0]}
        </Typography>
      ) : (
        <Typography variant="caption" color="success.main">
          Totals ready
        </Typography>
      )}
    </Stack>
  );
}
