import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { CustomerLoanTable } from '@/customer-loans/CustomerLoanTable';
import { resolveCustomerLoanCapabilities } from '@/customer-loans/roleAccess';
import { useCustomerLoansList } from '@/customer-loans/useCustomerLoans';
import { PageHeader } from '@/layouts/PageHeader';

export function CustomerLoansPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerLoanCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const listQuery = useMemo(
    () => ({ page, limit: pageSize, projectId: selectedProjectId ?? undefined }),
    [page, pageSize, selectedProjectId],
  );

  const query = useCustomerLoansList(
    listQuery,
    caps.canView && Boolean(selectedProjectId),
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Customer loans unavailable"
        message="You need the loan.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to list customer loans.</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Customer loans"
        subtitle="Customer home-loan tracking — sanction, disbursement, and correspondence."
      />
      <CustomerLoanTable
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
