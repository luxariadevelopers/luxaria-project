import { useState } from 'react';
import {
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import type {
  ContractorTenderStatus,
  PublicContractorTender,
} from '@/contractor-tenders/api';
import { TenderCreateDrawer } from '@/contractor-tenders/TenderCreateDrawer';
import { TenderInviteDialog } from '@/contractor-tenders/TenderInviteDialog';
import { TenderRecordBidDialog } from '@/contractor-tenders/TenderRecordBidDialog';
import { resolveTenderCapabilities } from '@/contractor-tenders/roleAccess';
import {
  useCancelContractorTender,
  useContractorTendersList,
  useInviteContractors,
  useRecordTenderBid,
} from '@/contractor-tenders/useContractorTenders';
import { resolveTenderListActions } from '@/contractor-tenders/workflowActions';

function statusColor(
  status: ContractorTenderStatus,
): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'draft':
      return 'default';
    case 'invited':
      return 'info';
    case 'bidding':
      return 'warning';
    case 'under_evaluation':
      return 'info';
    case 'awarded':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Contractor tenders list — create / invite / compare.
 * Nest: `GET|POST /contractor-tenders` (`tender.view` / `tender.manage`).
 */
export function TenderListPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveTenderCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteTarget, setInviteTarget] =
    useState<PublicContractorTender | null>(null);
  const [recordBidTarget, setRecordBidTarget] =
    useState<PublicContractorTender | null>(null);

  const list = useContractorTendersList(
    { projectId: selectedProjectId! },
    caps.canView && Boolean(selectedProjectId),
  );
  const invite = useInviteContractors();
  const recordBid = useRecordTenderBid();
  const cancel = useCancelContractorTender();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Tenders unavailable"
        message="You need the tender.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Contractor tenders are project-scoped."
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
    <Stack spacing={2} data-testid="tender-list-page">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
      >
        <div>
          <Typography variant="h5">Contractor Tenders</Typography>
          <Typography variant="body2" color="text.secondary">
            Create drafts, invite contractors, then compare / recommend / award
            from bid comparison. Workflow: draft → invited → bidding → under
            evaluation → awarded.
          </Typography>
        </div>
        {caps.canManage ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New tender
          </Button>
        ) : null}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Invited</TableCell>
              <TableCell>Bids</TableCell>
              <TableCell>Bid deadline</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No tenders for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const actions = resolveTenderListActions(row, caps);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.tenderNumber}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status.replaceAll('_', ' ')}
                        color={statusColor(row.status)}
                      />
                    </TableCell>
                    <TableCell>{row.invitedContractorIds.length}</TableCell>
                    <TableCell>
                      {row.commercialBids.length}C / {row.technicalBids.length}T
                    </TableCell>
                    <TableCell>
                      {row.bidDeadline
                        ? new Date(row.bidDeadline).toLocaleDateString()
                        : '—'}
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
                        {actions.includes('invite') ? (
                          <Button
                            size="small"
                            onClick={() => setInviteTarget(row)}
                          >
                            Invite
                          </Button>
                        ) : null}
                        {actions.includes('record_bid') ? (
                          <Button
                            size="small"
                            onClick={() => setRecordBidTarget(row)}
                          >
                            Record bid
                          </Button>
                        ) : null}
                        {actions.includes('compare') ? (
                          <Link
                            component={RouterLink}
                            to={`/contractor-tenders/${row.id}/compare`}
                            underline="hover"
                            variant="body2"
                            sx={{ alignSelf: 'center', px: 0.5 }}
                          >
                            Compare
                          </Link>
                        ) : null}
                        {actions.includes('cancel') ? (
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() =>
                              run(
                                () =>
                                  cancel.mutateAsync({
                                    id: row.id,
                                    reason: 'Cancelled from tenders list',
                                  }),
                                'Tender cancelled',
                              )
                            }
                          >
                            Cancel
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

      <TenderCreateDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canManage={caps.canManage}
      />

      <TenderInviteDialog
        open={Boolean(inviteTarget)}
        onClose={() => setInviteTarget(null)}
        tender={inviteTarget}
        canViewContractors={caps.canViewContractors}
        loading={invite.isPending}
        onConfirm={(input) => {
          if (!inviteTarget) return;
          run(
            () => invite.mutateAsync({ id: inviteTarget.id, input }),
            'Contractors invited',
          );
          setInviteTarget(null);
        }}
      />

      <TenderRecordBidDialog
        open={Boolean(recordBidTarget)}
        onClose={() => setRecordBidTarget(null)}
        tender={recordBidTarget}
        loading={recordBid.isPending}
        onConfirm={(input) => {
          if (!recordBidTarget) return;
          run(
            () => recordBid.mutateAsync({ id: recordBidTarget.id, input }),
            'Bid recorded',
          );
          setRecordBidTarget(null);
        }}
      />
    </Stack>
  );
}
