import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import type { GridColDef } from '@mui/x-data-grid';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataTable } from '@/components/DataTable';
import { EmptyState, RetryPanel } from '@/components/errors';
import { formatInr, formatQuantity } from '@/format';
import { unitTypeLabel } from './labels';
import { unitDetailPath } from './paths';
import type { UnitCapabilities } from './roleAccess';
import type { PublicUnit } from './types';
import { UnitStatusChip } from './UnitStatusChip';

type Props = {
  rows: readonly PublicUnit[];
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
  caps: UnitCapabilities;
  onEdit?: (row: PublicUnit) => void;
  onChangeStatus?: (row: PublicUnit) => void;
};

export function UnitTable({
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
  onChangeStatus,
}: Props) {
  const columns: GridColDef<PublicUnit>[] = [
    {
      field: 'unitNumber',
      headerName: 'Unit',
      width: 120,
      renderCell: (params) => (
        <Link
          component={RouterLink}
          to={unitDetailPath(params.row.id)}
          underline="hover"
        >
          {params.row.block}-{params.row.unitNumber}
        </Link>
      ),
    },
    {
      field: 'block',
      headerName: 'Block',
      width: 90,
    },
    {
      field: 'floor',
      headerName: 'Floor',
      width: 90,
    },
    {
      field: 'unitType',
      headerName: 'Type',
      width: 110,
      valueGetter: (_v, row) => unitTypeLabel(row.unitType),
    },
    {
      field: 'carpetArea',
      headerName: 'Carpet',
      width: 100,
      valueGetter: (_v, row) => formatQuantity(row.carpetArea),
    },
    {
      field: 'builtUpArea',
      headerName: 'Built-up',
      width: 100,
      valueGetter: (_v, row) => formatQuantity(row.builtUpArea),
    },
    {
      field: 'basePrice',
      headerName: 'Base price',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.basePrice),
    },
    {
      field: 'totalPrice',
      headerName: 'Total',
      width: 130,
      valueGetter: (_v, row) => formatInr(row.totalPrice),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: (params) => <UnitStatusChip status={params.row.status} />,
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
            {onChangeStatus ? (
              <Button size="small" onClick={() => onChangeStatus(params.row)}>
                Status
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
    <Stack spacing={1.5} data-testid="unit-table">
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
          placeholder="Unit / block / floor"
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
          title="No units"
          description="Create a unit for this project, or adjust block / floor / status filters."
        />
      ) : (
        <>
          <DataTable
            title="Units"
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
              <InputLabel id="unit-page-size">Page size</InputLabel>
              <Select
                labelId="unit-page-size"
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
