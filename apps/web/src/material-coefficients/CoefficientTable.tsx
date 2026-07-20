import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { Alert, Box, Button, Stack } from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { formatDate } from '@/material-coefficients/formatDate';
import { boqUnitLabel } from './labels';
import { MaterialCoefficientStatusChip } from './MaterialCoefficientStatusChip';
import { OverrideMarker } from './OverrideMarker';
import type { MaterialCoefficientCapabilities } from './roleAccess';
import type { PublicMaterialCoefficient } from './types';
import {
  resolveMaterialCoefficientActions,
  type MaterialCoefficientActionId,
} from './workflowActions';

type Props = {
  rows: readonly PublicMaterialCoefficient[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: MaterialCoefficientCapabilities;
  onEdit?: (row: PublicMaterialCoefficient) => void;
  onSubmit?: (row: PublicMaterialCoefficient) => void;
  onApprove?: (row: PublicMaterialCoefficient) => void;
  onReject?: (row: PublicMaterialCoefficient) => void;
  onCreateVersion?: (row: PublicMaterialCoefficient) => void;
};

const ACTION_LABELS: Record<MaterialCoefficientActionId, string> = {
  edit: 'Edit',
  submit: 'Submit',
  approve: 'Approve',
  reject: 'Reject',
  createVersion: 'New version',
};

export function CoefficientTable({
  rows,
  loading,
  error,
  onRetry,
  filterSlot,
  toolbarActions,
  caps,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onCreateVersion,
}: Props) {
  const columns: GridColDef<PublicMaterialCoefficient>[] = [
    { field: 'standardNumber', headerName: 'Standard', width: 150 },
    { field: 'version', headerName: 'Ver', width: 70, type: 'number' },
    {
      field: 'scope',
      headerName: 'Scope',
      width: 140,
      sortable: false,
      renderCell: (params) => <OverrideMarker row={params.row} />,
    },
    {
      field: 'workType',
      headerName: 'Work / BOQ',
      flex: 1,
      minWidth: 160,
      valueGetter: (_v, row) => row.workType ?? row.boqItemId ?? '—',
    },
    {
      field: 'materialName',
      headerName: 'Material',
      width: 160,
      valueGetter: (_v, row) =>
        row.materialName
          ? `${row.materialCode ?? ''} ${row.materialName}`.trim()
          : row.materialId,
    },
    {
      field: 'outputUnit',
      headerName: 'Unit',
      width: 110,
      valueGetter: (_v, row) => boqUnitLabel(row.outputUnit),
    },
    { field: 'quantityPerUnit', headerName: 'Std qty', width: 90, type: 'number' },
    { field: 'wastagePercentage', headerName: 'Wastage %', width: 100, type: 'number' },
    {
      field: 'effectiveQuantityPerUnit',
      headerName: 'Eff. qty',
      width: 90,
      type: 'number',
    },
    {
      field: 'effectiveDate',
      headerName: 'Effective',
      width: 120,
      valueGetter: (_v, row) => formatDate(row.effectiveDate),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      renderCell: (params) => (
        <MaterialCoefficientStatusChip status={params.row.status} />
      ),
    },
  ];

  const handlers: Record<
    MaterialCoefficientActionId,
    ((row: PublicMaterialCoefficient) => void) | undefined
  > = {
    edit: onEdit,
    submit: onSubmit,
    approve: onApprove,
    reject: onReject,
    createVersion: onCreateVersion,
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        {filterSlot}
        {toolbarActions}
      </Stack>

      {error ? (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {error instanceof Error ? error.message : 'Failed to load standards'}
        </Alert>
      ) : null}

      <DataTable
        title="Consumption standards"
        rows={[...rows]}
        columns={columns}
        loading={loading}
        height={520}
        getRowId={(row) => row.id}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {rows.map((row) => {
          const actions = resolveMaterialCoefficientActions(row, caps);
          return actions.map((actionId) => {
            const handler = handlers[actionId];
            if (!handler) return null;
            return (
              <Button
                key={`${row.id}-${actionId}`}
                size="small"
                variant="outlined"
                color={actionId === 'reject' ? 'error' : 'primary'}
                onClick={() => handler(row)}
              >
                {ACTION_LABELS[actionId]} · {row.standardNumber}
              </Button>
            );
          });
        })}
      </Box>
    </Stack>
  );
}
