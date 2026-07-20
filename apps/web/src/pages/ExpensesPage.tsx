import { useMemo, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { applyExpenseClientFilters } from '@/expenses/applyClientFilters';
import {
  ExpenseFilters,
  type ExpenseFilterState,
} from '@/expenses/ExpenseFilters';
import { ExpenseTable } from '@/expenses/ExpenseTable';
import { resolveExpenseCapabilities } from '@/expenses/roleAccess';
import type {
  PublicSiteExpenseVoucher,
  SiteExpenseVoucherStatus,
} from '@/expenses/types';
import {
  useApproveSiteExpenseVoucher,
  usePostSiteExpenseVoucher,
  useSiteExpenseVouchersList,
  useVerifySiteExpenseVoucher,
} from '@/expenses/useExpenses';
import { validateExpenseListFilters } from '@/expenses/validation';
import type { ExpenseRowActionId } from '@/expenses/workflowActions';

/**
 * Site expense voucher review list — `/accounting/expenses` (Micro Phase 052).
 *
 * Nest: `/site-expense-vouchers`
 * Permissions: `expense.view` · `expense.approve` (verify/approve) · `expense.post`
 * Detail UI: Phase 053.
 */
export function ExpensesPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveExpenseCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ExpenseFilterState>({
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [actionKind, setActionKind] = useState<ExpenseRowActionId | null>(null);
  const [actionRow, setActionRow] = useState<PublicSiteExpenseVoucher | null>(
    null,
  );

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const filterCheck = validateExpenseListFilters({
    projectId: projectId ?? undefined,
    status: filters.status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: projectId ?? undefined,
      status: (filters.status || undefined) as
        | SiteExpenseVoucherStatus
        | undefined,
    }),
    [page, pageSize, projectId, filters.status],
  );

  const list = useSiteExpenseVouchersList(
    listQuery,
    canView && Boolean(projectId) && filterCheck.ok,
  );

  const verify = useVerifySiteExpenseVoucher();
  const approve = useApproveSiteExpenseVoucher();
  const post = usePostSiteExpenseVoucher();

  const actionLoading =
    verify.isPending || approve.isPending || post.isPending;

  const rows = useMemo(() => {
    let items = applyExpenseClientFilters(list.data?.items ?? [], {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (r) =>
          r.voucherNumber.toLowerCase().includes(q) ||
          r.paidTo.toLowerCase().includes(q) ||
          (r.billNumber ?? '').toLowerCase().includes(q),
      );
    }
    return items;
  }, [list.data?.items, filters.dateFrom, filters.dateTo, search]);

  const openAction = (
    kind: ExpenseRowActionId,
    row: PublicSiteExpenseVoucher,
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
        case 'verify':
          await verify.mutateAsync(actionRow.id);
          success('Expense verified');
          break;
        case 'approve':
          await approve.mutateAsync(actionRow.id);
          success('Expense approved');
          break;
        case 'post':
          await post.mutateAsync(actionRow.id);
          success('Expense posted to accounting');
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
        title="Site expenses unavailable"
        message="You need the expense.view permission to review site expense vouchers."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Site expenses denied"
        message="You do not have access to site expense vouchers for this project."
      />
    );
  }

  const actionTitle =
    actionKind === 'verify'
      ? 'Verify expense'
      : actionKind === 'approve'
        ? 'Approve expense'
        : actionKind === 'post'
          ? 'Post expense'
          : '';

  const actionDescription =
    actionKind && actionRow
      ? `${actionTitle} ${actionRow.voucherNumber}? Posted vouchers cannot be edited.`
      : undefined;

  return (
    <Stack spacing={2} data-testid="expenses-page">
      <Typography color="text.secondary">
        Finance and project review of site expenses
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Duplicate bills, GPS out-of-radius, and missing evidence are highlighted.
        Select a project in the header. Posted vouchers are immutable.
      </Typography>

      {!filterCheck.ok ? (
        <Typography color="error" variant="body2">
          {filterCheck.message}
        </Typography>
      ) : null}

      <ExpenseTable
        rows={rows}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={
          search.trim() || filters.dateFrom || filters.dateTo
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
          <ExpenseFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        onVerify={(row) => openAction('verify', row)}
        onApprove={(row) => openAction('approve', row)}
        onPost={(row) => openAction('post', row)}
      />

      <ConfirmDialog
        open={Boolean(actionKind && actionRow)}
        title={actionTitle}
        description={actionDescription}
        confirmLabel={
          actionKind === 'post'
            ? 'Post'
            : actionKind === 'approve'
              ? 'Approve'
              : 'Verify'
        }
        loading={actionLoading}
        onConfirm={() => void runAction()}
        onCancel={closeAction}
      />
    </Stack>
  );
}
