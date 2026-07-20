import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  countActiveBoqVersions,
  findActiveBoqVersion,
} from '@/boq/activation';
import { ApproveVersionDialog } from '@/boq/ApproveVersionDialog';
import { CreateVersionDialog } from '@/boq/CreateVersionDialog';
import { RejectVersionDialog } from '@/boq/RejectVersionDialog';
import { BOQ_ROUTES } from '@/boq/routes';
import { resolveBoqCapabilities } from '@/boq/roleAccess';
import {
  useActivateBoqVersion,
  useApproveBoqVersion,
  useBoqVersionCompare,
  useBoqVersions,
  useCreateBoqVersion,
  useRejectBoqVersion,
  useSubmitBoqVersion,
} from '@/boq/useBoq';
import { VersionCompareView } from '@/boq/VersionCompareView';
import { VersionTable } from '@/boq/VersionTable';
import type { PublicBoqVersion } from '@/boq/types';
import type { BoqVersionActionId } from '@/boq/workflowActions';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import type {
  ApproveBoqVersionFormValues,
  CreateBoqVersionFormValues,
  RejectBoqVersionFormValues,
} from '@/boq/validation';

/**
 * BOQ versions / variations / change orders (Micro Phase 080).
 * Route: `/project-control/boq/versions`
 */
