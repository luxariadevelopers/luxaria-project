import { Alert, Box, Stack, Typography } from '@mui/material';
import { formatIndianNumber, formatInr } from '@/format';
import type { BoqProjectTotalsResult } from './types';

type Props = {
  totals: BoqProjectTotalsResult['totals'] | null | undefined;
  valid: boolean | null;
  invalidCount?: number;
  loading?: boolean;
};

/**
 * Summary totals strip — Nest `POST …/validate-totals` (or client filter summary).
 */
export function BoqSummaryTotals({
  totals,
  valid,
  invalidCount = 0,
  loading = false,
}: Props) {
  if (loading && !totals) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading totals…
      </Typography>
    );
  }

  if (!totals) return null;

  const fields = [
    { id: 'items', label: 'Items', value: formatIndianNumber(totals.itemCount) },
    {
      id: 'qty',
      label: 'Planned qty',
      value: formatIndianNumber(totals.plannedQuantity),
    },
    {
      id: 'material',
      label: 'Material',
      value: formatInr(totals.materialCost),
    },
    { id: 'labour', label: 'Labour', value: formatInr(totals.labourCost) },
    {
      id: 'sub',
      label: 'Subcontract',
      value: formatInr(totals.subcontractCost),
    },
    { id: 'other', label: 'Other', value: formatInr(totals.otherCost) },
    {
      id: 'value',
      label: 'Planned value',
      value: formatInr(totals.plannedValue),
    },
  ];

  return (
    <Stack spacing={1.5} data-testid="boq-summary-totals">
      {valid === false ? (
        <Alert severity="warning">
          Totals validation found {invalidCount} issue(s). Planned rate must
          equal cost sum; planned value must equal quantity × rate.
        </Alert>
      ) : null}
      {valid === true ? (
        <Alert severity="success">BOQ totals are valid for this version.</Alert>
      ) : null}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr 1fr',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(7, 1fr)',
          },
        }}
      >
        {fields.map((field) => (
          <Box
            key={field.id}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {field.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
