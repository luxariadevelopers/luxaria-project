import { useMemo, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { BankAccountDetailCards } from '@/bank-accounts/BankAccountDetailCards';
import { BankAccountStatusChip } from '@/bank-accounts/BankAccountStatusChip';
import { BankLedgerTable } from '@/bank-accounts/BankLedgerTable';
import { EditBankAccountDrawer } from '@/bank-accounts/EditBankAccountDrawer';
import {
  resolveBankAccountCapabilities,
  resolveBankAccountManageActions,
} from '@/bank-accounts/roleAccess';
import {
  useActivateBankAccount,
  useBankAccountBalance,
  useBankAccountDetail,
  useBankAccountLedger,
  useBankLedgerAccountOptions,
  useDeactivateBankAccount,
  useSetDefaultBankAccount,
} from '@/bank-accounts/useBankAccounts';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';

/**
 * Bank account detail — `/accounting/bank-accounts/:bankAccountId` (Phase 046).
 *
 * Nest: GET detail / balance / ledger; manage activate|deactivate|set-default|PATCH
 */
export function BankAccountDetailPage() {
  const { bankAccountId = '' } = useParams<{ bankAccountId: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveBankAccountCapabilities(hasPermission);
  const { projects } = useProject();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotify();

  const [editOpen, setEditOpen] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);

  const canView = Boolean(access) && caps.canView;
  const canPickLedger = Boolean(access) && hasPermission('account.view');

  const detailQuery = useBankAccountDetail(bankAccountId || null, canView);
  const balanceQuery = useBankAccountBalance(
    bankAccountId || null,
    canView && Boolean(detailQuery.data),
  );
  const ledgerQuery = useBankAccountLedger(
    bankAccountId || null,
    { page: ledgerPage, limit: ledgerPageSize },
    canView && Boolean(detailQuery.data),
  );
  const ledgers = useBankLedgerAccountOptions(
    canView && caps.canManage && canPickLedger,
  );

  const activate = useActivateBankAccount();
  const deactivate = useDeactivateBankAccount();
  const setDefault = useSetDefaultBankAccount();

  const account = detailQuery.data;
  const allowed = account
    ? resolveBankAccountManageActions(account.status, caps)
    : [];

  const projectLabel = useMemo(() => {
    if (!account?.projectId) return 'Company';
    const p = projects.find((x) => x.id === account.projectId);
    if (!p) return account.projectId;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  }, [account, projects]);

  const ledgerLabel = useMemo(() => {
    if (!account) return '—';
    const match = (ledgers.data ?? []).find(
      (a) => a.id === account.ledgerAccountId,
    );
    if (match) return `${match.accountCode} · ${match.accountName}`;
    return account.ledgerAccountId;
  }, [account, ledgers.data]);

  const projectOptions = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        label: p.projectCode
          ? `${p.projectCode} · ${p.projectName}`
          : p.projectName,
      })),
    [projects],
  );

  const ledgerOptions = useMemo(
    () =>
      (ledgers.data ?? []).map((a) => ({
        id: a.id,
        label: `${a.accountCode} · ${a.accountName}`,
      })),
    [ledgers.data],
  );

  const projectLabelFn = (id: string | null) => {
    if (!id) return '—';
    const p = projects.find((x) => x.id === id);
    if (!p) return id;
    return p.projectCode
      ? `${p.projectCode} · ${p.projectName}`
      : p.projectName;
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bank account unavailable"
        message="You need the bank.view permission to open bank account detail."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        error={detailQuery.error}
        title="Bank account denied"
        message="The server denied access to this bank account (403)."
      />
    );
  }

  const actions: EntityDetailAction[] = account
    ? [
        {
          id: 'edit',
          label: 'Edit',
          permission: 'bank.manage',
          allowedStatuses: ['active', 'inactive'],
          onClick: () => setEditOpen(true),
          disabled: !allowed.includes('edit'),
        },
        {
          id: 'activate',
          label: 'Activate',
          permission: 'bank.manage',
          allowedStatuses: ['inactive'],
          color: 'success',
          onClick: () => {
            void (async () => {
              try {
                await activate.mutateAsync(account.id);
                success('Bank account activated');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: activate.isPending,
          disabled: !allowed.includes('activate'),
        },
        {
          id: 'deactivate',
          label: 'Deactivate',
          permission: 'bank.manage',
          allowedStatuses: ['active'],
          color: 'warning',
          onClick: () => {
            void (async () => {
              try {
                await deactivate.mutateAsync(account.id);
                success('Bank account deactivated');
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: deactivate.isPending,
          disabled: !allowed.includes('deactivate'),
        },
        {
          id: 'set_default',
          label: 'Set default',
          permission: 'bank.manage',
          allowedStatuses: ['active'],
          onClick: () => {
            void (async () => {
              try {
                await setDefault.mutateAsync({
                  id: account.id,
                  input: { projectId: account.projectId },
                });
                success(
                  account.projectId
                    ? 'Default project bank account assigned'
                    : 'Default company bank account assigned',
                );
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: setDefault.isPending,
          disabled: !allowed.includes('set_default') || account.isDefault,
        },
      ]
    : [];

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={
          !detailQuery.isLoading && !detailQuery.error && !account
        }
        permissionTitle="Bank account unavailable"
        permissionMessage="You need the bank.view permission to open bank account detail."
        notFoundTitle="Bank account not found"
        notFoundDescription="This bank account id is invalid or the record was removed."
        header={
          account ? (
            <DetailHeader
              title={account.bankName}
              code={account.accountCode}
              subtitle={`${projectLabel} · ${account.maskedAccountNumber}`}
              backTo="/accounting/bank-accounts"
              backLabel="Bank accounts"
              meta={<BankAccountStatusChip status={account.status} />}
            />
          ) : undefined
        }
        actionBar={
          account ? (
            <EntityActionBar
              actions={actions}
              status={account.status}
              hasPermission={hasPermission}
              emptyHint="No activate / deactivate / set-default actions for this status and your permissions."
            />
          ) : undefined
        }
      >
        {account ? (
          <Stack spacing={3} data-testid="bank-account-detail-page">
            {balanceQuery.error && isForbiddenError(balanceQuery.error) ? (
              <PermissionDenied
                error={balanceQuery.error}
                title="Balance denied"
                message="You do not have permission to view bank balance."
                showHomeLink={false}
              />
            ) : null}
            {balanceQuery.error && !isForbiddenError(balanceQuery.error) ? (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void balanceQuery.refetch()}
                  >
                    Retry
                  </Button>
                }
              >
                {getErrorMessage(balanceQuery.error)}
              </Alert>
            ) : null}

            <BankAccountDetailCards
              account={account}
              balance={balanceQuery.data}
              balanceLoading={balanceQuery.isLoading}
              projectLabel={projectLabel}
              ledgerLabel={ledgerLabel}
              canViewSensitive={caps.canViewSensitive}
            />

            <Stack spacing={1}>
              <Typography variant="h6">Transaction ledger</Typography>
              <Typography variant="body2" color="text.secondary">
                Posted journal lines for the linked COA bank ledger
                (bank.view).
              </Typography>
              {ledgerQuery.error && isForbiddenError(ledgerQuery.error) ? (
                <PermissionDenied
                  error={ledgerQuery.error}
                  title="Ledger denied"
                  message="You do not have permission to view the bank ledger."
                  showHomeLink={false}
                />
              ) : (
                <BankLedgerTable
                  rows={ledgerQuery.data?.items ?? []}
                  loading={ledgerQuery.isLoading || ledgerQuery.isFetching}
                  error={
                    ledgerQuery.error && !isForbiddenError(ledgerQuery.error)
                      ? ledgerQuery.error
                      : undefined
                  }
                  onRetry={() => void ledgerQuery.refetch()}
                  page={ledgerPage}
                  pageSize={ledgerPageSize}
                  rowCount={ledgerQuery.data?.meta?.total ?? 0}
                  onPageChange={setLedgerPage}
                  onPageSizeChange={(size) => {
                    setLedgerPageSize(size);
                    setLedgerPage(1);
                  }}
                  projectLabel={projectLabelFn}
                  onOpenJournal={(journalId) =>
                    void navigate(`/accounting/journals/${journalId}`)
                  }
                />
              )}
            </Stack>
          </Stack>
        ) : null}
      </EntityDetailLayout>

      {account && caps.canManage ? (
        <EditBankAccountDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          account={account}
          projects={projectOptions}
          ledgerAccounts={ledgerOptions}
        />
      ) : null}
    </>
  );
}
