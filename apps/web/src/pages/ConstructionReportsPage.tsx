import { useMemo, useState } from 'react';
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  ExportDialog,
  constructionReportExportDescriptor,
} from '@/export';
import {
  useConstructionReport,
  useConstructionReportCatalogue,
  type ConstructionReportType,
} from '@/reports/construction';

function formatCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Construction reports hub — `/reports/construction`.
 * Nest: GET /construction-reports, GET /construction-reports/:type (+ export).
 */
export function ConstructionReportsPage() {
  const { hasPermission, access } = useAuth();
  const canView = hasPermission('report.view');
  const canExport = hasPermission('report.export');
  const { selectedProjectId } = useProject();

  const [reportType, setReportType] = useState<ConstructionReportType | ''>(
    '',
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exportOpen, setExportOpen] = useState(false);

  const catalogueQuery = useConstructionReportCatalogue(canView);

  const query = useMemo(
    () => ({
      projectId: selectedProjectId ?? undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [selectedProjectId, from, to],
  );

  const reportQuery = useConstructionReport(
    reportType,
    query,
    canView && Boolean(reportType) && runKey > 0,
  );

  const rows = (reportQuery.data?.rows ?? []) as Record<string, unknown>[];

  const columns: GridColDef[] = useMemo(() => {
    const sample = rows[0];
    if (!sample) {
      return [{ field: 'empty', headerName: 'Result', flex: 1 }];
    }
    return Object.keys(sample)
      .filter((key) => key !== 'drillDown')
      .slice(0, 12)
      .map((field) => ({
        field,
        headerName: field,
        flex: 1,
        minWidth: 120,
        valueGetter: (_v: unknown, row: Record<string, unknown>) =>
          formatCell(row[field]),
      }));
  }, [rows]);

  const totalsEntries = Object.entries(reportQuery.data?.totals ?? {});

  const exportDescriptor = useMemo(
    () =>
      constructionReportExportDescriptor({
        reportType: reportType || 'stock-balance',
        title: catalogueQuery.data?.find((r) => r.reportType === reportType)
          ?.title,
        requireProjectId: true,
      }),
    [catalogueQuery.data, reportType],
  );

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Construction reports unavailable"
        message="You need the report.view permission to run construction reports."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header before running construction reports."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Construction management reports (BOQ, stock, labour, DPR, contractors).
        Nest: GET /construction-reports and GET /construction-reports/:type.
      </Typography>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}
      >
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="construction-report-type">Report</InputLabel>
          <Select
            labelId="construction-report-type"
            label="Report"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as ConstructionReportType | '');
              setRunKey(0);
              setPage(1);
            }}
          >
            {(catalogueQuery.data ?? []).map((item) => (
              <MenuItem key={item.reportType} value={item.reportType}>
                {item.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="date"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Button
          variant="contained"
          disabled={!reportType}
          onClick={() => {
            setPage(1);
            setRunKey((k) => k + 1);
          }}
        >
          Run report
        </Button>
        {canExport && reportType ? (
          <Button variant="outlined" onClick={() => setExportOpen(true)}>
            Export
          </Button>
        ) : null}
      </Stack>

      {totalsEntries.length > 0 ? (
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {totalsEntries.map(([key, value]) => (
            <Typography key={key} variant="body2">
              <strong>{key}</strong>: {formatCell(value)}
            </Typography>
          ))}
        </Stack>
      ) : null}

      {runKey === 0 ? (
        <EmptyState
          title="Choose a report"
          description="Select a report type and click Run report."
        />
      ) : (
        <DataTable
          title={reportQuery.data?.meta.title ?? 'Construction report'}
          rows={rows.map((row, index) => ({
            id: String(row.id ?? row.balanceId ?? row.transactionId ?? index),
            ...row,
          }))}
          columns={columns}
          loading={reportQuery.isLoading || reportQuery.isFetching}
          error={reportQuery.error}
          onRetry={() => void reportQuery.refetch()}
          emptyTitle="No rows"
          emptyDescription="No data for this report and filter set."
          height={520}
          getRowId={(row) => String(row.id)}
          paginationMode="client"
          page={page}
          pageSize={pageSize}
          rowCount={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {canExport && reportType ? (
        <ExportDialog
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          descriptor={exportDescriptor}
          initialValues={{
            projectId: selectedProjectId,
            from,
            to,
          }}
        />
      ) : null}
    </Stack>
  );
}
