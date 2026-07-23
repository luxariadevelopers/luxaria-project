import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Stack, Tab, Tabs, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import {
  fetchActiveShareholding,
  fetchShareholdingChangeRequests,
  fetchShareholdingHistory,
} from '@/directors/api';
import { ChangeRequestsPanel } from '@/shareholding/ChangeRequestsPanel';
import { EffectiveDateTimeline } from '@/shareholding/EffectiveDateTimeline';
import { findOverlappingEffectiveDates } from '@/shareholding/effectiveDateOverlap';
import { PostShareCapitalToBankPanel } from '@/shareholding/PostShareCapitalToBankPanel';
import { ShareholdingTable } from '@/shareholding/ShareholdingTable';
import { TotalPercentageIndicator } from '@/shareholding/TotalPercentageIndicator';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * Company shareholding history — `/capital/shareholding`.
 *
 * Permissions (Nest catalog — no `shareholding.change`):
 * - `shareholding.view` — active, history, change requests
 * - `shareholding.approve` — approve/reject
 * - `shareholding.propose` — propose (via API; UI focuses on history)
 */
export function ShareholdingPage() {
  const { hasPermission, access, user } = useAuth();
  const [tab, setTab] = useState<'active' | 'history' | 'requests'>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && hasPermission('shareholding.view');
  const canApprove = hasPermission('shareholding.approve');

  const activeQuery = useQuery({
    queryKey: ['shareholding', 'active'],
    queryFn: () => fetchActiveShareholding(),
    enabled: canView,
    staleTime: 15_000,
    retry: false,
  });

  const historyQuery = useQuery({
    queryKey: ['shareholding', 'history', page, limit],
    queryFn: () => fetchShareholdingHistory({ page, limit }),
    enabled: canView && tab === 'history',
    staleTime: 15_000,
    retry: false,
  });

  const requestsQuery = useQuery({
    queryKey: ['shareholding', 'change-requests'],
    queryFn: () => fetchShareholdingChangeRequests({ limit: 50 }),
    enabled: canView && tab === 'requests',
    staleTime: 15_000,
    retry: false,
  });

  const timelineHoldings = useMemo(() => {
    if (tab === 'active') {
      return activeQuery.data?.holdings ?? [];
    }
    return historyQuery.data?.items ?? [];
  }, [tab, activeQuery.data?.holdings, historyQuery.data?.items]);

  const overlaps = useMemo(
    () => findOverlappingEffectiveDates(timelineHoldings),
    [timelineHoldings],
  );

  const overlappedIds = useMemo(
    () => new Set(overlaps.flatMap((o) => [o.a.id, o.b.id])),
    [overlaps],
  );

  if (access && !canView) {
    return (
      <PermissionDenied
        title="Shareholding unavailable"
        message="You need the shareholding.view permission to open company shareholding."
      />
    );
  }

  const activeError = activeQuery.error;
  if (activeError && isForbiddenError(activeError)) {
    return (
      <PermissionDenied
        error={activeError}
        title="Shareholding denied"
        message="You do not have access to company shareholding."
      />
    );
  }

  const refreshAll = () => {
    void activeQuery.refetch();
    void historyQuery.refetch();
    void requestsQuery.refetch();
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Shareholding"
        subtitle="Versioned company equity (not project investment). Approving a change closes prior rows and inserts a new version — history is never overwritten."
      />

      {activeQuery.error && !isForbiddenError(activeQuery.error) ? (
        <RetryPanel
          error={activeQuery.error}
          onRetry={() => void activeQuery.refetch()}
          forceRetry
        />
      ) : (
        <TotalPercentageIndicator
          totalPercentage={activeQuery.data?.totalPercentage ?? 0}
          isBalanced={activeQuery.data?.isBalanced}
          note={activeQuery.data?.note}
        />
      )}

      {overlaps.length > 0 ? (
        <Alert severity="error" variant="outlined" data-testid="overlap-alert">
          {overlaps.map((o) => o.message).join(' · ')}
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onChange={(_e, next: typeof tab) => setTab(next)}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab value="active" label="Active" />
        <Tab value="history" label="History" />
        <Tab value="requests" label="Change requests" />
      </Tabs>

      {tab === 'active' ? (
        activeQuery.isLoading ? (
          <Typography color="text.secondary">Loading active holdings…</Typography>
        ) : (activeQuery.data?.holdings.length ?? 0) === 0 ? (
          <EmptyState
            title="No active holdings"
            description="Approved shareholding lines with effectiveTo=null appear here."
          />
        ) : (
          <Stack spacing={2}>
            <PostShareCapitalToBankPanel
              holdings={activeQuery.data?.holdings ?? []}
            />
            <ShareholdingTable
              title="Active holdings"
              rows={activeQuery.data?.holdings ?? []}
              loading={activeQuery.isLoading}
              error={undefined}
              onRetry={() => void activeQuery.refetch()}
              page={1}
              pageSize={Math.max(activeQuery.data?.holdings.length ?? 20, 10)}
              rowCount={activeQuery.data?.holdings.length ?? 0}
              onPageChange={() => undefined}
              onPageSizeChange={() => undefined}
              overlappedIds={overlappedIds}
            />
            <EffectiveDateTimeline
              holdings={activeQuery.data?.holdings ?? []}
              overlaps={overlaps}
            />
          </Stack>
        )
      ) : null}

      {tab === 'history' ? (
        historyQuery.error && isForbiddenError(historyQuery.error) ? (
          <PermissionDenied
            error={historyQuery.error}
            title="Shareholding history denied"
            message="You do not have access to company shareholding history."
          />
        ) : historyQuery.error ? (
          <RetryPanel
            error={historyQuery.error}
            onRetry={() => void historyQuery.refetch()}
            forceRetry
          />
        ) : (
          <Stack spacing={2}>
            <ShareholdingTable
              rows={historyQuery.data?.items ?? []}
              loading={historyQuery.isLoading}
              error={undefined}
              onRetry={() => void historyQuery.refetch()}
              page={page}
              pageSize={limit}
              rowCount={Number(
                historyQuery.data?.meta?.total ??
                  historyQuery.data?.items.length ??
                  0,
              )}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
              overlappedIds={overlappedIds}
            />
            <EffectiveDateTimeline
              holdings={historyQuery.data?.items ?? []}
              overlaps={overlaps}
            />
          </Stack>
        )
      ) : null}

      {tab === 'requests' ? (
        <ChangeRequestsPanel
          items={requestsQuery.data?.items ?? []}
          loading={requestsQuery.isLoading}
          error={requestsQuery.error}
          onRetry={() => void requestsQuery.refetch()}
          onChanged={refreshAll}
          canView={canView}
          canApprove={canApprove}
          currentUserId={user?.id ?? null}
        />
      ) : null}
    </Stack>
  );
}
