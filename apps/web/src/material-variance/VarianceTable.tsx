import {
  Box,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/DataTable';
import { ALERT_LABELS, formatMoney, formatPct, formatQty, lineLabel } from './labels';
import type { MaterialConsumptionLine } from './types';

type VarianceTableProps = {
  lines: MaterialConsumptionLine[];
  loading?: boolean;
  onSelectLine?: (lineId: string) => void;
  explanationDrafts?: Readonly<Record<string, string>>;
};

export function VarianceTable({
  lines,
  loading,
  onSelectLine,
  explanationDrafts = {},
}: VarianceTableProps) {
  const rows = lines.map((line) => ({
    ...line,
    label: lineLabel(line),
    explanationText:
      explanationDrafts[line.id]?.trim() ||
      line.explanation?.trim() ||
      '',
  }));

  const columns: GridColDef<(typeof rows)[number]>[] = [
    {
      field: 'label',
      headerName: 'BOQ · Material',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'expectedConsumption',
      headerName: 'Expected',
      width: 110,
      valueFormatter: (value: number) => formatQty(value),
    },
    {
      field: 'netActualConsumption',
      headerName: 'Actual (net)',
      width: 120,
      valueFormatter: (value: number) => formatQty(value),
    },
    {
      field: 'varianceQuantity',
      headerName: 'Variance qty',
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          color={params.value > 0 ? 'error.main' : params.value < 0 ? 'warning.main' : 'text.primary'}
        >
          {formatQty(params.value as number)}
        </Typography>
      ),
    },
    {
      field: 'variancePercentage',
      headerName: 'Variance %',
      width: 100,
      valueFormatter: (value: number) => formatPct(value),
    },
    {
      field: 'varianceValue',
      headerName: 'Value',
      width: 120,
      valueFormatter: (value: number) => formatMoney(value),
    },
    {
      field: 'alerts',
      headerName: 'Alerts',
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {(params.value as MaterialConsumptionLine['alerts']).map((alert) => (
            <Tooltip key={alert} title={ALERT_LABELS[alert] ?? alert}>
              <Chip
                size="small"
                label={ALERT_LABELS[alert] ?? alert}
                color={
                  alert === 'above_allowed_variance' ||
                  alert === 'negative_consumption'
                    ? 'error'
                    : 'warning'
                }
                variant="outlined"
              />
            </Tooltip>
          ))}
        </Stack>
      ),
    },
    {
      field: 'requiresApproval',
      headerName: 'Needs approval',
      width: 120,
      renderCell: (params) =>
        params.value ? (
          <Chip size="small" label="Yes" color="warning" />
        ) : (
          <Chip size="small" label="No" variant="outlined" />
        ),
    },
    {
      field: 'explanationText',
      headerName: 'Explanation',
      flex: 1,
      minWidth: 160,
      renderCell: (params) =>
        params.value ? (
          <Typography variant="body2" noWrap title={String(params.value)}>
            {String(params.value)}
          </Typography>
        ) : params.row.requiresApproval ? (
          <Typography variant="body2" color="error">
            Required
          </Typography>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <Box data-testid="variance-table">
      <DataTable
        title="Theoretical vs actual consumption"
        rows={rows}
        columns={columns}
        loading={loading}
        height={420}
        getRowId={(row) => row.id}
        onRowClick={
          onSelectLine
            ? (params) => onSelectLine(String(params.id))
            : undefined
        }
      />
    </Box>
  );
}
