import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { PROJECT_ACCESS_STATUS_OPTIONS } from './constants';
import {
  ProjectAccessStatus,
  type ProjectUserOption,
  type PublicProjectAssignment,
} from './types';
import {
  projectAssignmentFormSchema,
  type ProjectAssignmentFormValues,
} from './validation';

type Props = {
  open: boolean;
  assignment?: PublicProjectAssignment | null;
  users: readonly ProjectUserOption[];
  loading?: boolean;
  serverError?: unknown;
  onClose: () => void;
  onSubmit: (values: ProjectAssignmentFormValues) => void | Promise<void>;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProjectAssignmentDialog({
  open,
  assignment,
  users,
  loading = false,
  serverError,
  onClose,
  onSubmit,
}: Props) {
  const { control, handleSubmit, reset } =
    useForm<ProjectAssignmentFormValues>({
      resolver: zodResolver(projectAssignmentFormSchema),
      defaultValues: {
        userId: assignment?.userId ?? '',
        accessStartDate:
          assignment?.accessStartDate.slice(0, 10) ?? today(),
        accessEndDate: assignment?.accessEndDate?.slice(0, 10) ?? '',
        status: assignment?.status ?? ProjectAccessStatus.Active,
        notes: assignment?.notes ?? '',
      },
    });

  useEffect(() => {
    if (!open) return;
    reset({
      userId: assignment?.userId ?? '',
      accessStartDate:
        assignment?.accessStartDate.slice(0, 10) ?? today(),
      accessEndDate: assignment?.accessEndDate?.slice(0, 10) ?? '',
      status: assignment?.status ?? ProjectAccessStatus.Active,
      notes: assignment?.notes ?? '',
    });
  }, [assignment, open, reset]);

  const userOptions = [
    ...(!assignment
      ? []
      : users.some((user) => user.id === assignment.userId)
        ? []
        : [
            {
              value: assignment.userId,
              label: `Current user · ${assignment.userId}`,
            },
          ]),
    ...users.map((user) => ({
      value: user.id,
      label: `${user.fullName} · ${user.userCode}`,
    })),
  ];

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth>
      <DialogTitle>
        {assignment ? 'Edit project access' : 'Assign project access'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          component="form"
          id="project-assignment-form"
          spacing={2}
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          {serverError ? (
            <Alert severity="error">{getErrorMessage(serverError)}</Alert>
          ) : null}
          <FormSelect
            name="userId"
            control={control}
            label="User"
            options={userOptions}
            disabled={Boolean(assignment)}
            required
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DateInput
              name="accessStartDate"
              control={control}
              label="Access start"
              required
            />
            <DateInput
              name="accessEndDate"
              control={control}
              label="Access end"
            />
          </Stack>
          {assignment ? (
            <FormSelect
              name="status"
              control={control}
              label="Status"
              options={PROJECT_ACCESS_STATUS_OPTIONS}
            />
          ) : (
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  label="Initial status"
                  value={field.value}
                  disabled
                  fullWidth
                />
              )}
            />
          )}
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="project-assignment-form"
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Saving…' : assignment ? 'Save access' : 'Assign access'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
