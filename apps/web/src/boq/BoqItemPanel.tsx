import { Button, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatDate, formatInr, formatQuantity } from '@/format';
import { boqItemStatusLabel, boqUnitLabel } from './labels';
import { BOQ_ROUTES } from './routes';
import type { PublicBoqItem } from './types';

type Props = {
  item: PublicBoqItem | null;
};

export function BoqItemPanel({ item }: Props) {
  if (!item) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        data-testid="boq-item-panel-empty"
      >
        Select a BOQ item in the tree to view details.
      </Typography>
    );
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Code', value: item.boqCode },
    { label: 'Description', value: item.description },
    { label: 'Unit', value: boqUnitLabel(item.unit) },
    {
      label: 'Planned quantity',
      value: formatQuantity(item.plannedQuantity),
    },
    { label: 'Material cost', value: formatInr(item.materialCost) },
    { label: 'Labour cost', value: formatInr(item.labourCost) },
    { label: 'Subcontract cost', value: formatInr(item.subcontractCost) },
    { label: 'Other cost', value: formatInr(item.otherCost) },
    { label: 'Planned rate', value: formatInr(item.plannedRate) },
    { label: 'Planned value', value: formatInr(item.plannedValue) },
    {
      label: 'Start',
      value: item.startDate ? formatDate(item.startDate) : '—',
    },
    { label: 'End', value: item.endDate ? formatDate(item.endDate) : '—' },
  ];

  return (
    <Stack
      spacing={1.5}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
      data-testid="boq-item-panel"
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        useFlexGap
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {item.boqCode}
        </Typography>
        <Chip size="small" label={boqItemStatusLabel(item.status)} />
        <Button
          size="small"
          component={RouterLink}
          to={BOQ_ROUTES.itemEditor(item.id)}
          variant="outlined"
        >
          Open editor
        </Button>
      </Stack>
      {rows.map((row) => (
        <Stack key={row.label} spacing={0.25}>
          <Typography variant="caption" color="text.secondary">
            {row.label}
          </Typography>
          <Typography variant="body2">{row.value}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}
