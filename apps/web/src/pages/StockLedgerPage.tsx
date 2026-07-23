import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PageHeader } from '@/layouts/PageHeader';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  emptyStockLedgerFilters,
  filterEntriesByDateRange,
  LedgerFilters,
  LedgerTable,
  parseStockLedgerFilters,
  resolveStockLedgerCapabilities,
  useStockLedgerList,
  withRunningBalances,
} from '@/stock-ledger';

/**
 * Stock ledger — `/inventory/stock-ledger` (Micro Phase 071).
 *
 * Nest: `GET /stock-ledger` (`stock.view`). Read-only immutable history.
 */
export function StockLedgerPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveStockLedgerCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState(emptyStockLedgerFilters);

  const filterParse = useMemo(
    () => parseStockLedgerFilters(filters),
    [filters],
  );

  const listQuery = useMemo(() => {
    if (!filterParse.ok) return null;
    const f = filterParse.value;
    return {
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      search: f.search || undefined,
      materialId: f.materialId || undefined,
      transactionType: f.transactionType || undefined,
      location: f.location || undefined,
      batch: f.batch || undefined,
    };
  }, [filterParse, page, pageSize, selectedProjectId]);

  const canView = Boolean(access) && caps.canView;
  const enabled =
    canView && Boolean(selectedProjectId) && filterParse.ok && listQuery != null;

  const list = useStockLedgerList(listQuery ?? { page: 1, limit: pageSize }, enabled);

  const rows = useMemo(() => {
    if (!filterParse.ok) return [];
    const filtered = filterEntriesByDateRange(
      list.data?.items ?? [],
      filterParse.value.dateFrom,
      filterParse.value.dateTo,
    );
    return withRunningBalances(filtered);
  }, [list.data?.items, filterParse]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Stock ledger unavailable"
        message="You need the stock.view permission to see immutable stock movements."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to view the stock ledger for that project only."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Stock ledger denied"
        message="You do not have permission to load stock ledger entries for this project."
      />
    );
  }

  const projectLabel =
    selectedProject?.projectCode && selectedProject.projectName
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject?.projectName ?? selectedProjectId;

  return (
    <Stack spacing={2} data-testid="stock-ledger-page">
      <PageHeader
        subtitle={`Immutable stock movement history for ${projectLabel}. Entries cannot be edited here. Running balance is in the material base unit within the filtered set.`}
      />

      {!filterParse.ok ? (
        <Alert severity="warning">
          Fix filter errors before loading the ledger (valid date range
          required when both dates are set).
        </Alert>
      ) : null}

      {list.error ? (
        <RetryPanel
          error={list.error}
          onRetry={() => void list.refetch()}
          forceRetry
        />
      ) : (
        <LedgerTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          error={undefined}
          onRetry={() => void list.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={list.data?.meta?.total ?? rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          search={filters.search}
          onSearchChange={(value) => {
            setFilters((prev) => ({ ...prev, search: value }));
            setPage(1);
          }}
          filterSlot={
            <LedgerFilters
              value={filters}
              fieldErrors={
                filterParse.ok ? undefined : filterParse.fieldErrors
              }
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
            />
          }
        />
      )}
    </Stack>
  );
}
