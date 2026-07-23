import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { AmendCommitmentDialog } from '@/commitments/AmendCommitmentDialog';
import {
  applyCommitmentClientFilters,
  type CommitmentClientFilters,
} from '@/commitments/applyClientFilters';
import { CancelCommitmentDialog } from '@/commitments/CancelCommitmentDialog';
import { CommitmentAmountSummary } from '@/commitments/CommitmentAmountSummary';
import {
  CommitmentFilters,
  type CommitmentFilterState,
} from '@/commitments/CommitmentFilters';
import { CommitmentTable } from '@/commitments/CommitmentTable';
import { CreateCommitmentDrawer } from '@/commitments/CreateCommitmentDrawer';
import { resolveCommitmentCapabilities } from '@/commitments/roleAccess';
import type {
  CommitmentStatus,
  PublicCommitment,
} from '@/commitments/types';
import {
  useApproveCommitment,
  useCommitmentSummary,
  useCommitmentsList,
  useSubmitCommitment,
} from '@/commitments/useCommitments';
import { useActiveParticipants } from '@/project-participants/useProjectParticipants';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * Contribution commitments list with deep links to detail (Micro Phase 038).
 * Route: `/capital/commitments` — APIs are project-scoped.
 */
export function CommitmentsPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveCommitmentCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CommitmentFilterState>({
    status: '',
    amendment: 'current',
    overdueOnly: false,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [amendTarget, setAmendTarget] = useState<PublicCommitment | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<PublicCommitment | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      status: (filters.status || undefined) as CommitmentStatus | undefined,
    }),
    [page, pageSize, filters.status],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const commitmentsQuery = useCommitmentsList(
    selectedProjectId,
    listQuery,
    enabled,
  );
  const summaryQuery = useCommitmentSummary(
    selectedProjectId,
    undefined,
    enabled,
  );
  const participantsQuery = useActiveParticipants(
    selectedProjectId ?? undefined,
    enabled && caps.canCreate,
  );

  const submit = useSubmitCommitment(selectedProjectId ?? '');
  const approve = useApproveCommitment(selectedProjectId ?? '');

  const participantLabel = useMemo(() => {
    const map = new Map(
      (participantsQuery.data?.participants ?? []).map((p) => [
        p.id,
        p.participantLabel?.trim() || p.id,
      ]),
    );
    return (participantId: string) => map.get(participantId) ?? participantId;
  }, [participantsQuery.data]);

  const rows = useMemo(() => {
    const clientFilters: CommitmentClientFilters = {
      overdueOnly: filters.overdueOnly,
      amendment: filters.amendment,
    };
    const items = commitmentsQuery.data?.items ?? [];
    const filtered = applyCommitmentClientFilters(items, clientFilters);
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((row) =>
      row.commitmentNumber.toLowerCase().includes(q),
    );
  }, [
    commitmentsQuery.data?.items,
    filters.overdueOnly,
    filters.amendment,
    search,
  ]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Commitments unavailable"
        message="You need the contribution_commitment.view permission to manage contribution commitments."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list contribution commitments."
      />
    );
  }

  const participantOptions = (
    participantsQuery.data?.participants ?? []
  ).map((p) => ({
    id: p.id,
    label: p.participantLabel?.trim() || p.participantId,
  }));

  const openDetail = (row: PublicCommitment) => {
    navigate(`/capital/commitments/${row.id}`);
  };

  return (
    <Stack spacing={2} data-testid="commitments-page">
      <PageHeader
        title="Commitments"
        subtitle="Project contribution commitments — open a row for schedule, documents, version history and lifecycle actions."
        actions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New commitment
            </Button>
          ) : undefined
        }
      />

      <CommitmentAmountSummary
        summary={summaryQuery.data}
        loading={summaryQuery.isLoading || summaryQuery.isFetching}
      />

      <CommitmentTable
        rows={rows}
        loading={
          commitmentsQuery.isLoading || commitmentsQuery.isFetching
        }
        error={commitmentsQuery.error}
        onRetry={() => void commitmentsQuery.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={commitmentsQuery.data?.meta?.total ?? rows.length}
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
          <CommitmentFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        participantLabel={participantLabel}
        onOpenDetail={openDetail}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success('Commitment submitted');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onApprove={async (row) => {
          try {
            await approve.mutateAsync(row.id);
            success('Commitment approved');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onAmend={(row) => setAmendTarget(row)}
        onCancel={(row) => setCancelTarget(row)}
      />

      {caps.canCreate ? (
        <CreateCommitmentDrawer
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={selectedProjectId}
          participants={participantOptions}
        />
      ) : null}

      <AmendCommitmentDialog
        open={Boolean(amendTarget)}
        onClose={() => setAmendTarget(null)}
        projectId={selectedProjectId}
        commitment={amendTarget}
      />
      <CancelCommitmentDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        projectId={selectedProjectId}
        commitment={cancelTarget}
      />
    </Stack>
  );
}
