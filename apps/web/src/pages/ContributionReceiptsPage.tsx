import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { BalancesSummary } from '@/contribution-receipts/BalancesSummary';
import { CancelContributionReceiptDialog } from '@/contribution-receipts/CancelContributionReceiptDialog';
import {
  ContributionReceiptFilters,
  type ContributionReceiptFilterState,
} from '@/contribution-receipts/ContributionReceiptFilters';
import { ContributionReceiptTable } from '@/contribution-receipts/ContributionReceiptTable';
import { CreateContributionReceiptDrawer } from '@/contribution-receipts/CreateContributionReceiptDrawer';
import { ReceiptDocumentPanel } from '@/contribution-receipts/ReceiptDocumentPanel';
import { resolveContributionReceiptCapabilities } from '@/contribution-receipts/roleAccess';
import type {
  ContributionReceiptStatus,
  PublicContributionReceipt,
} from '@/contribution-receipts/types';
import {
  useBankAccountOptions,
  useContributionBalances,
  useContributionReceiptsList,
  usePostContributionReceipt,
  useSubmitContributionReceipt,
  useVerifyContributionReceipt,
} from '@/contribution-receipts/useContributionReceipts';
import { resolveUploadsUrl } from '@/print-pdf/resolveUploadsUrl';
import { CommitmentStatus } from '@/commitments/types';
import { useCommitmentsList } from '@/commitments/useCommitments';
import { useActiveParticipants } from '@/project-participants/useProjectParticipants';

/**
 * Contribution receipts — `/capital/contribution-receipts` (Micro Phase 039).
 *
 * Nest APIs under `/projects/:projectId/contribution-receipts`.
 * Permissions: `contribution_receipt.view/create/submit/verify/post/…`
 */
export function ContributionReceiptsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveContributionReceiptCapabilities(hasPermission);
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ContributionReceiptFilterState>({
    status: '',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] =
    useState<PublicContributionReceipt | null>(null);
  const [docTarget, setDocTarget] =
    useState<PublicContributionReceipt | null>(null);

  const canView = Boolean(access) && caps.canView;
  const projectId = selectedProjectId;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      status: (filters.status || undefined) as
        | ContributionReceiptStatus
        | undefined,
    }),
    [page, pageSize, filters.status],
  );

  const list = useContributionReceiptsList(
    projectId,
    listQuery,
    canView && Boolean(projectId),
  );
  const balances = useContributionBalances(
    projectId,
    undefined,
    canView && Boolean(projectId),
  );
  const participants = useActiveParticipants(
    projectId ?? undefined,
    canView && Boolean(projectId),
  );
  const commitments = useCommitmentsList(
    projectId,
    { page: 1, limit: 100, status: CommitmentStatus.Approved },
    canView && Boolean(projectId) && caps.canCreate,
  );
  const banks = useBankAccountOptions(
    canView && caps.canCreate && caps.canViewBankAccounts,
  );

  const submit = useSubmitContributionReceipt(projectId ?? '');
  const verify = useVerifyContributionReceipt(projectId ?? '');
  const post = usePostContributionReceipt(projectId ?? '');

  const participantLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants.data?.participants ?? []) {
      map.set(
        p.id,
        p.participantLabel?.trim() ||
          `${p.participantType} · …${p.participantId.slice(-6)}`,
      );
    }
    return map;
  }, [participants.data?.participants]);

  const commitmentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of commitments.data?.items ?? []) {
      map.set(c.id, `${c.commitmentNumber} v${c.version}`);
    }
    return map;
  }, [commitments.data?.items]);

  const participantOptions = useMemo(
    () =>
      (participants.data?.participants ?? []).map((p) => ({
        id: p.id,
        label:
          p.participantLabel?.trim() ||
          `${p.participantType} · …${p.participantId.slice(-6)}`,
      })),
    [participants.data?.participants],
  );

  const commitmentOptions = useMemo(
    () =>
      (commitments.data?.items ?? [])
        .filter((c) => c.pendingAmount > 0)
        .map((c) => ({
          id: c.id,
          label: `${c.commitmentNumber} v${c.version}`,
          pendingAmount: c.pendingAmount,
          participantId: c.participantId,
        })),
    [commitments.data?.items],
  );

  const bankOptions = useMemo(
    () => banks.data ?? [],
    [banks.data],
  );

  const rows = useMemo(() => {
    let items = list.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((r) =>
        r.receiptNumber.toLowerCase().includes(q),
      );
    }
    return items;
  }, [list.data?.items, search]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Contribution receipts unavailable"
        message="You need the contribution_receipt.view permission to manage funding receipts."
      />
    );
  }

  if (list.error && isForbiddenError(list.error)) {
    return (
      <PermissionDenied
        error={list.error}
        title="Contribution receipts denied"
        message="You do not have access to contribution receipts for this project."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Typography color="text.secondary">
        Project funding receipts
        {selectedProject ? ` — ${selectedProject.projectName}` : ''}.
        Director first investment posts as capital; later director money for a
        project posts as a director loan. Select the project in the header,
        then create a receipt against the matching commitment.
      </Typography>

      <BalancesSummary
        balances={balances.data}
        loading={balances.isLoading}
      />

      <ContributionReceiptTable
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
          <ContributionReceiptFilters
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
              New receipt
            </Button>
          ) : undefined
        }
        caps={caps}
        participantLabel={(id) =>
          participantLabelById.get(id) ?? `…${id.slice(-8)}`
        }
        commitmentLabel={(id) =>
          commitmentLabelById.get(id) ?? `…${id.slice(-8)}`
        }
        onSubmit={async (row) => {
          if (!projectId) return;
          try {
            await submit.mutateAsync(row.id);
            success('Receipt submitted');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onVerify={async (row) => {
          if (!projectId) return;
          try {
            await verify.mutateAsync(row.id);
            success('Receipt verified');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onPost={async (row) => {
          if (!projectId) return;
          try {
            await post.mutateAsync(row.id);
            success('Receipt posted — PDF generated');
            void list.refetch();
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={(row) => setCancelTarget(row)}
        onDocuments={(row) => setDocTarget(row)}
        onDownloadPdf={(row) => {
          const path = row.receiptPdfPath || row.receiptDocument;
          if (!path) {
            notifyError('No PDF available yet — post the receipt first.');
            return;
          }
          window.open(
            resolveUploadsUrl(path),
            '_blank',
            'noopener,noreferrer',
          );
        }}
      />

      {caps.canCreate && projectId ? (
        <CreateContributionReceiptDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={projectId}
          participants={participantOptions}
          commitments={commitmentOptions}
          bankAccounts={bankOptions}
          canViewBankAccounts={caps.canViewBankAccounts}
        />
      ) : null}

      {projectId ? (
        <>
          <CancelContributionReceiptDialog
            open={Boolean(cancelTarget)}
            onClose={() => setCancelTarget(null)}
            projectId={projectId}
            receipt={cancelTarget}
          />
          <ReceiptDocumentPanel
            open={Boolean(docTarget)}
            onClose={() => setDocTarget(null)}
            projectId={projectId}
            receipt={docTarget}
            canUpload={caps.canUploadDocument}
          />
        </>
      ) : null}
    </Stack>
  );
}
