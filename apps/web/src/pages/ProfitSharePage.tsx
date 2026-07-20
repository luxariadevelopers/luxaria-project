import { useMemo, useState } from 'react';
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { evaluateRouteProjectAccess } from '@/project-dashboard/routeProjectAccess';
import { ProfitShareTotalAlert } from '@/project-participants/ProfitShareTotalAlert';
import {
  ParticipantApprovalStatus,
  type PublicProjectParticipant,
} from '@/project-participants/types';
import {
  useActiveParticipants,
  useApproveParticipant,
  useCreateParticipantVersion,
  useParticipantConfiguration,
  useParticipantHistory,
  useRejectParticipant,
  useSubmitParticipant,
  useUpdateParticipant,
} from '@/project-participants/useProjectParticipants';
import { AllocationGrid } from '@/profit-share/AllocationGrid';
import { validateProposedAllocation } from '@/profit-share/allocationValidation';
import {
  buildAllocationSchedule,
  type AllocationLine,
} from '@/profit-share/buildAllocationSchedule';
import { ProfitShareActions } from '@/profit-share/ProfitShareActions';
import { resolveProfitShareCapabilities } from '@/profit-share/roleAccess';
import { VersionComparisonView } from '@/profit-share/VersionComparisonView';

type DraftEdit = {
  approvedProfitSharePercentage: number;
  lossSharePercentage: number;
};

function applyLocalEdits(
  lines: AllocationLine[],
  localEdits: Record<string, DraftEdit>,
): AllocationLine[] {
  return lines.map((line) => {
    const id = line.pending?.id;
    if (!id || !localEdits[id]) return line;
    const edit = localEdits[id];
    return {
      ...line,
      proposedProfitShare: edit.approvedProfitSharePercentage,
      proposedLossShare: edit.lossSharePercentage,
      deltaProfitShare:
        edit.approvedProfitSharePercentage - line.approvedProfitShare,
    };
  });
}

/**
 * Profit-share version editor (Micro Phase 036).
 * Route: `/projects/:projectId/profit-share`
 *
 * APIs: participant versions / update draft / submit / approve / reject.
 * Permissions: `project_participant.view|create|update|submit|approve`
 * (no `profit_share.*` catalog codes).
 */
