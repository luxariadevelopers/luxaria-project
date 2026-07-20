import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { Box, Paper, Typography } from '@mui/material';

export type DataTableProps<R extends GridValidRowModel> = {
  title?: string;
  rows: R[];
  columns: GridColDef<R>[];
  loading?: boolean;
  height?: number | string;
  getRowId?: DataGridProps<R>['getRowId'];
  pageSizeOptions?: number[];
  checkboxSelection?: boolean;
  onRowClick?: DataGridProps<R>['onRowClick'];
};

export function DataTable<R extends GridValidRowModel>({
  title,
  rows,
  columns,
  loading = false,
  height = 480,
  getRowId,
  pageSizeOptions = [10, 25, 50],
  checkboxSelection,
  onRowClick,
}: DataTableProps<R>) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {title ? (
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      ) : null}
      <Box sx={{ height, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          pageSizeOptions={pageSizeOptions}
          initialState={{
            pagination: { paginationModel: { pageSize: pageSizeOptions[0] ?? 10 } },
          }}
          checkboxSelection={checkboxSelection}
          onRowClick={onRowClick}
          disableRowSelectionOnClick
          density="compact"
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'action.hover',
            },
          }}
        />
      </Box>
    </Paper>
  );
}
