import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { resolveSaleAgreementCapabilities } from '@/sale-agreements/roleAccess';
import { SaleAgreementTable } from '@/sale-agreements/SaleAgreementTable';
import { useSaleAgreementsList } from '@/sale-agreements/useSaleAgreements';

export function SaleAgreementsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveSaleAgreementCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useSaleAgreementsList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Sale agreements unavailable"
        message="You need the agreement.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to list sale agreements.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Sale agreements — draft through execution for booked units.
      </Typography>
      <SaleAgreementTable
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
