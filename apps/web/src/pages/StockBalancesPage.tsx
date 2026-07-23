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
  emptyStockBalanceFilters,
  parseStockBalanceFilters,
  resolveStockBalanceCapabilities,
  StockFilters,
  StockTable,
  useStockBalanceRows,
} from '@/stock-balances';

/**
 * Stock balances — `/inventory/stock-balances` (Micro Phase 070).
 *
 * Nest: `GET /stock-reorder/forecast`, `GET /stock-ledger/balance`.
 * Permission: `stock.view`. Shows on-hand availability, not ledger lines.
 */
export function StockBalancesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveStockBalanceCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState(emptyStockBalanceFilters);

  const filterParse = useMemo(
    () => parseStockBalanceFilters(filters),
    [filters],
  );

  const canView = Boolean(access) && caps.canView;
  const enabled = canView && Boolean(selectedProjectId) && filterParse.ok;

  const list = useStockBalanceRows(
    selectedProjectId,
    filterParse.ok ? filterParse.value : filters,
    enabled,
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Stock balances unavailable"
        message="You need the stock.view permission to see project material availability."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to view stock balances for that project only."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Stock balances denied"
        message="You do not have permission to load stock for this project."
      />
    );
  }

  const projectLabel =
    selectedProject?.projectCode && selectedProject.projectName
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject?.projectName ?? selectedProjectId;

  return (
    <Stack spacing={2} data-testid="stock-balances-page">
      <PageHeader
        subtitle={`On-hand quantities for ${projectLabel}. Quantities are always in the material base unit. This view does not list raw stock ledger entries.`}
      />

      {!filterParse.ok ? (
        <Alert severity="warning">
          Fix filter errors before refreshing stock (location max 120
          characters).
        </Alert>
      ) : null}

      {list.error ? (
        <RetryPanel
          error={list.error}
          onRetry={() => void list.refetch()}
          forceRetry
        />
      ) : (
        <StockTable
          rows={list.rows}
          loading={list.isLoading || list.isFetching}
          error={undefined}
          onRetry={() => void list.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={list.rows.length}
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
          locationScope={filters.location.trim()}
          filterSlot={
            <StockFilters
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
