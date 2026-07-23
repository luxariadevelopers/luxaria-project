import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  TablePagination,
  Typography,
} from '@mui/material';
import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { RowActionsMenu } from './RowActionsMenu';
import {
  getMobileCellText,
  getMobileColumnLabel,
  type ResolvedMobileCardFields,
} from './mobileCard';
import type { DataTableRowAction } from './types';

type Props<R extends GridValidRowModel> = {
  rows: readonly R[];
  columns: readonly GridColDef<R>[];
  fields: ResolvedMobileCardFields;
  loading?: boolean;
  getRowId?: (row: R) => string | number;
  onRowClick?: (row: R) => void;
  rowActions?:
    | readonly DataTableRowAction<R>[]
    | ((row: R) => readonly DataTableRowAction<R>[]);
  page: number;
  pageSize: number;
  rowCount: number;
  pageSizeOptions: readonly number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

function resolveRowId<R extends GridValidRowModel>(
  row: R,
  getRowId?: (row: R) => string | number,
): string | number {
  if (getRowId) return getRowId(row);
  const id = (row as { id?: string | number }).id;
  return id ?? String(row);
}

/**
 * Narrow-viewport list rows for DataTable (primary + 2 meta + status + actions).
 */
export function DataTableMobileList<R extends GridValidRowModel>({
  rows,
  columns,
  fields,
  loading = false,
  getRowId,
  onRowClick,
  rowActions,
  page,
  pageSize,
  rowCount,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: Props<R>) {
  return (
    <Box data-testid="data-table-mobile-list">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack spacing={1}>
          {rows.map((row) => {
            const id = resolveRowId(row, getRowId);
            const primary = getMobileCellText(
              columns,
              fields.primaryField,
              row,
            );
            const statusText = fields.statusField
              ? getMobileCellText(columns, fields.statusField, row)
              : undefined;
            const actions =
              typeof rowActions === 'function'
                ? rowActions(row)
                : (rowActions ?? []);
            const clickable = Boolean(onRowClick);

            return (
              <Box
                key={String(id)}
                data-testid="data-table-mobile-row"
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={
                  clickable
                    ? () => {
                        onRowClick?.(row);
                      }
                    : undefined
                }
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick?.(row);
                        }
                      }
                    : undefined
                }
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                  minHeight: 56,
                  cursor: clickable ? 'pointer' : 'default',
                  '&:hover': clickable
                    ? { bgcolor: 'action.hover' }
                    : undefined,
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: 2,
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'flex-start' }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: 'primary.main',
                        wordBreak: 'break-word',
                      }}
                    >
                      {primary}
                    </Typography>
                    {fields.metaFields.length > 0 ? (
                      <Stack spacing={0.25} sx={{ mt: 0.75 }}>
                        {fields.metaFields.map((field) => (
                          <Typography
                            key={field}
                            variant="body2"
                            color="text.secondary"
                            sx={{ wordBreak: 'break-word' }}
                          >
                            <Box
                              component="span"
                              sx={{ color: 'text.disabled', mr: 0.5 }}
                            >
                              {getMobileColumnLabel(columns, field)}:
                            </Box>
                            {getMobileCellText(columns, field, row)}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {statusText && statusText !== '—' ? (
                      <Chip
                        size="small"
                        label={statusText}
                        variant="outlined"
                        sx={{ maxWidth: 120 }}
                      />
                    ) : null}
                    {actions.length > 0 ? (
                      <RowActionsMenu row={row} actions={actions} />
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}

      {onPageChange || onPageSizeChange ? (
        <TablePagination
          component="div"
          count={rowCount}
          page={Math.max(0, page - 1)}
          onPageChange={(_e, nextZeroBased) => {
            onPageChange?.(nextZeroBased + 1);
          }}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            onPageSizeChange?.(Number(e.target.value));
          }}
          rowsPerPageOptions={[...pageSizeOptions]}
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            mt: 1,
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              px: 0,
            },
          }}
        />
      ) : null}
    </Box>
  );
}
