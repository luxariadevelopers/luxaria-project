import { useMemo, useState } from 'react';
import {
  Link as RouterLink,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { evaluateRouteProjectAccess } from '@/project-dashboard/routeProjectAccess';
import { InvestorProfitAllocationPanel } from '@/investor-portal/manage/InvestorProfitAllocationPanel';
import { canManageInvestorPortal } from '@/investor-portal/permissions';
import { CreateParticipantDrawer } from '@/project-participants/CreateParticipantDrawer';
import { CreateVersionDrawer } from '@/project-participants/CreateVersionDrawer';
import { EditDraftDrawer } from '@/project-participants/EditDraftDrawer';
import { ParticipantTable } from '@/project-participants/ParticipantTable';
import { ProfitShareTotalAlert } from '@/project-participants/ProfitShareTotalAlert';
import { resolveParticipantCapabilities } from '@/project-participants/roleAccess';
import {
  ParticipantApprovalStatus,
  type PublicProjectParticipant,
} from '@/project-participants/types';
import {
  useActiveParticipants,
  useParticipantConfiguration,
  useParticipantHistory,
} from '@/project-participants/useProjectParticipants';

/**
 * Project funding participants (Micro Phase 035).
 * Route: `/projects/:projectId/participants`
 *
 * APIs: list/create/update/versions + configuration/history.
 * Permissions: `project_participant.view` (+ create/update). No `manage` code.
 * Route project must equal the active authorised header project.
 */
export function ProjectParticipantsPage() {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveParticipantCapabilities(hasPermission);
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
  } = useProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [versionTarget, setVersionTarget] =
    useState<PublicProjectParticipant | null>(null);
  const [editTarget, setEditTarget] =
    useState<PublicProjectParticipant | null>(null);

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
    { status: ParticipantApprovalStatus.Draft, page: 1, limit: 50 },
    queryEnabled && caps.canManage,
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Participants unavailable"
        message="You need the project_participant.view permission to open project funding participants."
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
        message="You do not have access to this project. Choose an assigned project in the header, then open Participants again."
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
            : 'Activate this project in the header to view its funding participants.'
        }
        actionLabel={
          target ? `Switch to ${target.projectCode}` : undefined
        }
        onAction={
          target
            ? () => setSelectedProjectId(target.id)
            : undefined
        }
      />
    );
  }

  const listForbidden =
    activeQuery.isError && isForbiddenError(activeQuery.error);
  const configForbidden =
    configQuery.isError && isForbiddenError(configQuery.error);

  if (listForbidden || configForbidden) {
    return (
      <PermissionDenied
        title="Participants unavailable"
        message="The server denied access to project participants for this project (403)."
      />
    );
  }

  const projectId = routeProjectId!;
  const total =
    activeQuery.data?.totalProfitSharePercentage ??
    configQuery.data?.totalProfitSharePercentage ??
    0;
  const isBalanced =
    activeQuery.data?.isBalanced ?? configQuery.data?.isBalanced;
  const note =
    activeQuery.data?.note ??
    configQuery.data?.note ??
    'Active approved project profit shares (not company shareholding)';

  return (
    <Stack spacing={2} data-testid="project-participants-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Typography color="text.secondary">
          Project funding participants — directors, investors and other
          parties. Profit-share percentages are independent of company
          shareholding.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={`/projects/${routeProjectId}/profit-share`}
            size="small"
            variant="text"
          >
            Profit share
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

      {activeQuery.isError ? (
        <RetryPanel
          error={activeQuery.error}
          onRetry={() => void activeQuery.refetch()}
          forceRetry
        />
      ) : (
        <>
          <ProfitShareTotalAlert
            totalProfitSharePercentage={total}
            isBalanced={isBalanced}
            note={note}
            isFinalised={configQuery.data?.isFinalised}
          />

          <ParticipantTable
            title="Active participants"
            rows={activeQuery.data?.participants ?? []}
            loading={
              activeQuery.isLoading ||
              activeQuery.isFetching ||
              configQuery.isFetching
            }
            error={undefined}
            onRetry={() => void activeQuery.refetch()}
            canCreateVersion={caps.canCreate}
            onCreateVersion={setVersionTarget}
            toolbarActions={
              caps.canCreate ? (
                <Button
                  variant="contained"
                  onClick={() => setCreateOpen(true)}
                >
                  New participant
                </Button>
              ) : undefined
            }
          />
        </>
      )}

      {caps.canManage ? (
        draftsQuery.isError && !isForbiddenError(draftsQuery.error) ? (
          <RetryPanel
            error={draftsQuery.error}
            onRetry={() => void draftsQuery.refetch()}
            forceRetry
          />
        ) : (
          <ParticipantTable
            title="Draft participants"
            rows={draftsQuery.data?.items ?? []}
            loading={draftsQuery.isLoading || draftsQuery.isFetching}
            emptyTitle="No drafts"
            emptyDescription="Create a participant or a new version to start a draft."
            canUpdateDraft={caps.canUpdate}
            onEditDraft={setEditTarget}
          />
        )
      ) : null}

      {caps.canCreate ? (
        <CreateParticipantDrawer
          open={createOpen}
          projectId={projectId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void activeQuery.refetch();
            void draftsQuery.refetch();
            void configQuery.refetch();
          }}
        />
      ) : null}

      {caps.canCreate ? (
        <CreateVersionDrawer
          open={Boolean(versionTarget)}
          projectId={projectId}
          participant={versionTarget}
          onClose={() => setVersionTarget(null)}
          onCreated={() => {
            void draftsQuery.refetch();
            void configQuery.refetch();
          }}
        />
      ) : null}

      {caps.canUpdate ? (
        <EditDraftDrawer
          open={Boolean(editTarget)}
          projectId={projectId}
          participant={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            void draftsQuery.refetch();
          }}
        />
      ) : null}

      <InvestorProfitAllocationPanel
        projectId={projectId}
        participants={activeQuery.data?.participants ?? []}
        canManage={canManageInvestorPortal(hasPermission)}
      />
    </Stack>
  );
}

/** Nav entry: `/projects/participants` → active project's participants URL. */
export function ProjectParticipantsEntryPage() {
  const { selectedProjectId } = useProject();
  const { hasPermission, access } = useAuth();
  const caps = resolveParticipantCapabilities(hasPermission);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Participants unavailable"
        message="You need the project_participant.view permission to open project funding participants."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header, then open Participants again."
      />
    );
  }

  return (
    <Navigate to={`/projects/${selectedProjectId}/participants`} replace />
  );
}
