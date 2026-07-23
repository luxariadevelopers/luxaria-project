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
import type { PublicMeasurementBookEntry } from '@/measurement-book/api';
import { MeasurementBookFormDrawer } from '@/measurement-book/MeasurementBookFormDrawer';
import { RejectMbDialog } from '@/measurement-book/RejectMbDialog';
import { ReviseMbDialog } from '@/measurement-book/ReviseMbDialog';
import { resolveMeasurementBookCapabilities } from '@/measurement-book/roleAccess';
import {
  useAcknowledgeMeasurementBook,
  useCancelMeasurementBook,
  useCertifyMeasurementBook,
  useMeasurementBookList,
  useRejectMeasurementBook,
  useReviseMeasurementBook,
  useSubmitMeasurementBook,
  useVerifyMeasurementBook,
} from '@/measurement-book/useMeasurementBook';
import { resolveMeasurementBookActions } from '@/measurement-book/workflowActions';

function formatDims(row: {
  length: number | null;
  breadth: number | null;
  height: number | null;
  numberOfUnits: number;
}): string {
  const parts = [
    row.numberOfUnits != null ? `${row.numberOfUnits} nos` : null,
    row.length != null ? `L ${row.length}` : null,
    row.breadth != null ? `B ${row.breadth}` : null,
    row.height != null ? `H ${row.height}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' × ') : '—';
}

/**
 * Measurement Book register — create / submit / certify.
 * Nest: `GET|POST /measurement-book` + workflow actions.
 */
export function MeasurementBookPage() {
  const { hasPermission, access, user } = useAuth();
  const caps = resolveMeasurementBookCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] =
    useState<PublicMeasurementBookEntry | null>(null);
  const [reviseTarget, setReviseTarget] =
    useState<PublicMeasurementBookEntry | null>(null);

  const list = useMeasurementBookList(
    { projectId: selectedProjectId! },
    caps.canView && Boolean(selectedProjectId),
  );
  const submit = useSubmitMeasurementBook();
  const acknowledge = useAcknowledgeMeasurementBook();
  const verify = useVerifyMeasurementBook();
  const certify = useCertifyMeasurementBook();
  const reject = useRejectMeasurementBook();
  const cancel = useCancelMeasurementBook();
  const revise = useReviseMeasurementBook();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Measurement book unavailable"
        message="You need the measurement.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Measurement book entries are project-scoped."
      />
    );
  }

  if (list.isError) {
    return (
      <RetryPanel error={list.error} onRetry={() => void list.refetch()} />
    );
  }

  const run = (action: () => Promise<unknown>, okMessage: string) => {
    void (async () => {
      try {
        await action();
        success(okMessage);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const rows = list.data ?? [];

  return (
    <Stack spacing={2} data-testid="measurement-book-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Measurement Book</Typography>
          <Typography variant="body2" color="text.secondary">
            Formal MB register — L/B/H quantities, engineer submit, contractor
            acknowledgement, verify/certify (`measurement.create` /
            `measurement.certify`).
          </Typography>
        </div>
        {caps.canCreate ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New entry
          </Button>
        ) : null}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Entry</TableCell>
              <TableCell>Rev</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>BOQ</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Dims</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.isLoading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    No measurement book entries for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const actions = resolveMeasurementBookActions(
                  row,
                  caps,
                  user?.id,
                );
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.entryNumber}</TableCell>
                    <TableCell>{row.revision}</TableCell>
                    <TableCell>
                      {row.periodFrom.slice(0, 10)} →{' '}
                      {row.periodTo.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      {row.boqCode || row.boqItemId.slice(-6)}
                    </TableCell>
                    <TableCell>
                      {row.location.locationLabel || '—'}
                    </TableCell>
                    <TableCell>{formatDims(row)}</TableCell>
                    <TableCell align="right">
                      {row.quantity} {row.unit}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={row.status} />
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
                        {actions.includes('submit') ? (
                          <Button
                            size="small"
                            onClick={() =>
                              run(
                                () => submit.mutateAsync(row.id),
                                'Entry submitted',
                              )
                            }
                          >
                            Submit
                          </Button>
                        ) : null}
                        {actions.includes('acknowledge') ? (
                          <Button
                            size="small"
                            onClick={() =>
                              run(
                                () => acknowledge.mutateAsync(row.id),
                                'Entry acknowledged',
                              )
                            }
                          >
                            Acknowledge
                          </Button>
                        ) : null}
                        {actions.includes('verify') ? (
                          <Button
                            size="small"
                            onClick={() =>
                              run(
                                () => verify.mutateAsync(row.id),
                                'Entry verified',
                              )
                            }
                          >
                            Verify
                          </Button>
                        ) : null}
                        {actions.includes('certify') ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              run(
                                () => certify.mutateAsync(row.id),
                                'Entry certified',
                              )
                            }
                          >
                            Certify
                          </Button>
                        ) : null}
                        {actions.includes('reject') ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setRejectTarget(row)}
                          >
                            Reject
                          </Button>
                        ) : null}
                        {actions.includes('cancel') ? (
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() =>
                              run(
                                () => cancel.mutateAsync(row.id),
                                'Entry cancelled',
                              )
                            }
                          >
                            Cancel
                          </Button>
                        ) : null}
                        {actions.includes('revise') ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setReviseTarget(row)}
                          >
                            Revise
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

      <MeasurementBookFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canCreate={caps.canCreate}
        canViewBoq={caps.canViewBoq}
        canViewContractors={caps.canViewContractors}
      />

      <RejectMbDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        loading={reject.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          run(
            () => reject.mutateAsync({ id: rejectTarget.id, reason }),
            'Entry rejected',
          );
          setRejectTarget(null);
        }}
      />

      <ReviseMbDialog
        open={Boolean(reviseTarget)}
        onClose={() => setReviseTarget(null)}
        entry={reviseTarget}
        loading={revise.isPending}
        onConfirm={(input) => {
          if (!reviseTarget) return;
          run(
            () => revise.mutateAsync({ id: reviseTarget.id, input }),
            'Revision draft created',
          );
          setReviseTarget(null);
        }}
      />
    </Stack>
  );
}
