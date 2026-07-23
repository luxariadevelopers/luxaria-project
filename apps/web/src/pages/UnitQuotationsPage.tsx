import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { resolveUnitQuotationCapabilities } from '@/unit-quotations/roleAccess';
import { UnitQuotationTable } from '@/unit-quotations/UnitQuotationTable';
import { useUnitQuotationsList } from '@/unit-quotations/useUnitQuotations';
import { PageHeader } from '@/layouts/PageHeader';

export function UnitQuotationsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveUnitQuotationCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useUnitQuotationsList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Unit quotations unavailable"
        message="You need the quotation.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to list unit quotations.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Unit quotations"
        subtitle="Unit sales quotations — pricing offers for inventory units (not vendor RFQ quotations)."
      />
      <UnitQuotationTable
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
