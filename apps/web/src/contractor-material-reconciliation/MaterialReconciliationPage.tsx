import { useState } from 'react';
import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { MaterialReconciliationFormDrawer } from '@/contractor-material-reconciliation/MaterialReconciliationFormDrawer';
import { PostToBillDialog } from '@/contractor-material-reconciliation/PostToBillDialog';
import { resolveMaterialReconciliationCapabilities } from '@/contractor-material-reconciliation/roleAccess';
import type { PublicMaterialReconciliation } from '@/contractor-material-reconciliation/api';
import {
  useApproveMaterialReconciliation,
  useMaterialReconciliationsList,
  usePostMaterialReconciliationToBill,
} from '@/contractor-material-reconciliation/useMaterialReconciliations';
import { resolveMaterialReconciliationActions } from '@/contractor-material-reconciliation/workflowActions';

function statusColor(
  status: string,
): 'default' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'approved':
      return 'info';
    case 'posted_to_bill':
      return 'success';
    default:
      return 'default';
  }
}

function formatQty(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : '—';
}

function formatMoney(n: number): string {
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '—';
}

/**
 * Material reconciliation register — create / approve / post-to-bill.
 * Nest: `GET|POST /contractor-material-reconciliations`
 * + `POST …/approve` + `POST …/post-to-bill`
 * (`contractor_recovery.view|manage`). Bill picker: `GET /contractor-bills`.
 */
export function MaterialReconciliationPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialReconciliationCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [createOpen, setCreateOpen] = useState(false);
  const [postTarget, setPostTarget] =
    useState<PublicMaterialReconciliation | null>(null);

  const list = useMaterialReconciliationsList(
    { projectId: selectedProjectId! },
    caps.canView && Boolean(selectedProjectId),
  );
  const approve = useApproveMaterialReconciliation();
  const postToBill = usePostMaterialReconciliationToBill();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Material reconciliation unavailable"
        message="You need the contractor_recovery.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Material reconciliations are project-scoped."
      />
    );
  }

  if (list.isError) {
    return (
      <RetryPanel error={list.error} onRetry={() => void list.refetch()} />
    );
  }

  const rows = list.data ?? [];

  return (
    <Stack spacing={2} data-testid="material-reconciliation-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Material Reconciliation</Typography>
          <Typography variant="body2" color="text.secondary">
            Issued − Theoretical − Approved wastage − Returned = Recoverable
            difference. Approve creates a material recovery when amount &gt; 0.
          </Typography>
        </div>
        {caps.canManage ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New reconciliation
          </Button>
        ) : null}
      </Stack>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell>Contractor</TableCell>
              <TableCell>Material</TableCell>
              <TableCell align="right">Issued</TableCell>
              <TableCell align="right">Theoretical</TableCell>
              <TableCell align="right">Wastage</TableCell>
              <TableCell align="right">Returned</TableCell>
              <TableCell align="right">Recoverable</TableCell>
              <TableCell align="right">Recovery ₹</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.isLoading ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography variant="body2" color="text.secondary">
                    No material reconciliations for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const actions = resolveMaterialReconciliationActions(row, caps);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.period.from.slice(0, 10)} →{' '}
                      {row.period.to.slice(0, 10)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {row.contractorId.slice(-6)}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {row.materialId.slice(-6)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQty(row.issuedQuantity)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQty(row.theoreticalConsumption)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQty(row.approvedWastage)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQty(row.returnedQuantity)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQty(row.recoverableDifference)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(row.recoveryAmount)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status.replaceAll('_', ' ')}
                        color={statusColor(row.status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{
                          justifyContent: 'flex-end',
                          flexWrap: 'wrap',
                        }}
                        useFlexGap
                      >
                        {actions.includes('approve') ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              void (async () => {
                                try {
                                  await approve.mutateAsync(row.id);
                                  success('Reconciliation approved');
                                } catch (err) {
                                  notifyError(getErrorMessage(err));
                                }
                              })();
                            }}
                          >
                            Approve
                          </Button>
                        ) : null}
                        {actions.includes('post_to_bill') ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setPostTarget(row)}
                          >
                            Post to bill
                          </Button>
                        ) : null}
                        {actions.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <MaterialReconciliationFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canManage={caps.canManage}
        canViewContractors={caps.canViewContractors}
        canViewMaterials={caps.canViewMaterials}
      />

      <PostToBillDialog
        open={Boolean(postTarget)}
        onClose={() => setPostTarget(null)}
        row={postTarget}
        canViewBills={caps.canViewBills}
        loading={postToBill.isPending}
        onConfirm={(billId) => {
          if (!postTarget) return;
          void (async () => {
            try {
              await postToBill.mutateAsync({ id: postTarget.id, billId });
              success('Posted to bill');
              setPostTarget(null);
            } catch (err) {
              notifyError(getErrorMessage(err));
            }
          })();
        }}
      />
    </Stack>
  );
}
