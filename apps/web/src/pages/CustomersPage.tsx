import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { CreateCustomerDrawer } from '@/customers/CreateCustomerDrawer';
import {
  CustomerFilters,
  type CustomerFilterState,
} from '@/customers/CustomerFilters';
import { CustomerTable } from '@/customers/CustomerTable';
import { EditCustomerDrawer } from '@/customers/EditCustomerDrawer';
import { VerifyKycDialog } from '@/customers/VerifyKycDialog';
import { resolveCustomerCapabilities } from '@/customers/roleAccess';
import type {
  CustomerFundingType,
  CustomerKycStatus,
  CustomerListRow,
  CustomerStatus,
} from '@/customers/types';
import {
  useActivateCustomer,
  useCustomersList,
  useDeactivateCustomer,
} from '@/customers/useCustomers';

/**
 * Customer master list — `/sales/customers`.
 * Nest: GET/POST /customers, KYC/activate (`customer.view` / `customer.manage`).
 */
export function CustomersPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveCustomerCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CustomerFilterState>({
    status: '',
    fundingType: '',
    kycStatus: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerListRow | null>(null);
  const [kycTarget, setKycTarget] = useState<{
    row: CustomerListRow;
    verified: boolean;
  } | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: (filters.status || undefined) as CustomerStatus | undefined,
      fundingType: (filters.fundingType || undefined) as
        | CustomerFundingType
        | undefined,
      kycStatus: (filters.kycStatus || undefined) as
        | CustomerKycStatus
        | undefined,
    }),
    [page, pageSize, search, filters],
  );

  const customersQuery = useCustomersList(listQuery, caps.canView);
  const activate = useActivateCustomer();
  const deactivate = useDeactivateCustomer();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Customers unavailable"
        message="You need the customer.view permission to manage customers."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Customer master — search, KYC review, and activation. Aadhaar is masked
        in this list.
      </Typography>

      <CustomerTable
        rows={customersQuery.data?.items ?? []}
        loading={customersQuery.isLoading || customersQuery.isFetching}
        error={customersQuery.error}
        onRetry={() => void customersQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={customersQuery.data?.meta?.total ?? 0}
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
          <CustomerFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New customer
            </Button>
          ) : undefined
        }
        canVerifyKyc={caps.canVerifyKyc}
        canActivate={caps.canActivate}
        canUpdate={caps.canUpdate}
        onEdit={(row) => setEditTarget(row)}
        onVerifyKyc={(row, verified) => setKycTarget({ row, verified })}
        onActivate={async (row) => {
          try {
            await activate.mutateAsync(row.id);
            success('Customer activated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onDeactivate={async (row) => {
          try {
            await deactivate.mutateAsync(row.id);
            success('Customer deactivated');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      {caps.canCreate ? (
        <CreateCustomerDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            void customersQuery.refetch();
            void navigate(`/sales/customers/${id}`);
          }}
        />
      ) : null}

      {caps.canUpdate ? (
        <EditCustomerDrawer
          open={Boolean(editTarget)}
          customer={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      <VerifyKycDialog
        open={Boolean(kycTarget)}
        customer={kycTarget?.row ?? null}
        verified={kycTarget?.verified ?? true}
        onClose={() => setKycTarget(null)}
      />
    </Stack>
  );
}
