import { Alert, Box, Stack, Typography } from '@mui/material';
import { formatQuantity } from '@/format';
import { materialUnitLabel } from './labels';
import type { PublicMaterial, PublicStockBalance } from './types';

type Props = {
  material: PublicMaterial;
  balance: PublicStockBalance | undefined;
  loading?: boolean;
  projectLabel: string;
};

function stockBand(
  qty: number,
  material: PublicMaterial,
): { label: string; tone: 'default' | 'warning' | 'error' | 'success' } {
  if (qty <= 0) return { label: 'Out of stock', tone: 'error' };
  if (material.minimumStock > 0 && qty < material.minimumStock) {
    return { label: 'Below minimum', tone: 'error' };
  }
  if (material.reorderLevel > 0 && qty <= material.reorderLevel) {
    return { label: 'Reorder', tone: 'warning' };
  }
  if (material.maximumStock > 0 && qty > material.maximumStock) {
    return { label: 'Over maximum', tone: 'warning' };
  }
  return { label: 'Within band', tone: 'success' };
}

/**
 * Project on-hand from `GET /stock-ledger/balance` plus master stock thresholds.
 */
export function MaterialStockCards({
  material,
  balance,
  loading,
  projectLabel,
}: Props) {
  if (loading && !balance) {
    return (
      <Typography color="text.secondary" data-testid="material-stock-cards">
        Loading project stock…
      </Typography>
    );
  }

  const qty = balance?.quantityInBaseUnit ?? 0;
  const unit = balance?.baseUnit ?? material.baseUnit;
  const location = balance?.location?.trim()
    ? balance.location
    : 'Default (blank location)';
  const band = stockBand(qty, material);

  const fields = [
    {
      id: 'on-hand',
      label: 'On-hand (base)',
      value: `${formatQuantity(qty)} ${materialUnitLabel(unit)}`,
    },
    {
      id: 'location',
      label: 'Location',
      value: location,
    },
    {
      id: 'minimum',
      label: 'Minimum',
      value: formatQuantity(material.minimumStock),
    },
    {
      id: 'reorder',
      label: 'Reorder level',
      value: formatQuantity(material.reorderLevel),
    },
    {
      id: 'maximum',
      label: 'Maximum',
      value: formatQuantity(material.maximumStock),
    },
    {
      id: 'band',
      label: 'Stock band',
      value: band.label,
    },
  ];

  return (
    <Box data-testid="material-stock-cards">
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, letterSpacing: 1 }}
      >
        Project stock · {projectLabel}
      </Typography>
      {band.tone === 'error' || band.tone === 'warning' ? (
        <Alert
          severity={band.tone === 'error' ? 'error' : 'warning'}
          sx={{ mb: 1.5 }}
        >
          {band.label} for this material in the active project.
        </Alert>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr',
          },
        }}
      >
        {fields.map((field) => (
          <Stack
            key={field.id}
            spacing={0.25}
            sx={{
              p: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography variant="subtitle1">{field.value}</Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
