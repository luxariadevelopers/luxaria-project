import { Alert, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@/format';
import { FORECAST_ASSUMPTIONS } from './types';

type Props = {
  /** Latest `evaluatedAt` from alert rows (ISO). */
  dataTimestamp: string | null | undefined;
  lookbackDays?: number | null;
  stockoutAlertDays?: number;
};

/**
 * Surfaces data freshness + Nest calculation assumptions
 * (lookback consumption, stock-out horizon, recommended qty gap to max/reorder).
 */
export function ForecastAssumptionsBanner({
  dataTimestamp,
  lookbackDays,
  stockoutAlertDays = FORECAST_ASSUMPTIONS.defaultStockoutAlertDays,
}: Props) {
  const lookback =
    lookbackDays && lookbackDays > 0
      ? lookbackDays
      : FORECAST_ASSUMPTIONS.defaultLookbackDays;

  return (
    <Alert
      severity="info"
      variant="outlined"
      data-testid="forecast-assumptions-banner"
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">
          Forecast data &amp; assumptions
        </Typography>
        <Typography variant="body2">
          Data as of:{' '}
          {dataTimestamp
            ? formatDateTime(dataTimestamp)
            : 'No evaluation timestamp yet — run evaluate or wait for the daily job.'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Average daily consumption = net consumption over the last {lookback}{' '}
          days ÷ lookback. Estimated stock-out uses (available + pending PO) ÷
          avg daily. Stock-out alert fires within {stockoutAlertDays} days.
          Recommended purchase quantity fills the gap to maximum stock (or
          reorder level when max is unset). Slow-moving default:{' '}
          {FORECAST_ASSUMPTIONS.defaultSlowMovingDays} days.
        </Typography>
      </Stack>
    </Alert>
  );
}
