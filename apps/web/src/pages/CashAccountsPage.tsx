import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  CashAccountFilters,
  type CashAccountFilterState,
} from '@/cash-accounts/CashAccountFilters';
import { CashAccountTable } from '@/cash-accounts/CashAccountTable';
import { CashBalanceCards } from '@/cash-accounts/CashBalanceCards';
import { CloseCashAccountDialog } from '@/cash-accounts/CloseCashAccountDialog';
import { CreateCashAccountDrawer } from '@/cash-accounts/CreateCashAccountDrawer';
import { CustodianHandoverDialog } from '@/cash-accounts/CustodianHandoverDialog';
import { resolveCashAccountCapabilities } from '@/cash-accounts/roleAccess';
import type { PublicCashAccount } from '@/cash-accounts/types';
import {
  useCashAccountBalances,
  useCashAccountsList,
  useCashAccountUserOptions,
} from '@/cash-accounts/useCashAccounts';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';

type HandoverMode = 'transfer' | 'confirm' | 'cancel';

/**
 * Cash & petty-cash accounts — `/accounting/cash-accounts` (Micro Phase 047).
 *
 * Nest: `GET/POST /cash-accounts`, balance, transfer/confirm/cancel handover, close.
 * Permissions: `cash.view` / `cash.manage` (not `cash_account.*`).
 */
export function CashAccountsPage() {
  const { hasPermission, access, user } = useAuth();
  const caps = resolveCashAccountCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CashAccountFilterState>({
    kind: '',
    status: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [handoverMode, setHandoverMode] = useState<HandoverMode>('transfer');
  const [handoverTarget, setHandoverTarget] =
    useState<PublicCashAccount | null>(null);
  const [closeTarget, setCloseTarget] = useState<PublicCashAccount | null>(
    null,
  );

  const canView = Boolean(access) && caps.canView;
  const canViewUsers = Boolean(access) && hasPermission('user.view');
  const canViewAccounts = Boolean(access) && hasPermission('account.view');

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      kind: filters.kind || undefined,
      status: filters.status || undefined,
    }),
    [page, pageSize, selectedProjectId, filters.kind, filters.status],
  );

  const enabled = canView && Boolean(selectedProjectId);
  const list = useCashAccountsList(listQuery, enabled);
  const usersQuery = useCashAccountUserOptions(
    selectedProjectId,
    enabled && (caps.canManage || canViewUsers),
  );

  const rows = useMemo(() => {
    const items = list.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (row) =>
        row.accountCode.toLowerCase().includes(q) ||
        row.accountName.toLowerCase().includes(q),
    );
  }, [list.data?.items, search]);

  const balanceIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const balancesQuery = useCashAccountBalances(balanceIds, enabled);

  const balancesById = useMemo(() => {
    return new Map(
      (balancesQuery.data ?? []).map((b) => [b.cashAccountId, b]),
    );
  }, [balancesQuery.data]);

  const custodianLabel = useMemo(() => {
    const map = new Map(
      (usersQuery.data ?? []).map((u) => [
        u.id,
        u.fullName?.trim() || u.userCode || u.id,
      ]),
    );
    return (userId: string) => map.get(userId) ?? userId;
  }, [usersQuery.data]);

  const userOptions = (usersQuery.data ?? []).map((u) => ({
    id: u.id,
    label: u.fullName?.trim()
      ? `${u.fullName}${u.userCode ? ` · ${u.userCode}` : ''}`
      : u.userCode || u.id,
  }));

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Cash accounts unavailable"
        message="You need the cash.view permission to manage site cash and petty-cash accounts."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list site cash and petty-cash accounts."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Cash account list denied"
        message="You do not have permission to load cash accounts for this project."
      />
    );
  }

  const openHandover = (row: PublicCashAccount, mode: HandoverMode) => {
    setHandoverMode(mode);
    setHandoverTarget(row);
  };

  return (
    <Stack spacing={2} data-testid="cash-accounts-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography color="text.secondary">
          Site cash and petty-cash floats with custodian accountability. One
          active custodian per open account; changes require dual handover
          confirmation. Close requires a zero system balance.
        </Typography>
        {caps.canManage ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New cash account
          </Button>
        ) : null}
      </Stack>

      {list.error ? (
        <RetryPanel
          error={list.error}
          onRetry={() => void list.refetch()}
          forceRetry
        />
      ) : (
        <>
          <CashBalanceCards
            accounts={rows}
            balances={balancesQuery.data}
            loading={balancesQuery.isLoading || balancesQuery.isFetching}
          />

          <CashAccountTable
            rows={rows}
            balancesById={balancesById}
            loading={list.isLoading || list.isFetching}
            error={undefined}
            onRetry={() => void list.refetch()}
            page={listQuery.page ?? page}
            pageSize={listQuery.limit ?? pageSize}
            rowCount={Number(list.data?.meta?.total ?? rows.length)}
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
              <CashAccountFilters
                value={filters}
                onChange={(next) => {
                  setFilters(next);
                  setPage(1);
                }}
              />
            }
            caps={caps}
            currentUserId={user?.id}
            custodianLabel={custodianLabel}
            onTransfer={(row) => openHandover(row, 'transfer')}
            onConfirmHandover={(row) => openHandover(row, 'confirm')}
            onCancelHandover={(row) => openHandover(row, 'cancel')}
            onClose={setCloseTarget}
          />
        </>
      )}

      <CreateCashAccountDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        users={userOptions}
        canViewUsers={canViewUsers}
        canViewAccounts={canViewAccounts}
      />

      <CustodianHandoverDialog
        open={Boolean(handoverTarget)}
        onClose={() => setHandoverTarget(null)}
        mode={handoverMode}
        account={handoverTarget}
        balance={
          handoverTarget
            ? (balancesById.get(handoverTarget.id) ?? null)
            : null
        }
        users={userOptions}
        canViewUsers={canViewUsers}
        currentUserId={user?.id}
        custodianLabel={custodianLabel}
      />

      <CloseCashAccountDialog
        open={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        account={closeTarget}
        balance={
          closeTarget ? (balancesById.get(closeTarget.id) ?? null) : null
        }
      />
    </Stack>
  );
}
