import { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/client';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import {
  canManuallyChangeUnitStatus,
  manualAllowedNextStatuses,
} from './bookedRestrictions';
import { unitStatusLabel } from './labels';
import { allowedNextStatuses } from './statusTransitions';
import type { LinkedBooking, PublicUnit, UnitStatus } from './types';
import { useChangeUnitStatus } from './useUnits';
import {
  assertUnitStatusTransition,
  changeUnitStatusSchema,
  type ChangeUnitStatusFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  unit: PublicUnit | null;
  bookings: readonly LinkedBooking[];
};

export function UnitStatusDialog({
  open,
  onClose,
  unit,
  bookings,
}: Props) {
  const change = useChangeUnitStatus();
  const { success, error: notifyError } = useNotify();

  const gate = useMemo(
    () =>
      unit
        ? canManuallyChangeUnitStatus(unit, bookings)
        : ({ ok: false as const, reason: 'No unit selected' }),
    [unit, bookings],
  );

  const nextOptions = useMemo(() => {
    if (!unit) return [];
    return manualAllowedNextStatuses(
      unit,
      bookings,
      allowedNextStatuses(unit.status),
    );
  }, [unit, bookings]);

  const form = useForm<ChangeUnitStatusFormValues>({
    resolver: zodResolver(changeUnitStatusSchema),
    defaultValues: { status: undefined as unknown as UnitStatus, notes: '' },
  });

  useEffect(() => {
    if (!open || !unit) return;
    form.reset({
      status: nextOptions[0] ?? unit.status,
      notes: '',
    });
  }, [open, unit, nextOptions, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!unit) return;
    if (!gate.ok) {
      notifyError(gate.reason);
      return;
    }
    const transition = assertUnitStatusTransition(unit.status, values.status);
    if (!transition.ok) {
      form.setError('status', { message: transition.message });
      return;
    }
    try {
      await change.mutateAsync({
        id: unit.id,
        input: {
          status: values.status,
          notes: values.notes?.trim() || null,
        },
      });
      success(`Status changed to ${unitStatusLabel(values.status)}`);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err, 'Status change failed'));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      data-testid="unit-status-dialog"
    >
      <DialogTitle>Change unit status</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {unit ? (
            <Alert severity="info">
              Current: {unitStatusLabel(unit.status)} ({unit.block}-
              {unit.unitNumber})
            </Alert>
          ) : null}
          {!gate.ok ? (
            <Alert severity="warning">{gate.reason}</Alert>
          ) : nextOptions.length === 0 ? (
            <Alert severity="info">No manual transitions available.</Alert>
          ) : (
            <Stack
              component="form"
              id="unit-status-form"
              spacing={1.5}
              onSubmit={(e) => void onSubmit(e)}
            >
              <FormSelect name="status" control={form.control} label="Next status">
                {nextOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {unitStatusLabel(status)}
                  </MenuItem>
                ))}
              </FormSelect>
              <FormTextField
                name="notes"
                control={form.control}
                label="Notes"
                multiline
                minRows={2}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          form="unit-status-form"
          variant="contained"
          disabled={
            !gate.ok || nextOptions.length === 0 || change.isPending
          }
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
