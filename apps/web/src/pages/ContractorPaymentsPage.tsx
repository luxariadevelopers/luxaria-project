import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import {
  PaymentFilters,
  type PaymentFilterState,
} from '@/contractor-payments/PaymentFilters';
import {
  PaymentForm,
  type PaymentEntryMode,
} from '@/contractor-payments/PaymentForm';
import { PaymentProofPanel } from '@/contractor-payments/PaymentProofPanel';
import { PaymentTable } from '@/contractor-payments/PaymentTable';
import { resolveContractorPaymentCapabilities } from '@/contractor-payments/roleAccess';
import type {
  ContractorPaymentStatus,
  PublicContractorPayment,
} from '@/contractor-payments/types';
import {
  useApproveContractorPayment,
  useCancelContractorPayment,
  useContractorOptions,
  useContractorPaymentsList,
  usePostContractorPayment,
  useReleaseContractorPayment,
  useSubmitContractorPayment,
  useVerifyContractorPayment,
} from '@/contractor-payments/useContractorPayments';

/**
 * Contractor payments — `/contractors/payments` (Micro Phase 096).
 *
 * Nest: `/contractor-payments` create/approve/release/post
 * Permissions: `payment.view` · `payment.release` · `payment.approve`
 * (not `contractor_payment.*`)
 */
export function ContractorPaymentsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorPaymentCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<PaymentFilterState>({ status: '' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<PaymentEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicContractorPayment | null>(
    null,
  );
  const [proofOpen, setProofOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as
        | ContractorPaymentStatus
        | undefined,
    }),
    [page, pageSize, search, projectId, filters.status],
  );

  const list = useContractorPaymentsList(
    listQuery,
    canView && Boolean(projectId),
  );
  const contractors = useContractorOptions(
    '',
    canView && caps.canViewContractors,
  );
  const submit = useSubmitContractorPayment();
  const approve = useApproveContractorPayment();
  const release = useReleaseContractorPayment();
  const verify = useVerifyContractorPayment();
  const post = usePostContractorPayment();
  const cancel = useCancelContractorPayment();

  const contractorLabel = (contractorId: string) => {
    const match = contractors.data?.find((c) => c.id === contractorId);
    if (!match) return contractorId.slice(-6);
    return [match.contractorCode, match.legalName]
      .filter(Boolean)
      .join(' — ');
  };

  const openDrawer = (
    mode: PaymentEntryMode,
    row: PublicContractorPayment | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  if (!access) return null;

  if (!caps.canView) {
    return (
      <PermissionDenied
        title="Contractor payments unavailable"
        message="You need payment.view to list contractor payments."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Contractor payments are scoped to the active project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="contractor-payments-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Contractor payments</Typography>
          <Typography variant="body2" color="text.secondary">
            Pay posted running bills with allocation and bank release
            {selectedProject
              ? ` · ${selectedProject.projectName ?? selectedProject.projectCode}`
              : ''}
            .{' '}
            <Typography
              component={RouterLink}
              to="/contractors/running-bills"
              variant="body2"
              sx={{ color: 'inherit', fontWeight: 600 }}
            >
              Running bills
            </Typography>
          </Typography>
        </div>
        {caps.canCreate ? (
          <Button
            variant="contained"
            onClick={() => openDrawer('create')}
            data-testid="contractor-payment-new"
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
        contractorLabel={contractorLabel}
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
            success('Payment approved (released for bank)');
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
            success('Payment posted — contractor payable / bank journal created');
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

      <PaymentForm
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
        canViewContractors={caps.canViewContractors}
        canViewRunningBills={caps.canViewRunningBills}
        contractorLabel={contractorLabel}
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
