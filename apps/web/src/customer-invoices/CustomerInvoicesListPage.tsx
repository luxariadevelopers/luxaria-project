import { useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  CustomerInvoiceFilters,
  type CustomerInvoiceFilterState,
} from './CustomerInvoiceFilters';
import { CustomerInvoiceTable } from './CustomerInvoiceTable';
import { resolveCustomerInvoiceCapabilities } from './roleAccess';
import { useCustomerInvoicesList } from './useCustomerInvoices';

export function CustomerInvoicesListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerInvoiceCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [filters, setFilters] = useState<CustomerInvoiceFilterState>({
    status: '',
    customerId: '',
    bookingId: '',
  });

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      status: filters.status || undefined,
      customerId: filters.customerId.trim() || undefined,
      bookingId: filters.bookingId.trim() || undefined,
    }),
    [page, pageSize, projectId, filters],
  );

  const list = useCustomerInvoicesList(listQuery, canView && Boolean(projectId));

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Customer invoices unavailable"
        message="You need the customer_invoice.view permission to browse customer invoices."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project from the header to list customer invoices."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Customer invoice list denied"
        message="You do not have permission to load customer invoices."
      />
    );
  }

  const rows = list.data?.items ?? [];

  return (
    <Stack spacing={2} data-testid="customer-invoices-page">
      <PageHeader
        title="Customer invoices"
        subtitle="Customer revenue invoices — draft, post for revenue recognition, and GST sync."
      />

      {list.error ? (
        <>
          <CustomerInvoiceFilters value={filters} onChange={setFilters} />
          <RetryPanel error={list.error} onRetry={() => void list.refetch()} forceRetry />
        </>
      ) : (
        <CustomerInvoiceTable
          rows={rows}
          loading={list.isLoading || list.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={Number(list.data?.meta?.total ?? rows.length)}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          filterSlot={
            <CustomerInvoiceFilters
              value={filters}
              onChange={(next) => { setFilters(next); setPage(1); }}
            />
          }
        />
      )}
    </Stack>
  );
}
