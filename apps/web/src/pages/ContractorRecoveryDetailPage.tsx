import { useMemo, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  DetailHeader,
  EntityActionBar,
  EntityDetailLayout,
  SummaryCards,
  type EntityDetailAction,
} from '@/components/entity-detail';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import { PostRecoveryDialog } from '@/contractor-recoveries/PostRecoveryDialog';
import {
  recoveryStatusLabel,
  recoveryTypeLabel,
} from '@/contractor-recoveries/labels';
import { resolveContractorRecoveryCapabilities } from '@/contractor-recoveries/roleAccess';
import {
  useApproveContractorRecovery,
  useContractorRecoveryDetail,
} from '@/contractor-recoveries/useContractorRecoveries';
import { resolveContractorRecoveryActions } from '@/contractor-recoveries/workflowActions';

/**
 * Contractor recovery detail — `/contractor-recoveries/:id`.
 * Approve draft · post approved (optional bill).
 */
export function ContractorRecoveryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasPermission, access } = useAuth();
  const caps = resolveContractorRecoveryCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();
  const [postOpen, setPostOpen] = useState(false);

  const canView = Boolean(access) && caps.canView;
  const projectReady = Boolean(selectedProjectId);

  const detailQuery = useContractorRecoveryDetail(
    id || undefined,
    canView && projectReady,
  );
  const row = detailQuery.data;
  const approve = useApproveContractorRecovery();

  const summaryFields = useMemo(() => {
    if (!row) return [];
    return [
      { id: 'amount', label: 'Amount', value: formatInr(row.amount) },
      { id: 'type', label: 'Type', value: recoveryTypeLabel(row.type) },
      {
        id: 'contractor',
        label: 'Contractor',
        value: row.contractorId,
      },
      {
        id: 'workOrder',
        label: 'Work order',
        value: row.workOrderId ?? '—',
      },
      { id: 'bill', label: 'Bill', value: row.billId ?? '—' },
      {
        id: 'approved',
        label: 'Approved',
        value: row.approvedAt ? formatDate(row.approvedAt) : '—',
      },
      {
        id: 'posted',
        label: 'Posted',
        value: row.postedAt ? formatDate(row.postedAt) : '—',
      },
    ];
  }, [row]);

  const allowed = row ? resolveContractorRecoveryActions(row, caps) : [];

  const actions: EntityDetailAction[] = row
    ? [
        {
          id: 'approve',
          label: 'Approve',
          permission: 'contractor_recovery.manage',
          allowedStatuses: ['draft'],
          color: 'success',
          variant: 'contained',
          onClick: () => {
            void (async () => {
              try {
                await approve.mutateAsync(row.id);
                success('Recovery approved');
                await detailQuery.refetch();
              } catch (err) {
                notifyError(getErrorMessage(err));
              }
            })();
          },
          loading: approve.isPending,
          disabled: !allowed.includes('approve') || approve.isPending,
        },
        {
          id: 'post',
          label: 'Post',
          permission: 'contractor_recovery.manage',
          allowedStatuses: ['approved'],
          onClick: () => setPostOpen(true),
          disabled: !allowed.includes('post'),
        },
      ]
    : [];

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Recovery unavailable"
        message="You need the contractor_recovery.view permission."
      />
    );
  }

  if (detailQuery.isError && isForbiddenError(detailQuery.error)) {
    return (
      <PermissionDenied
        title="Recovery denied"
        message="The server denied access to this recovery (403)."
      />
    );
  }

  if (row && selectedProjectId && row.projectId !== selectedProjectId) {
    return (
      <PermissionDenied
        title="Wrong project"
        message="This recovery belongs to another project. Switch the active project in the header."
        showHomeLink={false}
      />
    );
  }

  return (
    <>
      <EntityDetailLayout
        canView={canView}
        projectReady={projectReady}
        loading={detailQuery.isLoading}
        error={detailQuery.error}
        onRetry={() => void detailQuery.refetch()}
        notFound={!detailQuery.isLoading && !detailQuery.error && !row}
        permissionTitle="Recovery unavailable"
        permissionMessage="You need contractor_recovery.view to open recoveries."
        projectMissingTitle="Project required"
        projectMissingDescription="Select a project before opening recoveries."
        notFoundTitle="Recovery not found"
        notFoundDescription="This recovery may belong to another project or the id is invalid."
        header={
          row ? (
            <DetailHeader
              title={recoveryTypeLabel(row.type)}
              code={row.id.slice(-8)}
              subtitle={recoveryStatusLabel(row.status)}
              backTo="/contractor-recoveries"
              backLabel="Recoveries"
              meta={
                <Chip
                  size="small"
                  label={recoveryStatusLabel(row.status)}
                  color={
                    row.status === 'posted'
                      ? 'success'
                      : row.status === 'approved'
                        ? 'info'
                        : 'warning'
                  }
                />
              }
            />
          ) : undefined
        }
        actionBar={
          row ? (
            <EntityActionBar
              actions={actions}
              status={row.status}
              hasPermission={hasPermission}
            />
          ) : undefined
        }
        summary={row ? <SummaryCards fields={summaryFields} /> : undefined}
      >
        {row ? (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {row.description ? (
              <Typography variant="body1">{row.description}</Typography>
            ) : null}
            {row.notes ? (
              <Typography variant="body2" color="text.secondary">
                Notes: {row.notes}
              </Typography>
            ) : null}
            {row.materialReconciliationId ? (
              <Typography variant="body2" color="text.secondary">
                Material reconciliation: {row.materialReconciliationId}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
      </EntityDetailLayout>

      <PostRecoveryDialog
        open={postOpen}
        onClose={() => setPostOpen(false)}
        recovery={row ?? null}
      />
    </>
  );
}