export function ProfitSharePage() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveProfitShareCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
  } = useProject();

  const [localEdits, setLocalEdits] = useState<Record<string, DraftEdit>>({});
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const accessibleIds = useMemo(
    () => projects.map((p) => p.id),
    [projects],
  );

  const routeAccess = evaluateRouteProjectAccess({
    routeProjectId,
    selectedProjectId,
    accessibleProjectIds: accessibleIds,
  });

  const queryEnabled = caps.canView && routeAccess === 'ok';
  const activeQuery = useActiveParticipants(routeProjectId, queryEnabled);
  const configQuery = useParticipantConfiguration(
    routeProjectId,
    queryEnabled,
  );
  const draftsQuery = useParticipantHistory(
    routeProjectId,
    { status: ParticipantApprovalStatus.Draft, page: 1, limit: 100 },
    queryEnabled,
  );
  const submittedQuery = useParticipantHistory(
    routeProjectId,
    { status: ParticipantApprovalStatus.Submitted, page: 1, limit: 100 },
    queryEnabled,
  );

  const createVersion = useCreateParticipantVersion(routeProjectId ?? '');
  const updateDraft = useUpdateParticipant(routeProjectId ?? '');
  const submitDraft = useSubmitParticipant(routeProjectId ?? '');
  const approve = useApproveParticipant(routeProjectId ?? '');
  const reject = useRejectParticipant(routeProjectId ?? '');

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Profit share unavailable"
        message="You need the project_participant.view permission to open the profit-share editor."
      />
    );
  }

  if (routeAccess === 'invalid_id') {
    return (
      <EmptyState
        title="Invalid project"
        description="The project id in the URL is not a valid identifier."
        actionLabel="Back to projects"
        onAction={() => navigate('/projects')}
      />
    );
  }

  if (routeAccess === 'unauthorised') {
    return (
      <PermissionDenied
        title="Project not authorised"
        message="You do not have access to this project. Choose an assigned project in the header, then open Profit Share again."
      />
    );
  }

  if (routeAccess === 'no_selection' || routeAccess === 'mismatch') {
    const target = projects.find((p) => p.id === routeProjectId);
    return (
      <EmptyState
        title={
          routeAccess === 'mismatch'
            ? 'Active project mismatch'
            : 'Select this project'
        }
        description={
          routeAccess === 'mismatch'
            ? `This page is for ${target?.projectCode ?? 'the requested project'}, but your active project is ${selectedProject?.projectCode ?? 'none'}. Switch the header project to continue.`
            : 'Activate this project in the header to edit profit share.'
        }
        actionLabel={
          target ? `Switch to ${target.projectCode}` : undefined
        }
        onAction={
          target ? () => setSelectedProjectId(target.id) : undefined
        }
      />
    );
  }

  const forbidden =
    (activeQuery.isError && isForbiddenError(activeQuery.error)) ||
    (draftsQuery.isError && isForbiddenError(draftsQuery.error)) ||
    (submittedQuery.isError && isForbiddenError(submittedQuery.error));

  if (forbidden) {
    return (
      <PermissionDenied
        title="Profit share unavailable"
        message="The server denied access to project participants for this project (403)."
      />
    );
  }

  if (activeQuery.isError) {
    return (
      <RetryPanel
        error={activeQuery.error}
        onRetry={() => void activeQuery.refetch()}
        forceRetry
      />
    );
  }

  const projectId = routeProjectId!;
  const pending: PublicProjectParticipant[] = [
    ...(draftsQuery.data?.items ?? []),
    ...(submittedQuery.data?.items ?? []),
  ];

  const baseLines = buildAllocationSchedule({
    active: activeQuery.data?.participants ?? [],
    pending,
  });
  const lines = applyLocalEdits(baseLines, localEdits);
  const validation = validateProposedAllocation(lines);

  const refresh = async () => {
    await Promise.all([
      activeQuery.refetch(),
      draftsQuery.refetch(),
      submittedQuery.refetch(),
      configQuery.refetch(),
    ]);
  };

  const startRevision = async () => {
    setActionBusy(true);
    try {
      const targets = baseLines.filter((line) => line.approved && !line.pending);
      for (const line of targets) {
        const approved = line.approved!;
        await createVersion.mutateAsync({
          recordId: approved.id,
          input: {
            commitmentAmount: approved.commitmentAmount,
            expectedContributionDate: approved.expectedContributionDate,
            actualContributionAmount: approved.actualContributionAmount,
            approvedProfitSharePercentage:
              approved.approvedProfitSharePercentage,
            lossSharePercentage: approved.lossSharePercentage,
            interestRate: approved.interestRate,
            instrumentType: approved.instrumentType,
            notes: 'Profit-share revision draft',
          },
        });
      }
      success(
        targets.length
          ? `Created ${targets.length} draft version${targets.length === 1 ? '' : 's'}`
          : 'No new drafts needed',
      );
      setLocalEdits({});
      await refresh();
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setActionBusy(false);
    }
  };

  const commitDraft = async (recordId: string, edit: DraftEdit) => {
    setBusyRecordId(recordId);
    try {
      await updateDraft.mutateAsync({
        recordId,
        input: {
          approvedProfitSharePercentage: edit.approvedProfitSharePercentage,
          lossSharePercentage: edit.lossSharePercentage,
        },
      });
      await refresh();
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setBusyRecordId(null);
    }
  };

  const submitDrafts = async () => {
    if (!validation.canSubmit) {
      notifyError(validation.message);
      return;
    }
    setActionBusy(true);
    try {
      const drafts = lines.filter((line) => line.isEditable && line.pending);
      for (const line of drafts) {
        await submitDraft.mutateAsync(line.pending!.id);
      }
      success(`Submitted ${drafts.length} draft version(s)`);
      setLocalEdits({});
      await refresh();
    } catch (err) {
      notifyError(getErrorMessage(err));
    } finally {
      setActionBusy(false);
    }
  };

  const loading =
    activeQuery.isLoading ||
    draftsQuery.isLoading ||
    submittedQuery.isLoading ||
    activeQuery.isFetching;

  return (
    <Stack spacing={2} data-testid="profit-share-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Typography color="text.secondary">
          Versioned project profit sharing. Approved schedules are immutable —
          changes create new draft versions that must be submitted and approved.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={`/projects/${projectId}/participants`}
            size="small"
            variant="text"
          >
            Participants
          </Button>
          <Button
            component={RouterLink}
            to="/projects"
            size="small"
            variant="text"
          >
            Projects list
          </Button>
        </Stack>
      </Stack>

      {configQuery.data?.isFinalised ? (
        <Alert severity="info" variant="outlined">
          Configuration is finalised. New drafts may require unfinalising on the
          server if active totals leave 100% after approval.
        </Alert>
      ) : null}

      <ProfitShareTotalAlert
        totalProfitSharePercentage={validation.total}
        isBalanced={validation.isBalanced}
        note={validation.message}
        isFinalised={configQuery.data?.isFinalised}
      />

      {loading ? (
        <Typography color="text.secondary">Loading allocation…</Typography>
      ) : (
        <>
          <AllocationGrid
            lines={lines}
            canUpdate={caps.canUpdate}
            busyRecordId={busyRecordId}
            localEdits={localEdits}
            onLocalEdit={(recordId, edit) =>
              setLocalEdits((prev) => ({ ...prev, [recordId]: edit }))
            }
            onCommitDraft={(recordId, edit) => {
              void commitDraft(recordId, edit);
            }}
          />

          <VersionComparisonView lines={lines} />

          <ProfitShareActions
            lines={lines}
            canCreate={caps.canCreate}
            canSubmit={caps.canSubmit}
            canApprove={caps.canApprove}
            submitEnabled={validation.canSubmit}
            busy={actionBusy || busyRecordId != null}
            onStartRevision={() => {
              void startRevision();
            }}
            onSubmitDrafts={() => {
              void submitDrafts();
            }}
            onApprove={async (recordId) => {
              setActionBusy(true);
              try {
                await approve.mutateAsync(recordId);
                success('Version approved — prior approved row closed');
                setLocalEdits({});
                await refresh();
              } catch (err) {
                notifyError(getErrorMessage(err));
              } finally {
                setActionBusy(false);
              }
            }}
            onReject={async (recordId, reason) => {
              setActionBusy(true);
              try {
                await reject.mutateAsync({
                  recordId,
                  rejectionReason: reason,
                });
                success('Version rejected');
                await refresh();
              } catch (err) {
                notifyError(getErrorMessage(err));
              } finally {
                setActionBusy(false);
              }
            }}
          />
        </>
      )}
    </Stack>
  );
}

/** Nav entry: `/projects/profit-share` → active project's editor. */
export function ProfitShareEntryPage() {
  const { selectedProjectId } = useProject();
  const { hasPermission, access } = useAuth();
  const caps = resolveProfitShareCapabilities(hasPermission);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Profit share unavailable"
        message="You need the project_participant.view permission to open the profit-share editor."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header, then open Profit Share again."
      />
    );
  }

  return (
    <Navigate to={`/projects/${selectedProjectId}/profit-share`} replace />
  );
}
