import { CircularProgress, Stack, Typography } from '@mui/material';
import { materialUnitLabel } from './labels';
import { useAvailableStock } from './useMaterialIssues';

type Props = {
  projectId: string | null | undefined;
  materialId: string | null | undefined;
  storeLocation?: string | null;
  requestedQuantity?: number;
  enabled?: boolean;
};

/**
 * On-hand availability for the selected material + store location
 * (`GET /stock-ledger/balance`, `stock.view`).
 */
export function AvailableStockIndicator({
  projectId,
  materialId,
  storeLocation,
  requestedQuantity,
  enabled = true,
}: Props) {
  const stock = useAvailableStock({
    projectId,
    materialId,
    location: storeLocation ?? '',
    enabled: enabled && Boolean(projectId) && Boolean(materialId),
  });

  if (!materialId) {
    return (
      <Typography variant="caption" color="text.secondary">
        Select a material to see available stock
      </Typography>
    );
  }

  if (stock.isLoading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={14} />
        <Typography variant="caption">Loading available stock…</Typography>
      </Stack>
    );
  }

  if (stock.error) {
    return (
      <Typography variant="caption" color="error" data-testid="stock-error">
        Could not load available stock
      </Typography>
    );
  }

  const available = stock.data?.quantityInBaseUnit ?? 0;
  const unit = stock.data?.baseUnit
    ? materialUnitLabel(stock.data.baseUnit)
    : '';
  const over =
    requestedQuantity != null &&
    Number.isFinite(requestedQuantity) &&
    requestedQuantity - available > 1e-9;

  return (
    <Typography
      variant="caption"
      color={over ? 'error' : 'text.secondary'}
      data-testid="available-stock-indicator"
      fontWeight={over ? 600 : 400}
    >
      Available: {available} {unit}
      {over ? ' — issue exceeds available stock' : ''}
    </Typography>
  );
}
