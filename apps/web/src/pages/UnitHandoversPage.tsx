import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { resolveUnitHandoverCapabilities } from '@/unit-handovers/roleAccess';
import { UnitHandoverTable } from '@/unit-handovers/UnitHandoverTable';
import { useUnitHandoversList } from '@/unit-handovers/useUnitHandovers';
import { PageHeader } from '@/layouts/PageHeader';

export function UnitHandoversPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveUnitHandoverCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useUnitHandoversList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Unit handovers unavailable"
        message="You need the handover.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to list unit handovers.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Unit handovers"
        subtitle="Possession handovers — scheduling, snag list, and customer acknowledgement."
      />
      <UnitHandoverTable
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
