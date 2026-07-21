import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { FixedAssetFilters, type FixedAssetFilterState } from './FixedAssetFilters';
import { FixedAssetTable } from './FixedAssetTable';
import { resolveFixedAssetCapabilities } from './roleAccess';
import { useFixedAssetsList } from './useFixedAssets';

export function FixedAssetsListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveFixedAssetCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<FixedAssetFilterState>({
    status: '',
    category: '',
  });

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
    }),
    [page, pageSize, projectId, filters],
  );

  const list = useFixedAssetsList(listQuery, canView && Boolean(projectId));

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Fixed assets unavailable"
        message="You need the fixed_asset.view permission to browse the fixed asset register."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project from the header to list fixed assets."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Fixed asset list denied"
        message="You do not have permission to load fixed assets."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="fixed-assets-page">
      <Typography color="text.secondary">
        Fixed asset register — capitalization, depreciation, and disposal tracking.
      </Typography>

      {list.error ? (
        <>
          <FixedAssetFilters value={filters} onChange={setFilters} />
          <RetryPanel error={list.error} onRetry={() => void list.refetch()} forceRetry />
        </>
      ) : (
        <FixedAssetTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(list.data?.meta?.total ?? rows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          filterSlot={
            <FixedAssetFilters
              value={filters}
              onChange={(next) => { setFilters(next); setPage(1); }}
            />
          }
        />
      )}
    </Stack>
  );
}
