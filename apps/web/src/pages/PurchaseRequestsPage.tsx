import { useEffect, useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { RequestTable } from '@/purchase-requests/RequestTable';
import { resolvePurchaseRequestCapabilities } from '@/purchase-requests/roleAccess';
import { usePurchaseRequestsList } from '@/purchase-requests/usePurchaseRequests';

/**
 * Purchase requests list — `/procurement/purchase-requests`
 * Deep links open `/procurement/purchase-requests/:requestId` (Phase 062).
 * Create form (`/new`) is Phase 061.
 */
export function PurchaseRequestsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  /** Quick-search legacy `?id=` → detail deep link. */
  useEffect(() => {
    const id = params.get('id');
    if (id) {
      navigate(`/procurement/purchase-requests/${id}`, { replace: true });
    }
  }, [params, navigate]);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      search: search.trim() || undefined,
    }),
    [page, pageSize, projectId, search],
  );

  const list = usePurchaseRequestsList(
    listQuery,
    canView && Boolean(projectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Purchase requests unavailable"
        message="You need the purchase.view permission to open this register."
      />
    );
  }

  if (!projectId) {
    return (
      <PermissionDenied
        title="Project required"
        message="Select a project in the header to load purchase requests."
        showHomeLink={false}
      />
    );
  }

  if (list.isError && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Purchase requests denied"
        message="The server denied access to purchase requests (403)."
      />
    );
  }

  if (list.isError) {
    return (
      <RetryPanel
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
        forceRetry
      />
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle={
          selectedProject
            ? `${selectedProject.projectCode ?? ''} ${selectedProject.projectName}`.trim()
            : 'Active project'
        }
        actions={
          caps.canRequest ? (
            <Button
              variant="contained"
              onClick={() => navigate('/procurement/purchase-requests/new')}
            >
              New request
            </Button>
          ) : undefined
        }
      />

      <RequestTable
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => {
          void list.refetch();
        }}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
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
      />
    </Stack>
  );
}
