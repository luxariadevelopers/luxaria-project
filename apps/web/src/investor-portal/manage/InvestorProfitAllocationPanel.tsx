import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  type PublicProjectParticipant,
} from '@/project-participants/types';
import {
  useRecordInvestorProfitAllocation,
  useUpdateInvestorDistributedProfit,
} from './hooks';
import {
  listRecentProfitAllocations,
  patchRecentProfitAllocationDistributed,
  upsertRecentProfitAllocation,
} from './recentAllocations';
import type { RecentProfitAllocationRow } from './types';
import {
  recordInvestorProfitSchema,
  updateDistributedProfitSchema,
  type RecordInvestorProfitFormValues,
  type UpdateDistributedProfitFormValues,
} from './validation';

type Props = {
  projectId: string;
  participants: readonly PublicProjectParticipant[];
  canManage: boolean;
};

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvestorProfitAllocationPanel({
  projectId,
  participants,
  canManage,
}: Props) {
  const record = useRecordInvestorProfitAllocation(projectId);
  const updateDistributed = useUpdateInvestorDistributedProfit();
  const { success, error: notifyError } = useNotify();
  const [recentRows, setRecentRows] = useState<RecentProfitAllocationRow[]>([]);
  const [selectedAllocationId, setSelectedAllocationId] = useState('');

  const outsideInvestors = useMemo(
    () =>
      participants.filter(
        (row) =>
          row.participantType === ParticipantType.OutsideInvestor &&
          row.status === ParticipantApprovalStatus.Approved &&
          row.effectiveTo === null,
      ),
    [participants],
  );

  const participantOptions = useMemo(
    () =>
      outsideInvestors.map((row) => ({
        value: row.id,
        label: row.participantLabel ?? row.participantKey,
      })),
    [outsideInvestors],
  );

  const participantLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of outsideInvestors) {
      map.set(row.id, row.participantLabel ?? row.participantKey);
    }
    return map;
  }, [outsideInvestors]);

  useEffect(() => {
    setRecentRows(listRecentProfitAllocations(projectId));
  }, [projectId]);

  const recordForm = useForm<RecordInvestorProfitFormValues>({
    resolver: zodResolver(
      recordInvestorProfitSchema,
    ) as Resolver<RecordInvestorProfitFormValues>,
    defaultValues: {
      participantId: '',
      periodLabel: '',
      allocatedAmount: 0,
      distributedAmount: undefined,
      notes: '',
      approvedAt: '',
    },
  });

  const updateForm = useForm<UpdateDistributedProfitFormValues>({
    resolver: zodResolver(
      updateDistributedProfitSchema,
    ) as Resolver<UpdateDistributedProfitFormValues>,
    defaultValues: {
      allocationId: '',
      distributedAmount: 0,
      allocatedAmount: 0,
    },
  });

  const selectedRow = recentRows.find((row) => row.id === selectedAllocationId);
  const watchedAllocationId = useWatch({
    control: updateForm.control,
    name: 'allocationId',
  });

  useEffect(() => {
    if (watchedAllocationId && watchedAllocationId !== selectedAllocationId) {
      setSelectedAllocationId(watchedAllocationId);
    }
  }, [selectedAllocationId, watchedAllocationId]);

  useEffect(() => {
    if (!selectedRow) {
      updateForm.reset({
        allocationId: selectedAllocationId,
        distributedAmount: 0,
        allocatedAmount: 0,
      });
      return;
    }
    updateForm.reset({
      allocationId: selectedRow.id,
      distributedAmount: selectedRow.distributedAmount,
      allocatedAmount: selectedRow.allocatedAmount,
    });
  }, [selectedAllocationId, selectedRow, updateForm]);

  if (!canManage) {
    return null;
  }

  const onRecord = recordForm.handleSubmit(async (values) => {
    try {
      const response = await record.mutateAsync({
        participantId: values.participantId,
        periodLabel: values.periodLabel.trim() || undefined,
        allocatedAmount: values.allocatedAmount,
        distributedAmount: values.distributedAmount,
        notes: values.notes.trim() || undefined,
        approvedAt: values.approvedAt.trim() || undefined,
      });
      const payload = response.data;
      if (!payload) {
        success(response.message ?? 'Profit allocation recorded');
        return;
      }
      const row: RecentProfitAllocationRow = {
        ...payload,
        participantLabel:
          participantLabelById.get(payload.participantId) ?? null,
        recordedAt: new Date().toISOString(),
      };
      setRecentRows(upsertRecentProfitAllocation(row));
      setSelectedAllocationId(row.id);
      success(response.message ?? 'Profit allocation recorded');
      recordForm.reset({
        participantId: values.participantId,
        periodLabel: '',
        allocatedAmount: 0,
        distributedAmount: undefined,
        notes: '',
        approvedAt: '',
      });
    } catch (error) {
      if (isForbiddenError(error)) {
        notifyError('You do not have permission to record profit allocations.');
        return;
      }
      notifyError(getErrorMessage(error));
    }
  });

  const onUpdateDistributed = updateForm.handleSubmit(async (values) => {
    try {
      const response = await updateDistributed.mutateAsync({
        allocationId: values.allocationId,
        distributedAmount: values.distributedAmount,
      });
      const payload = response.data;
      if (payload) {
        setRecentRows(
          patchRecentProfitAllocationDistributed(
            projectId,
            payload.id,
            payload.distributedAmount,
            payload.undistributedAmount,
          ),
        );
      }
      success(response.message ?? 'Distributed profit updated');
    } catch (error) {
      if (isForbiddenError(error)) {
        notifyError('You do not have permission to update distributed profit.');
        return;
      }
      notifyError(getErrorMessage(error));
    }
  });

  return (
    <Card variant="outlined" data-testid="investor-profit-allocation-panel">
      <CardContent>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle1">Investor profit allocations</Typography>
            <Typography variant="body2" color="text.secondary">
              Record approved profit for outside investors and update cumulative
              distributed amounts. Visible totals appear in the investor portal.
              Requires{' '}
              <Box component="code" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                investor_portal.manage
              </Box>
              .
            </Typography>
          </Box>

          {outsideInvestors.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No approved outside-investor participants on this project. Add and
              approve a participant before recording profit allocations.
            </Typography>
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={(event) => void onRecord(event)}
            >
              <Typography variant="subtitle2">Record allocation</Typography>
              <FormSelect
                control={recordForm.control}
                name="participantId"
                label="Outside investor participant"
                options={participantOptions}
                required
                disabled={record.isPending}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  control={recordForm.control}
                  name="periodLabel"
                  label="Period label"
                  disabled={record.isPending}
                  helperText="Optional — e.g. FY 2025 Q4"
                />
                <FormTextField
                  control={recordForm.control}
                  name="approvedAt"
                  label="Approved at"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  disabled={record.isPending}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormTextField
                  control={recordForm.control}
                  name="allocatedAmount"
                  label="Allocated amount"
                  type="number"
                  required
                  disabled={record.isPending}
                />
                <FormTextField
                  control={recordForm.control}
                  name="distributedAmount"
                  label="Already distributed"
                  type="number"
                  disabled={record.isPending}
                  helperText="Optional — defaults to 0"
                />
              </Stack>
              <FormTextField
                control={recordForm.control}
                name="notes"
                label="Notes"
                multiline
                minRows={2}
                disabled={record.isPending}
              />
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={record.isPending}
                >
                  {record.isPending ? 'Recording…' : 'Record allocation'}
                </Button>
              </Stack>
            </Stack>
          )}

          <Divider />

          <Stack spacing={2}>
            <Typography variant="subtitle2">Mark distributed</Typography>
            <Typography variant="body2" color="text.secondary">
              Select a recently recorded allocation from this browser session, or
              paste an allocation id from a prior record response.
            </Typography>

            {recentRows.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Investor</TableCell>
                      <TableCell align="right">Allocated</TableCell>
                      <TableCell align="right">Distributed</TableCell>
                      <TableCell align="right">Undistributed</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentRows.map((row) => (
                      <TableRow key={row.id} selected={row.id === selectedAllocationId}>
                        <TableCell>
                          {row.participantLabel ?? row.participantId}
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(row.allocatedAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(row.distributedAmount)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(row.undistributedAmount)}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={
                              row.id === selectedAllocationId
                                ? 'contained'
                                : 'outlined'
                            }
                            onClick={() => setSelectedAllocationId(row.id)}
                          >
                            Update
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No allocations recorded in this session yet. After recording, rows
                appear here for quick distributed updates.
              </Typography>
            )}

            {updateDistributed.isError && isForbiddenError(updateDistributed.error) ? (
              <PermissionDenied
                error={updateDistributed.error}
                title="Update denied"
                message="You need investor_portal.manage and project access to update distributed profit."
              />
            ) : (
              <Stack
                component="form"
                spacing={2}
                onSubmit={(event) => void onUpdateDistributed(event)}
              >
                <FormTextField
                  control={updateForm.control}
                  name="allocationId"
                  label="Allocation id"
                  required
                  disabled={updateDistributed.isPending}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormTextField
                    control={updateForm.control}
                    name="allocatedAmount"
                    label="Allocated (reference)"
                    type="number"
                    disabled
                  />
                  <FormTextField
                    control={updateForm.control}
                    name="distributedAmount"
                    label="New cumulative distributed"
                    type="number"
                    required
                    disabled={updateDistributed.isPending}
                  />
                </Stack>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={
                      updateDistributed.isPending || !watchedAllocationId
                    }
                  >
                    {updateDistributed.isPending
                      ? 'Updating…'
                      : 'Update distributed'}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
