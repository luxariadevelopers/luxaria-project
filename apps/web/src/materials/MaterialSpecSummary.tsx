import { Stack, Typography } from '@mui/material';
import { formatInr, formatPercentage, formatQuantity } from '@/format';
import { materialUnitLabel } from './labels';
import type { PublicMaterial } from './types';
import { isBaseUnitReadOnly } from './validation';

type Props = {
  material: PublicMaterial;
};

export function MaterialSpecSummary({ material }: Props) {
  const locked = isBaseUnitReadOnly(material.baseUnitLocked);

  const rows: { label: string; value: string }[] = [
    { label: 'Specification', value: material.specification?.trim() || '—' },
    { label: 'Brand', value: material.brand?.trim() || '—' },
    {
      label: 'Base unit',
      value: `${materialUnitLabel(material.baseUnit)}${
        locked ? ' (locked after stock transactions)' : ''
      }`,
    },
    {
      label: 'Standard rate',
      value: formatInr(material.standardRate),
    },
    {
      label: 'Standard wastage',
      value: formatPercentage(material.standardWastagePercentage),
    },
    {
      label: 'Stock thresholds',
      value: `min ${formatQuantity(material.minimumStock)} · reorder ${formatQuantity(material.reorderLevel)} · max ${formatQuantity(material.maximumStock)}`,
    },
    { label: 'Ledger account', value: material.ledgerAccountId },
  ];

  return (
    <Stack spacing={1.25} data-testid="material-spec-summary">
      {rows.map((row) => (
        <Stack key={row.label} spacing={0.25}>
          <Typography variant="caption" color="text.secondary">
            {row.label}
          </Typography>
          <Typography variant="body1">{row.value}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
