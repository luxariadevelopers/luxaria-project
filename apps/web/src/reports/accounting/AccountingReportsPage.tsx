import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  ExportDialog,
  accountingReportExportDescriptor,
} from '@/export';
import {
  BANK_BOOK_PATH,
  CASH_BOOK_PATH,
} from './routes';
import {
  DEDICATED_ACCOUNTING_BOOK_REPORTS,
  PROJECT_REQUIRED_ACCOUNTING_REPORTS,
  type AccountingReportFilterState,
  type AccountingReportPayload,
  type AccountingReportType,
} from './types';
import { useBookFinancialYears } from './useCashBankBook';
import {
  useAccountingReport,
  useAccountingReportCatalogue,
} from './useAccountingReports';

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

function emptyHubFilters(
  defaults?: Partial<AccountingReportFilterState>,
): AccountingReportFilterState {
  return {
    financialYearId: defaults?.financialYearId ?? '',
    projectId: defaults?.projectId ?? '',
    from: defaults?.from ?? '',
    to: defaults?.to ?? '',
    accountId: defaults?.accountId ?? '',
    partyId: defaults?.partyId ?? '',
  };
}

function extractReportRows(
  payload: AccountingReportPayload | undefined,
): Record<string, unknown>[] {
  if (!payload) return [];
  if (Array.isArray(payload.rows) && payload.rows.length > 0) {
    return payload.rows;
  }

  const sections = payload.sections;
  if (!sections || typeof sections !== 'object') {
    return [];
  }

  const flat: Record<string, unknown>[] = [];
  for (const [sectionKey, sectionValue] of Object.entries(
    sections as Record<string, unknown>,
  )) {
    if (Array.isArray(sectionValue)) {
      for (const row of sectionValue) {
        if (row && typeof row === 'object') {
          flat.push({ section: sectionKey, ...(row as Record<string, unknown>) });
        }
      }
      continue;
    }
    if (
      sectionValue &&
      typeof sectionValue === 'object' &&
      Array.isArray((sectionValue as { rows?: unknown[] }).rows)
    ) {
      const section = sectionValue as {
        section?: string;
        rows?: Record<string, unknown>[];
      };
      for (const row of section.rows ?? []) {
        flat.push({
          section: section.section ?? sectionKey,
          ...row,
        });
      }
    }
  }
  return flat;
}

function isDedicatedBookReport(reportType: string): boolean {
  return (DEDICATED_ACCOUNTING_BOOK_REPORTS as readonly string[]).includes(
    reportType,
  );
}

function requiresProject(reportType: string): boolean {
  return (PROJECT_REQUIRED_ACCOUNTING_REPORTS as readonly string[]).includes(
    reportType,
  );
}

/**
 * Accounting reports hub — `/reports/accounting`.
 * Nest: GET /accounting-reports, GET /accounting-reports/:type (+ export).
 */
