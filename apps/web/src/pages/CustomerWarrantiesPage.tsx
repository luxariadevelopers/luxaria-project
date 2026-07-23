import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CustomerWarrantyTable } from '@/customer-warranties/CustomerWarrantyTable';
import { resolveCustomerWarrantyCapabilities } from '@/customer-warranties/roleAccess';
import { useCustomerWarrantiesList } from '@/customer-warranties/useCustomerWarranties';
import { PageHeader } from '@/layouts/PageHeader';

export function CustomerWarrantiesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerWarrantyCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useCustomerWarrantiesList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Customer warranties unavailable"
        message="You need the warranty.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to list warranty tickets.</Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Customer warranties"
        subtitle="Post-handover warranty complaints and rectification workflow."
      />
      <CustomerWarrantyTable
        rows={query.data?.items ?? []}
        loading={query.isLoading || query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={query.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Stack>
  );
}