export function BoqVersionsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveBoqCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [createOpen, setCreateOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<PublicBoqVersion | null>(
    null,
  );
  const [rejectTarget, setRejectTarget] = useState<PublicBoqVersion | null>(
    null,
  );
  const [compareFromId, setCompareFromId] = useState<string>('');
  const [compareToId, setCompareToId] = useState<string>('');

  const enabled = caps.canView && Boolean(selectedProjectId);
  const versionsQuery = useBoqVersions(selectedProjectId, enabled);
  const versions = useMemo(
    () => versionsQuery.data ?? [],
    [versionsQuery.data],
  );

  const compareQuery = useBoqVersionCompare(
    selectedProjectId,
    compareFromId || undefined,
    compareToId || undefined,
    enabled && Boolean(compareFromId) && Boolean(compareToId),
  );

  const create = useCreateBoqVersion(selectedProjectId ?? '');
  const submit = useSubmitBoqVersion(selectedProjectId ?? '');
  const activate = useActivateBoqVersion(selectedProjectId ?? '');
  const approve = useApproveBoqVersion(selectedProjectId ?? '');
  const reject = useRejectBoqVersion(selectedProjectId ?? '');

  const activeCount = useMemo(
    () => countActiveBoqVersions(versions),
    [versions],
  );
  const active = useMemo(() => findActiveBoqVersion(versions), [versions]);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="BOQ versions"
        message="Requires boq.view. Manage/activate need boq.manage; approve/reject need boq.approve (not boq_version.*)."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="BOQ versions are project-scoped. Choose an active project in the header."
      />
    );
  }

  const onAction = async (
    action: BoqVersionActionId,
    version: PublicBoqVersion,
  ) => {
    try {
      if (action === 'submit') {
        await submit.mutateAsync(version.id);
        success('BOQ version submitted for approval');
        return;
      }
      if (action === 'activate') {
        await activate.mutateAsync({ id: version.id });
        success('BOQ version activated (previous active superseded)');
        return;
      }
      if (action === 'approve') {
        setApproveTarget(version);
        return;
      }
      if (action === 'reject') {
        setRejectTarget(version);
        return;
      }
      if (action === 'compare') {
        if (!compareFromId) setCompareFromId(version.id);
        else setCompareToId(version.id);
      }
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onCreate = async (values: CreateBoqVersionFormValues) => {
    try {
      await create.mutateAsync({
        versionType: values.versionType,
        effectiveDate: values.effectiveDate,
        reason: values.reason,
        basedOnVersionId: values.basedOnVersionId || undefined,
        timeImpact:
          values.timeImpact === undefined || values.timeImpact === null
            ? undefined
            : Number(values.timeImpact),
        costImpact:
          values.costImpact === undefined || values.costImpact === null
            ? undefined
            : Number(values.costImpact),
      });
      success('Draft BOQ version created');
      setCreateOpen(false);
    } catch (err) {
      notifyError(getErrorMessage(err));
      throw err;
    }
  };

  const onApprove = async (values: ApproveBoqVersionFormValues) => {
    if (!approveTarget) return;
    try {
      await approve.mutateAsync({
        id: approveTarget.id,
        input: {
          approvalReference: values.approvalReference,
          comment: values.comment ?? null,
        },
      });
      success('BOQ version approved and activated');
      setApproveTarget(null);
    } catch (err) {
      notifyError(getErrorMessage(err));
      throw err;
    }
  };

  const onReject = async (values: RejectBoqVersionFormValues) => {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync({
        id: rejectTarget.id,
        input: { reason: values.reason },
      });
      success('BOQ version rejected');
      setRejectTarget(null);
    } catch (err) {
      notifyError(getErrorMessage(err));
      throw err;
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader
        title="BOQ Versions"
        subtitle="Revisions, variations and change orders — one active approved version per project."
        actions={
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to={BOQ_ROUTES.list}>
              BOQ list
            </Button>
            <Button component={RouterLink} to={BOQ_ROUTES.itemCreate}>
              New item
            </Button>
            {caps.canManage && (
              <Button
                variant="contained"
                onClick={() => setCreateOpen(true)}
              >
                Create version
              </Button>
            )}
          </Stack>
        }
      />

      {activeCount > 1 && (
        <Alert severity="error">
          Data inconsistency: {activeCount} active versions. Nest enforces a
          single active version — refresh or contact support.
        </Alert>
      )}

      {active && (
        <Typography variant="body2" color="text.secondary">
          Active: v{active.versionNumber} ({active.versionType}) — total{' '}
          planned value is server-authoritative.
        </Typography>
      )}

      {versionsQuery.isLoading && (
        <Stack sx={{ alignItems: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Stack>
      )}

      {versionsQuery.isError &&
        (isForbiddenError(versionsQuery.error) ? (
          <PermissionDenied
            title="BOQ versions"
            message={getErrorMessage(versionsQuery.error)}
          />
        ) : (
          <RetryPanel
            error={versionsQuery.error}
            onRetry={() => void versionsQuery.refetch()}
            forceRetry
          />
        ))}

      {!versionsQuery.isLoading && !versionsQuery.isError && (
        <VersionTable
          versions={versions}
          caps={caps}
          onAction={(action, row) => void onAction(action, row)}
          compareFromId={compareFromId}
          compareToId={compareToId}
          onSelectCompare={(slot, versionId) => {
            if (slot === 'from') setCompareFromId(versionId);
            else setCompareToId(versionId);
          }}
        />
      )}

      {compareFromId && compareToId && (
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Typography variant="subtitle1">Comparison</Typography>
            <Button
              size="small"
              onClick={() => {
                setCompareFromId('');
                setCompareToId('');
              }}
            >
              Clear
            </Button>
          </Stack>
          {compareQuery.isLoading && <CircularProgress size={24} />}
          {compareQuery.isError && (
            <RetryPanel
              error={compareQuery.error}
              onRetry={() => void compareQuery.refetch()}
              forceRetry
            />
          )}
          {compareQuery.data && (
            <VersionCompareView comparison={compareQuery.data} />
          )}
        </Stack>
      )}

      <CreateVersionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreate}
        versions={versions}
        submitting={create.isPending}
      />
      <ApproveVersionDialog
        open={Boolean(approveTarget)}
        version={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSubmit={onApprove}
        submitting={approve.isPending}
      />
      <RejectVersionDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onSubmit={onReject}
        submitting={reject.isPending}
      />
    </Stack>
  );
}