export function AccountingReportsPage() {
  const { hasPermission, access } = useAuth();
  const canView = hasPermission('report.view');
  const canExport = hasPermission('report.export');
  const canListFy = hasPermission('financial_year.view');
  const { projects, selectedProjectId } = useProject();

  const [reportType, setReportType] = useState<AccountingReportType | ''>('');
  const [filters, setFilters] = useState(() =>
    emptyHubFilters({ projectId: selectedProjectId ?? '' }),
  );
  const [runKey, setRunKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (selectedProjectId && !filters.projectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId, filters.projectId]);

  const fyQuery = useBookFinancialYears(canView && canListFy);

  useEffect(() => {
    if (filters.financialYearId || !fyQuery.data?.length) return;
    const current = fyQuery.data.find((fy) => fy.isCurrent) ?? fyQuery.data[0];
    if (current) {
      setFilters((prev) =>
        prev.financialYearId
          ? prev
          : { ...prev, financialYearId: current.id },
      );
    }
  }, [fyQuery.data, filters.financialYearId]);

  const catalogueQuery = useAccountingReportCatalogue(canView);

  const hubCatalogue = useMemo(
    () =>
      (catalogueQuery.data ?? []).filter(
        (item) => !isDedicatedBookReport(item.reportType),
      ),
    [catalogueQuery.data],
  );

  const query = useMemo(
    () => ({
      financialYearId: filters.financialYearId || undefined,
      projectId: filters.projectId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      accountId: filters.accountId || undefined,
      partyId: filters.partyId || undefined,
    }),
    [filters],
  );

  const fyReady = Boolean(filters.financialYearId);
  const projectReady = !reportType || !requiresProject(reportType) || Boolean(filters.projectId);
  const canRun =
    canView &&
    Boolean(reportType) &&
    fyReady &&
    projectReady &&
    runKey > 0;

  const reportQuery = useAccountingReport(reportType, query, canRun);

  const rows = extractReportRows(reportQuery.data);

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
      accountingReportExportDescriptor({
        reportType: reportType || 'trial-balance',
        title: hubCatalogue.find((r) => r.reportType === reportType)?.title,
        requireProjectId: reportType ? requiresProject(reportType) : undefined,
      }),
    [hubCatalogue, reportType],
  );

  const patchFilters = (partial: Partial<AccountingReportFilterState>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Accounting reports unavailable"
        message="You need the report.view permission to run accounting reports."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="accounting-reports-page">
      <Typography color="text.secondary">
        Accounting reports (trial balance, ledgers, ageing, cash flow, project
        cost). Nest: GET /accounting-reports and GET /accounting-reports/:type.
      </Typography>

      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Link component={RouterLink} to={CASH_BOOK_PATH} underline="hover">
          Open Cash Book
        </Link>
        <Link component={RouterLink} to={BANK_BOOK_PATH} underline="hover">
          Open Bank Book
        </Link>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: { md: 'center' } }}
      >
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="accounting-report-type">Report</InputLabel>
          <Select
            labelId="accounting-report-type"
            label="Report"
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value as AccountingReportType | '');
              setRunKey(0);
              setPage(1);
            }}
          >
            {hubCatalogue.map((item) => (
              <MenuItem key={item.reportType} value={item.reportType}>
                {item.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{ minWidth: 220 }}
          disabled={!canListFy}
        >
          <InputLabel id="accounting-fy-label">Financial year</InputLabel>
          <Select
            labelId="accounting-fy-label"
            label="Financial year"
            value={filters.financialYearId}
            onChange={(e) => patchFilters({ financialYearId: e.target.value })}
          >
            <MenuItem value="">
              <em>Select financial year</em>
            </MenuItem>
            {(fyQuery.data ?? []).map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
                {fy.isCurrent ? ' (current)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="accounting-project-label">Project</InputLabel>
          <Select
            labelId="accounting-project-label"
            label="Project"
            value={filters.projectId}
            onChange={(e) => patchFilters({ projectId: e.target.value })}
          >
            <MenuItem value="">
              <em>All projects</em>
            </MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.projectCode} · {project.projectName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="date"
          label="From"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.from}
          onChange={(e) => patchFilters({ from: e.target.value })}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.to}
          onChange={(e) => patchFilters({ to: e.target.value })}
        />
        <TextField
          size="small"
          label="Account id"
          value={filters.accountId}
          onChange={(e) => patchFilters({ accountId: e.target.value })}
          sx={{ minWidth: 180 }}
        />
        <TextField
          size="small"
          label="Party id"
          value={filters.partyId}
          onChange={(e) => patchFilters({ partyId: e.target.value })}
          sx={{ minWidth: 180 }}
        />

        <Button
          variant="contained"
          disabled={!reportType || !fyReady || !projectReady}
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

      {!canListFy ? (
        <PermissionDenied
          title="Financial year list unavailable"
          message="You need financial_year.view to choose a financial year for these reports."
          showHomeLink={false}
        />
      ) : null}

      {reportType && requiresProject(reportType) && !filters.projectId ? (
        <Alert severity="warning">
          This report requires a project. Select one in the project filter.
        </Alert>
      ) : null}

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
          description="Select a report type, set filters, and click Run report. Cash and bank books open on dedicated pages."
        />
      ) : (
        <DataTable
          title={reportQuery.data?.meta.title ?? 'Accounting report'}
          rows={rows.map((row, index) => ({
            id: String(
              row.id ??
                row.accountId ??
                row.journalId ??
                row.partyId ??
                index,
            ),
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
            financialYearId: filters.financialYearId,
            projectId: filters.projectId,
            from: filters.from,
            to: filters.to,
            accountId: filters.accountId,
            partyId: filters.partyId,
          }}
        />
      ) : null}
    </Stack>
  );
}
