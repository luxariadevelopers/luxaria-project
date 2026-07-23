import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  CreateStockCountDrawer,
  emptyStockCountFilters,
  parseStockCountFilters,
  resolveStockCountCapabilities,
  StockCountFilters,
  StockCountTable,
  type PublicStockCount,
  type StockCountFilterState,
  type StockCountStatus,
  useApproveStockCount,
  useCancelStockCount,
  usePostStockCount,
  useReviewStockCount,
  useStockCountsList,
  useSubmitStockCount,
} from '@/stock-counts';

/**
 * Stock counts list — `/inventory/stock-counts` (Micro Phase 072).
 */
export function StockCountsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveStockCountCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<StockCountFilterState>(
    emptyStockCountFilters,
  );
  const [createOpen, setCreateOpen] = useState(false);

  const filterParse = useMemo(
    () => parseStockCountFilters(filters),
    [filters],
  );

  const listQuery = useMemo(() => {
    if (!filterParse.ok) return null;
    return {
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      search: filterParse.value.search || undefined,
      status: (filterParse.value.status || undefined) as
        | StockCountStatus
        | undefined,
      location: filterParse.value.location || undefined,
    };
  }, [filterParse, page, pageSize, selectedProjectId]);

  const enabled =
    caps.canView && Boolean(selectedProjectId) && listQuery != null;
  const list = useStockCountsList(
    listQuery ?? { page: 1, limit: pageSize },
    enabled,
  );

  const submit = useSubmitStockCount();
  const review = useReviewStockCount();
  const approve = useApproveStockCount();
  const post = usePostStockCount();
  const cancel = useCancelStockCount();

  const runAction = async (
    label: string,
    fn: () => Promise<unknown>,
  ) => {
    try {
      await fn();
      success(label);
      await list.refetch();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Stock counts unavailable"
        message="You need the stock.view permission to review physical stock counts."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list stock counts."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Stock counts denied"
        message="You do not have permission to load stock counts for this project."
      />
    );
  }

  const openDetail = (row: PublicStockCount) => {
    navigate(`/inventory/stock-counts/${row.id}`);
  };

  return (
    <Stack spacing={2} data-testid="stock-counts-page">
      <PageHeader
        subtitle="Physical stock count entry, review, and adjustment posting. Differences require a reason; large variances display director approval."
      />

      <StockCountTable
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
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
          <StockCountFilters
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
        toolbarActions={
          caps.canAdjust ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New stock count
            </Button>
          ) : undefined
        }
        caps={caps}
        onOpenDetail={openDetail}
        onSubmit={(row) =>
          void runAction('Stock count submitted', () =>
            submit.mutateAsync(row.id),
          )
        }
        onReview={(row) =>
          void runAction('Stock count marked reviewed', () =>
            review.mutateAsync(row.id),
          )
        }
        onApprove={(row) =>
          void runAction('Stock count approved', () =>
            approve.mutateAsync({ id: row.id }),
          )
        }
        onPost={(row) =>
          void runAction('Stock adjustments posted', () =>
            post.mutateAsync(row.id),
          )
        }
        onCancel={(row) =>
          void runAction('Stock count cancelled', () =>
            cancel.mutateAsync(row.id),
          )
        }
      />

      <CreateStockCountDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        onCreated={(id) => navigate(`/inventory/stock-counts/${id}`)}
      />
    </Stack>
  );
}
