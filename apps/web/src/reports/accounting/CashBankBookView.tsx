import { useEffect, useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  ExportDialog,
  accountingReportExportDescriptor,
} from '@/export';
import { BookFilters } from './BookFilters';
import { BookSummary } from './BookSummary';
import { BookTable } from './BookTable';
import {
  CASH_BANK_BOOK_VIEW_PERMISSION,
  resolveCashBankBookCapabilities,
} from './permissions';
import {
  useBookAccountOptions,
  useBookFinancialYears,
  useCashBankBook,
} from './useCashBankBook';
import { emptyBookFilters, parseBookFilters } from './validation';
import type { AccountingBookKind } from './types';

type Props = {
  kind: AccountingBookKind;
  title: string;
  description: string;
};

/**
 * Shared cash / bank book runner.
 * Nest: `GET /accounting-reports/cash-book|bank-book` (`report.view`),
 * export: `GET /accounting-reports/:type/export` (`report.export`).
 */
export function CashBankBookView({ kind, title, description }: Props) {
  const { hasPermission, access } = useAuth();
  const caps = resolveCashBankBookCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();
  const [exportOpen, setExportOpen] = useState(false);

  const [filters, setFilters] = useState(() =>
    emptyBookFilters({
      projectId: selectedProjectId ?? '',
    }),
  );

  useEffect(() => {
    if (selectedProjectId && !filters.projectId) {
      setFilters((prev) => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId, filters.projectId]);

  const canView = Boolean(access) && caps.canView;
  const canListFy = hasPermission('financial_year.view');
  const canListAccounts = hasPermission('account.view');

  const fyQuery = useBookFinancialYears(canView && canListFy);
  const accountsQuery = useBookAccountOptions(kind, canView && canListAccounts);

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

  const filterParse = useMemo(() => parseBookFilters(filters), [filters]);
  const query = filterParse.ok ? filterParse.value : null;
  const enabled = canView && filterParse.ok && query != null;

  const reportQuery = useCashBankBook(kind, query ?? {}, enabled);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title={`${title} unavailable`}
        message={`Requires permission \`${CASH_BANK_BOOK_VIEW_PERMISSION}\` (Nest catalogue; not report.cash_book.view / report.bank_book.view).`}
      />
    );
  }

  if (reportQuery.error && isForbiddenError(reportQuery.error)) {
    return (
      <PermissionDenied
        error={reportQuery.error}
        title={`${title} denied`}
        message="The server denied access to this accounting report (403)."
      />
    );
  }

  const exportDescriptor = accountingReportExportDescriptor({
    reportType: kind,
    title: `Export ${title}`,
  });

  return (
    <Stack spacing={2.5} data-testid={`${kind}-page`}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'flex-start' },
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4">{title}</Typography>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
        {caps.canExport ? (
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => setExportOpen(true)}
            disabled={!filterParse.ok}
          >
            Export
          </Button>
        ) : null}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <BookFilters
          value={filters}
          onChange={setFilters}
          projects={projects}
          financialYears={fyQuery.data ?? []}
          accounts={accountsQuery.data ?? []}
          canSelectFinancialYear={canListFy}
          accountsLoading={accountsQuery.isLoading}
          fieldErrors={filterParse.ok ? undefined : filterParse.fieldErrors}
        />
      </Paper>

      {!canListFy ? (
        <PermissionDenied
          title="Financial year list unavailable"
          message="You need financial_year.view to choose a financial year for this report."
          showHomeLink={false}
        />
      ) : null}

      {canListFy && !filterParse.ok ? (
        <Alert severity="warning">
          Select a financial year (and fix date range errors) before loading the
          book.
        </Alert>
      ) : null}

      {!canListAccounts ? (
        <Alert severity="info" variant="outlined">
          Account selector needs `account.view`. You can still run the book for
          all cash/bank accounts.
        </Alert>
      ) : null}

      {reportQuery.error ? (
        <RetryPanel
          error={reportQuery.error}
          onRetry={() => void reportQuery.refetch()}
          forceRetry
        />
      ) : null}

      {enabled && (reportQuery.isLoading || reportQuery.isFetching) && !reportQuery.data ? (
        <Stack sx={{ alignItems: 'center', py: 6 }}>
          <CircularProgress size={36} />
        </Stack>
      ) : null}

      {enabled && reportQuery.data ? (
        <Stack spacing={2}>
          <BookSummary payload={reportQuery.data} />
          {reportQuery.data.rows.length === 0 ? (
            <EmptyState
              title="No movements in period"
              description="Opening and closing balances are shown above. Widen the date range or clear the account filter."
            />
          ) : (
            <BookTable
              rows={reportQuery.data.rows}
              loading={reportQuery.isFetching}
              onRetry={() => void reportQuery.refetch()}
            />
          )}
        </Stack>
      ) : null}

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
          format: 'xlsx',
        }}
      />
    </Stack>
  );
}
