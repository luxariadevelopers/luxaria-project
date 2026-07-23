import { useMemo, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { BankAccountFilters } from '@/bank-accounts/BankAccountFilters';
import { CreateBankAccountDrawer } from '@/bank-accounts/CreateBankAccountDrawer';
import { MaskedAccountTable } from '@/bank-accounts/MaskedAccountTable';
import { resolveBankAccountCapabilities } from '@/bank-accounts/roleAccess';
import {
  useBankAccountsList,
  useBankLedgerAccountOptions,
} from '@/bank-accounts/useBankAccounts';
import {
  defaultBankAccountFilters,
  validateBankAccountFilters,
  type BankAccountFilterState,
} from '@/bank-accounts/validation';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * Bank accounts list — `/accounting/bank-accounts` (Micro Phase 046).
 *
 * Nest: `GET /company-bank-accounts` — `bank.view` (masked only)
 * Create: `POST /company-bank-accounts` — `bank.manage`
 */
export function BankAccountsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBankAccountCapabilities(hasPermission);
  const { projects, selectedProjectId } = useProject();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<BankAccountFilterState>(() =>
    defaultBankAccountFilters(selectedProjectId ?? ''),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const canPickLedger = Boolean(access) && hasPermission('account.view');

  const validated = useMemo(
    () => validateBankAccountFilters({ filters, page, limit: pageSize }),
    [filters, page, pageSize],
  );

  const list = useBankAccountsList(validated.api, canView && validated.ready);
  const ledgers = useBankLedgerAccountOptions(
    canView && caps.canManage && canPickLedger,
  );

  const projectLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) {
      map.set(
        p.id,
        p.projectCode
          ? `${p.projectCode} · ${p.projectName}`
          : p.projectName,
      );
    }
    return map;
  }, [projects]);

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

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Bank accounts unavailable"
        message="You need the bank.view permission to open bank accounts."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Bank account list denied"
        message="You do not have permission to load bank accounts."
      />
    );
  }

  const applyFilters = (next: BankAccountFilterState) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <Stack spacing={2} data-testid="bank-accounts-page">
      <PageHeader
        title="Bank accounts"
        subtitle="Company and project bank accounts. Account numbers are always masked in the list."
        actions={
          caps.canManage ? (
            <Button
              variant="contained"
              onClick={() => setCreateOpen(true)}
              disabled={!canPickLedger}
            >
              New bank account
            </Button>
          ) : undefined
        }
      />

      {caps.canManage && !canPickLedger ? (
        <Alert severity="warning">
          Creating accounts also needs account.view to pick a Bank-category
          ledger from the chart of accounts.
        </Alert>
      ) : null}

      {list.error && !isForbiddenError(list.error) ? (
        <RetryPanel
          error={list.error}
          onRetry={() => void list.refetch()}
          forceRetry
        />
      ) : null}

      {!list.isLoading &&
      !list.error &&
      (list.data?.items.length ?? 0) === 0 &&
      !filters.search &&
      !filters.status &&
      !filters.projectId &&
      !filters.companyOnly ? (
        <EmptyState
          title="No bank accounts yet"
          description={
            caps.canManage
              ? 'Create a company or project bank account to begin.'
              : 'No bank accounts are available for your access.'
          }
          actionLabel={
            caps.canManage && canPickLedger ? 'New bank account' : undefined
          }
          onAction={
            caps.canManage && canPickLedger
              ? () => setCreateOpen(true)
              : undefined
          }
        />
      ) : (
        <MaskedAccountTable
          rows={list.data?.items ?? []}
          loading={list.isLoading || list.isFetching}
          error={undefined}
          onRetry={() => void list.refetch()}
          page={page}
          pageSize={pageSize}
          rowCount={list.data?.meta?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          projectLabel={(id) =>
            id ? (projectLabelById.get(id) ?? id) : 'Company'
          }
          onOpen={(row) =>
            void navigate(`/accounting/bank-accounts/${row.id}`)
          }
          filterSlot={
            <BankAccountFilters
              value={filters}
              onChange={applyFilters}
              projects={projects}
              fieldErrors={validated.fieldErrors}
            />
          }
        />
      )}

      {caps.canManage ? (
        <CreateBankAccountDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projects={projectOptions}
          ledgerAccounts={ledgerOptions}
          defaultProjectId={
            filters.companyOnly ? '' : filters.projectId || ''
          }
        />
      ) : null}
    </Stack>
  );
}
