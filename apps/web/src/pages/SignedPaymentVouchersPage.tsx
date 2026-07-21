import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { resolveSignedPaymentVoucherCapabilities } from '@/signed-payment-vouchers/roleAccess';
import {
  SIGNED_PAYMENT_VOUCHER_TYPE,
  type PublicSignedPaymentVoucher,
  type SignedPaymentVoucherStatus,
} from '@/signed-payment-vouchers/types';
import {
  useApproveSignedPaymentVoucher,
  usePostSignedPaymentVoucher,
  useSignedPaymentVouchersList,
} from '@/signed-payment-vouchers/useSignedPaymentVouchers';
import {
  VoucherFilters,
  type VoucherFilterState,
} from '@/signed-payment-vouchers/VoucherFilters';
import { VoucherTable } from '@/signed-payment-vouchers/VoucherTable';
import type { SignedPaymentVoucherRowActionId } from '@/signed-payment-vouchers/workflowActions';

/**
 * Signed labour payment vouchers — `/contractors/signed-vouchers`.
 *
 * Nest: `/signed-payment-vouchers?voucherType=labour`
 * Permissions: `payment.view` · `payment.release` · `payment.approve`
 */
export function SignedPaymentVouchersPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveSignedPaymentVoucherCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<VoucherFilterState>({ status: '' });
  const [actionKind, setActionKind] =
    useState<SignedPaymentVoucherRowActionId | null>(null);
  const [actionRow, setActionRow] = useState<PublicSignedPaymentVoucher | null>(
    null,
  );

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      voucherType: SIGNED_PAYMENT_VOUCHER_TYPE.Labour,
      status: (filters.status || undefined) as
        | SignedPaymentVoucherStatus
        | undefined,
    }),
    [page, pageSize, projectId, filters.status],
  );

  const list = useSignedPaymentVouchersList(
    listQuery,
    canView && Boolean(projectId),
  );

  const approve = useApproveSignedPaymentVoucher();
  const post = usePostSignedPaymentVoucher();

  const actionLoading = approve.isPending || post.isPending;

  const rows = useMemo(() => {
    let items = list.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (r) =>
          r.voucherNumber.toLowerCase().includes(q) ||
          r.recipientName.toLowerCase().includes(q) ||
          r.workDescription.toLowerCase().includes(q),
      );
    }
    return items;
  }, [list.data?.items, search]);

  const openAction = (
    kind: SignedPaymentVoucherRowActionId,
    row: PublicSignedPaymentVoucher,
  ) => {
    setActionKind(kind);
    setActionRow(row);
  };

  const closeAction = () => {
    setActionKind(null);
    setActionRow(null);
  };

  const runAction = async () => {
    if (!actionKind || !actionRow) return;
    try {
      switch (actionKind) {
        case 'approve':
          await approve.mutateAsync(actionRow.id);
          success('Voucher approved — PDF generated');
          break;
        case 'post':
          await post.mutateAsync(actionRow.id);
          success('Voucher posted to accounting');
          break;
      }
      closeAction();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Signed vouchers unavailable"
        message="You need the payment.view permission to review signed payment vouchers."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Signed vouchers denied"
        message="You do not have access to signed payment vouchers for this project."
      />
    );
  }

  const actionTitle =
    actionKind === 'approve'
      ? 'Approve voucher'
      : actionKind === 'post'
        ? 'Post voucher'
        : '';

  const actionDescription =
    actionKind && actionRow
      ? `${actionTitle} ${actionRow.voucherNumber}? Approve generates the PDF voucher.`
      : undefined;

  return (
    <Stack spacing={2} data-testid="signed-payment-vouchers-page">
      <Typography color="text.secondary">
        Review labour payment vouchers captured on mobile
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Approve generates a PDF; post creates the petty-cash journal entry.
        Select a project in the header.
      </Typography>

      <VoucherTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={
          search.trim()
            ? rows.length
            : (list.data?.meta?.total ?? rows.length)
        }
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
          <VoucherFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        onApprove={(row) => openAction('approve', row)}
        onPost={(row) => openAction('post', row)}
      />

      <ConfirmDialog
        open={Boolean(actionKind && actionRow)}
        title={actionTitle}
        description={actionDescription}
        confirmLabel={actionKind === 'post' ? 'Post' : 'Approve'}
        loading={actionLoading}
        onConfirm={() => void runAction()}
        onCancel={closeAction}
      />
    </Stack>
  );
}
