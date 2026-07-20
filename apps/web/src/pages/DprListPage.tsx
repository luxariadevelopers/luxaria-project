import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  DprFilters,
  DPRTable,
  emptyDprFilters,
  MissingDayIndicators,
  resolveDprCapabilities,
  type DprFilterState,
  type DprStatus,
  useDailyProgressReportsList,
  useMissingDprAlerts,
} from '@/dpr';

function recentCalendarDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Daily progress list — `/project-control/dpr` (Micro Phase 082).
 *
 * Nest: `GET /daily-progress-reports`, `GET /daily-progress-reports/missing-alerts`
 * (`dpr.view`).
 */
export function DprListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveDprCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<DprFilterState>(emptyDprFilters);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as DprStatus | undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
    }),
    [page, pageSize, selectedProjectId, filters],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useDailyProgressReportsList(listQuery, enabled);
  const missing = useMissingDprAlerts(selectedProjectId, enabled);

  const recentDates = useMemo(() => recentCalendarDays(7), []);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Daily progress unavailable"
        message="You need the dpr.view permission to list daily progress reports and missing-day alerts."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to review daily progress reports."
      />
    );
  }

  const rows = list.data?.items ?? [];
  const rowCount = list.data?.meta?.total ?? rows.length;
  const showEmpty =
    !list.isLoading &&
    !list.isFetching &&
    !list.error &&
    rows.length === 0 &&
    (missing.data?.length ?? 0) === 0;

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Site DPRs for mobile and web. Submit from the field app (offline-ready);
        review and PDF on the backend. One DPR per project per date unless
        reopened.
      </Typography>

      <MissingDayIndicators
        dprs={rows}
        missingAlerts={missing.data ?? []}
        recentDates={recentDates}
      />

      {showEmpty ? (
        <EmptyState
          title="No DPRs yet"
          description="Daily progress reports submitted from the site app will appear here."
        />
      ) : (
        <DPRTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          error={list.error}
          onRetry={() => {
            void list.refetch();
          }}
          page={page}
          pageSize={pageSize}
          rowCount={rowCount}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          filterSlot={
            <DprFilters
              value={filters}
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

/** @deprecated Use `DprListPage` — kept for legacy imports. */
export const DprPage = DprListPage;
