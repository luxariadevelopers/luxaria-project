import { Stack, Typography } from '@mui/material';
import { SummaryCards } from '@/components/entity-detail';
import { formatQuantity } from '@/format';
import {
  unitFacingLabel,
  unitSubtitle,
  unitTypeLabel,
} from './labels';
import type { PublicUnit } from './types';
import { UnitStatusChip } from './UnitStatusChip';

type Props = {
  unit: PublicUnit;
};

export function UnitSummary({ unit }: Props) {
  return (
    <Stack spacing={2} data-testid="unit-summary">
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">
          {unit.block}-{unit.unitNumber}
        </Typography>
        <UnitStatusChip status={unit.status} />
      </Stack>
      <Typography color="text.secondary">{unitSubtitle(unit)}</Typography>
      <SummaryCards
        fields={[
          { id: 'type', label: 'Type', value: unitTypeLabel(unit.unitType) },
          { id: 'block', label: 'Block', value: unit.block },
          { id: 'floor', label: 'Floor', value: unit.floor },
          {
            id: 'carpet',
            label: 'Carpet area',
            value: formatQuantity(unit.carpetArea),
          },
          {
            id: 'builtup',
            label: 'Built-up area',
            value: formatQuantity(unit.builtUpArea),
          },
          { id: 'uds', label: 'UDS', value: formatQuantity(unit.uds) },
          {
            id: 'facing',
            label: 'Facing',
            value: unitFacingLabel(unit.facing),
          },
          {
            id: 'parking',
            label: 'Parking',
            value: unit.parking ?? '—',
          },
        ]}
      />
    </Stack>
  );
}
