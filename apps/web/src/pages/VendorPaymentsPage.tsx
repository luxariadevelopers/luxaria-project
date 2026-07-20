import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import {
  PaymentFilters,
  type PaymentFilterState,
} from '@/vendor-payments/PaymentFilters';
import {
  PaymentFormDrawer,
  type PaymentEntryMode,
} from '@/vendor-payments/PaymentFormDrawer';
import { PaymentProofPanel } from '@/vendor-payments/PaymentProofPanel';
import { PaymentTable } from '@/vendor-payments/PaymentTable';
import { resolveVendorPaymentCapabilities } from '@/vendor-payments/roleAccess';
import type {
  PublicVendorPayment,
  VendorPaymentStatus,
} from '@/vendor-payments/types';
import {
  useApproveVendorPayment,
  useCancelVendorPayment,
  usePostVendorPayment,
  useReleaseVendorPayment,
  useSubmitVendorPayment,
  useVendorOptions,
  useVendorPaymentsList,
  useVerifyVendorPayment,
} from '@/vendor-payments/useVendorPayments';

/**
 * Vendor payments — `/procurement/vendor-payments` (Micro Phase 076).
 *
 * Nest: `/vendor-payments` create/approve/release/post
 * Permissions: `payment.view` · `payment.release` · `payment.approve`
 */
export function VendorPaymentsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveVendorPaymentCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PaymentFilterState>({ status: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<PaymentEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicVendorPayment | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as VendorPaymentStatus | undefined,
    }),
    [page, pageSize, search, projectId, filters.status],
  );

  const list = useVendorPaymentsList(
    listQuery,
    canView && Boolean(projectId),
  );
  const vendors = useVendorOptions('', canView && caps.canViewVendors);
  const submit = useSubmitVendorPayment();
  const approve = useApproveVendorPayment();
  const release = useReleaseVendorPayment();
  const verify = useVerifyVendorPayment();
  const post = usePostVendorPayment();
  const cancel = useCancelVendorPayment();

  const vendorLabel = (vendorId: string) => {
    const match = vendors.data?.find((v) => v.id === vendorId);
    if (!match) return vendorId.slice(-6);
    return [match.vendorCode, match.legalName].filter(Boolean).join(' — ');
  };

  const openDrawer = (
    mode: PaymentEntryMode,
    row: PublicVendorPayment | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  if (!access) return null;

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Vendor payments unavailable"
        message="You need payment.view to list vendor payments."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Vendor payments are scoped to the active project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="vendor-payments-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Vendor payments</Typography>
          <Typography variant="body2" color="text.secondary">
            Pay matched posted invoices with allocation and bank release
            {selectedProject
              ? ` · ${selectedProject.projectName ?? selectedProject.projectCode}`
              : ''}
            .
          </Typography>
        </div>
        {caps.canCreate ? (
          <Button
            variant="contained"
            onClick={() => openDrawer('create')}
            data-testid="vendor-payment-new"
          >
            New payment
          </Button>
        ) : null}
      </Stack>

      <PaymentTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
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
        filterSlot={
          <PaymentFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        vendorLabel={vendorLabel}
        onOpen={(row) => openDrawer('view', row)}
        onEdit={(row) => openDrawer('edit', row)}
        onUploadProof={(row) => {
          setActiveRow(row);
          setProofOpen(true);
        }}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success('Payment submitted for approval');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onApprove={async (row) => {
          try {
            await approve.mutateAsync(row.id);
            success('Payment approved (released)');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onRelease={async (row) => {
          try {
            await release.mutateAsync(row.id);
            success('Bank release recorded');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onVerify={async (row) => {
          try {
            await verify.mutateAsync(row.id);
            success('Payment verified');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onPost={async (row) => {
          try {
            await post.mutateAsync(row.id);
            success('Payment posted — AP / bank journal created');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={async (row) => {
          try {
            await cancel.mutateAsync(row.id);
            success('Payment cancelled');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
      />

      <PaymentFormDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setActiveRow(null);
        }}
        mode={drawerMode}
        projectId={projectId}
        payment={activeRow}
        canCreate={caps.canCreate}
        canViewBankAccounts={caps.canViewBankAccounts}
        canViewVendors={caps.canViewVendors}
        canViewInvoices={caps.canViewInvoices}
        vendorLabel={vendorLabel}
      />

      <PaymentProofPanel
        open={proofOpen}
        onClose={() => setProofOpen(false)}
        projectId={projectId}
        payment={activeRow}
        canUpload={caps.canUploadDocument && caps.canCreate}
      />
    </Stack>
  );
}
