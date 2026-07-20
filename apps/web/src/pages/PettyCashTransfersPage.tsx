import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { CancelTransferDialog } from '@/petty-cash-transfers/CancelTransferDialog';
import { ProofUploadPanel } from '@/petty-cash-transfers/ProofUploadPanel';
import {
  TransferFilters,
  type TransferFilterState,
} from '@/petty-cash-transfers/TransferFilters';
import { TransferForm } from '@/petty-cash-transfers/TransferForm';
import { TransferTable } from '@/petty-cash-transfers/TransferTable';
import { resolvePettyCashTransferCapabilities } from '@/petty-cash-transfers/roleAccess';
import type {
  PettyCashFundTransferStatus,
  PublicPettyCashFundTransfer,
} from '@/petty-cash-transfers/types';
import {
  useBankAccountOptions,
  useFundablePettyCashRequirements,
  usePettyCashFundTransfersList,
  usePostPettyCashFundTransfer,
  useVerifyPettyCashFundTransfer,
} from '@/petty-cash-transfers/usePettyCashTransfers';
import { canVerifyTransfer } from '@/petty-cash-transfers/workflowActions';

/**
 * Petty-cash fund transfers — `/accounting/petty-cash/transfers` (Micro Phase 050).
 *
 * Nest APIs under `/petty-cash-fund-transfers`.
 * Permissions: `petty_cash.view` / `petty_cash.fund` (create · verify · post · cancel).
 */
export function PettyCashTransfersPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolvePettyCashTransferCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError, warning } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TransferFilterState>({ status: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] =
    useState<PublicPettyCashFundTransfer | null>(null);
  const [proofTarget, setProofTarget] =
    useState<PublicPettyCashFundTransfer | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      status: (filters.status || undefined) as
        | PettyCashFundTransferStatus
        | undefined,
    }),
    [page, pageSize, filters.status],
  );

  const list = usePettyCashFundTransfersList(
    projectId,
    listQuery,
    canView && Boolean(projectId),
  );
  const fundable = useFundablePettyCashRequirements(
    projectId,
    canView && Boolean(projectId) && caps.canCreate,
  );
  const banks = useBankAccountOptions(
    projectId,
    canView && caps.canCreate && caps.canViewBankAccounts,
  );

  const verify = useVerifyPettyCashFundTransfer(projectId ?? '');
  const post = usePostPettyCashFundTransfer(projectId ?? '');

  const requestLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of fundable.data ?? []) {
      map.set(r.id, r.requestNumber);
    }
    return map;
  }, [fundable.data]);

  const bankOptions = useMemo(() => banks.data ?? [], [banks.data]);

  const rows = useMemo(() => {
    let items = list.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((r) =>
        r.transferNumber.toLowerCase().includes(q),
      );
    }
    return items;
  }, [list.data?.items, search]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Fund transfers unavailable"
        message="You need the petty_cash.view permission to manage petty-cash fund transfers."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Fund transfers denied"
        message="You do not have access to petty-cash fund transfers for this project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="petty-cash-transfers-page">
      <Typography color="text.secondary">
        Record approved cash funding
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Workflow: draft → verify → post (journal Dr Site Petty Cash / Cr Bank).
        Select a project in the header.
      </Typography>

      <TransferTable
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
          <TransferFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button
              variant="contained"
              disabled={!projectId}
              onClick={() => setCreateOpen(true)}
            >
              New fund transfer
            </Button>
          ) : undefined
        }
        caps={caps}
        requestLabel={(id) =>
          requestLabelById.get(id) ?? `…${id.slice(-8)}`
        }
        onVerify={async (row) => {
          if (!projectId) return;
          if (!canVerifyTransfer(row)) {
            warning(
              'Attach payment proof and transaction reference before verify.',
            );
            setProofTarget(row);
            return;
          }
          try {
            await verify.mutateAsync(row.id);
            success('Fund transfer verified');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onPost={async (row) => {
          if (!projectId) return;
          try {
            await post.mutateAsync({
              id: row.id,
              idempotencyKey: `pcft-post:${row.id}`,
            });
            success('Fund transfer posted to accounting');
            void list.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={(row) => setCancelTarget(row)}
        onProof={(row) => setProofTarget(row)}
      />

      {caps.canCreate && projectId ? (
        <TransferForm
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={projectId}
          requests={fundable.data ?? []}
          bankAccounts={bankOptions}
          canViewBankAccounts={caps.canViewBankAccounts}
          existingTransfers={list.data?.items ?? []}
          onCreated={(created) => setProofTarget(created)}
        />
      ) : null}

      {projectId ? (
        <>
          <CancelTransferDialog
            open={Boolean(cancelTarget)}
            onClose={() => setCancelTarget(null)}
            projectId={projectId}
            transfer={cancelTarget}
          />
          <ProofUploadPanel
            open={Boolean(proofTarget)}
            onClose={() => setProofTarget(null)}
            projectId={projectId}
            transfer={proofTarget}
            canUpload={caps.canUploadDocument}
          />
        </>
      ) : null}
    </Stack>
  );
}
