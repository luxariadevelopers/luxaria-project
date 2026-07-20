import { useMemo, useState, type ReactNode } from 'react';
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import {
  labelTimelineAction,
  type PublicAuditLogEntry,
} from '@luxaria/shared-types';
import {
  DataTable,
  type DataTableRowAction,
} from '@/components/data-table';
import { formatDateTime } from '@/format';
import { AuditDiffView } from './AuditDiffView';

type Props = {
  rows: PublicAuditLogEntry[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  filterSlot: ReactNode;
};

/**
 * Read-only audit log table. No edit / delete actions.
 */
export function AuditTable({
  rows,
  loading,
  error,
  onRetry,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  filterSlot,
}: Props) {
  const [selected, setSelected] = useState<PublicAuditLogEntry | null>(null);

  const columns: GridColDef<PublicAuditLogEntry>[] = useMemo(
    () => [
      {
        field: 'timestamp',
        headerName: 'When',
        width: 170,
        valueFormatter: (value: string | Date) => formatDateTime(value),
      },
      {
        field: 'action',
        headerName: 'Action',
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            variant="outlined"
            label={labelTimelineAction(String(params.value))}
          />
        ),
      },
      {
        field: 'module',
        headerName: 'Module',
        width: 120,
      },
      {
        field: 'entityType',
        headerName: 'Entity',
        width: 130,
      },
      {
        field: 'entityId',
        headerName: 'Entity id',
        width: 160,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'userId',
        headerName: 'Actor',
        width: 160,
        valueFormatter: (value: string | null) => value ?? '—',
      },
      {
        field: 'requestId',
        headerName: 'Request id',
        flex: 1,
        minWidth: 160,
        valueFormatter: (value: string | null | undefined) => value ?? '—',
      },
      {
        field: 'projectId',
        headerName: 'Project',
        width: 150,
        valueFormatter: (value: string | null) => value ?? '—',
      },
    ],
    [],
  );

  const rowActions: DataTableRowAction<PublicAuditLogEntry>[] = [
    {
      id: 'view',
      label: 'View diff',
      permission: 'audit.view',
      onClick: (row) => setSelected(row),
    },
  ];

  return (
    <>
      <DataTable<PublicAuditLogEntry>
        title="Audit logs"
        rows={rows}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No audit entries"
        emptyDescription="Try widening filters or another date range."
        paginationMode="server"
        sortingMode="client"
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        filterSlot={filterSlot}
        rowActions={rowActions}
        getRowId={(row) => row.id}
        onRowClick={(params) => setSelected(params.row)}
        height={520}
        showColumnVisibility
        preferencesKey="audit-logs-viewer"
        // Explicitly no export/edit — auditors trace only.
        showExport={false}
      />

      <Dialog
        open={selected != null}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          {selected
            ? `${labelTimelineAction(selected.action)} · ${selected.module}`
            : 'Audit entry'}
        </DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>When:</strong> {formatDateTime(selected.timestamp)}
                </Typography>
                <Typography variant="body2">
                  <strong>Actor:</strong> {selected.userId ?? '—'}
                </Typography>
                <Typography variant="body2">
                  <strong>Request id:</strong>{' '}
                  <Typography
                    component="span"
                    variant="body2"
                    sx={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {selected.requestId ?? '—'}
                  </Typography>
                </Typography>
                <Typography variant="body2">
                  <strong>Entity:</strong> {selected.entityType}
                  {selected.entityId ? ` · ${selected.entityId}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Read-only · no edit capability
                </Typography>
              </Stack>
              <AuditDiffView
                beforeData={selected.beforeData}
                afterData={selected.afterData}
              />
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
