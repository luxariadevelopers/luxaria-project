import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  GrnFilters,
  type GrnFilterState,
} from '@/grns/GrnFilters';
import { GrnTable } from '@/grns/GrnTable';
import { resolveGrnCapabilities } from '@/grns/roleAccess';
import type { GoodsReceiptStatus, PublicGoodsReceipt } from '@/grns/types';
import {
  useGrnsList,
  usePostGoodsReceipt,
  useStartGrnQualityCheck,
} from '@/grns/useGrns';

/**
 * Goods receipts list — `/inventory/grns` (Micro Phase 068).
 *
 * Nest: `GET /goods-receipts` (`grn.create`).
 * Actions: QC / post via `grn.approve`.
 */
export function GrnsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveGrnCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<GrnFilterState>({ status: '' });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as
        | GoodsReceiptStatus
        | undefined,
    }),
    [page, pageSize, search, selectedProjectId, filters.status],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useGrnsList(listQuery, enabled);
  const startQc = useStartGrnQualityCheck();
  const post = usePostGoodsReceipt();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Goods receipts unavailable"
        message="You need the grn.create permission to review goods receipts."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list goods receipts."
      />
    );
  }

  const openDetail = (row: PublicGoodsReceipt) => {
    navigate(`/inventory/grns/${row.id}`);
  };

  const runQc = (row: PublicGoodsReceipt) => {
    void (async () => {
      try {
        await startQc.mutateAsync(row.id);
        success('Moved to quality check');
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const runPost = (row: PublicGoodsReceipt) => {
    void (async () => {
      try {
        await post.mutateAsync(row.id);
        success('Goods receipt posted; stock updated for accepted quantity');
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Stack spacing={2} data-testid="grns-page">
      <PageHeader
        subtitle="Review site goods receipts, record QC acceptance, and post accepted quantity to stock."
        actions={
          caps.canCreate ? (
            <Button
              variant="contained"
              data-testid="grn-create-new"
              onClick={() => navigate('/inventory/grns/new')}
            >
              New goods receipt
            </Button>
          ) : undefined
        }
      />
      <GrnTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? list.data?.items.length ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={
          <GrnFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        onOpenDetail={openDetail}
        onQualityCheck={runQc}
        onAccept={openDetail}
        onPost={runPost}
      />
    </Stack>
  );
}
