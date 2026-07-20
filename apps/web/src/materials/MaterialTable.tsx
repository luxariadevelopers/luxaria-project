import type { ReactNode } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { EmptyState, RetryPanel } from '@/components/errors';
import { MaterialStatusChip } from './MaterialStatusChip';
import { UnitDisplay } from './UnitDisplay';
import type { MaterialCapabilities } from './roleAccess';
import type { PublicMaterial } from './types';

type Props = {
  rows: readonly PublicMaterial[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  filterSlot?: ReactNode;
  toolbarActions?: ReactNode;
  caps: MaterialCapabilities;
  onEdit?: (row: PublicMaterial) => void;
  onToggleStatus?: (row: PublicMaterial) => void;
};

export function MaterialTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  filterSlot,
  toolbarActions,
  caps,
  onEdit,
  onToggleStatus,
}: Props) {
  const columns: GridColDef<PublicMaterial>[] = [
    {
      field: 'materialCode',
      headerName: 'Code',
      width: 120,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 130,
    },
    {
      field: 'brand',
      headerName: 'Brand',
      width: 120,
      valueGetter: (_v, row) => row.brand ?? '—',
    },
    {
      field: 'baseUnit',
      headerName: 'Units',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => (
        <UnitDisplay
          baseUnit={params.row.baseUnit}
          alternateUnits={params.row.alternateUnits}
          conversionFactors={params.row.conversionFactors}
          compact
        />
      ),
    },
    {
      field: 'reorderLevel',
      headerName: 'Reorder',
      width: 100,
      valueGetter: (_v, row) => row.reorderLevel,
    },
    {
      field: 'minimumStock',
      headerName: 'Min',
      width: 80,
    },
    {
      field: 'maximumStock',
      headerName: 'Max',
      width: 80,
    },
    {
      field: 'standardRate',
      headerName: 'Std rate',
      width: 100,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <MaterialStatusChip status={params.row.status} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (!caps.canManage) return null;
        return (
          <Stack direction="row" spacing={0.5}>
            {onEdit ? (
              <Button size="small" onClick={() => onEdit(params.row)}>
                Edit
              </Button>
            ) : null}
            {onToggleStatus ? (
              <Button
                size="small"
                color={params.row.status === 'active' ? 'warning' : 'success'}
                onClick={() => onToggleStatus(params.row)}
              >
                {params.row.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            ) : null}
          </Stack>
        );
      },
    },
  ];

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} />;
  }

  return (
    <Stack spacing={1.5} data-testid="material-table">
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          label="Search"
          placeholder="Code, name, brand…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {filterSlot}
          {toolbarActions}
        </Box>
      </Box>

      {!loading && rows.length === 0 ? (
        <EmptyState
          title="No materials"
          description="Create a material master record, or adjust category / status filters."
        />
      ) : (
        <>
          <DataTable
            title="Materials"
            rows={[...rows]}
            columns={columns}
            loading={loading}
            height={520}
            getRowId={(row) => row.id}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {rowCount} total · page {page}
            </Typography>
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              size="small"
              disabled={page * pageSize >= rowCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel id="material-page-size">Page size</InputLabel>
              <Select
                labelId="material-page-size"
                label="Page size"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                {[10, 20, 50].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </>
      )}
    </Stack>
  );
}
