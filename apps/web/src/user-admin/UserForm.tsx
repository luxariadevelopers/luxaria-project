import { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import type { PublicProject } from '@/projects/types';
import type { PublicRole } from '@/rbac-admin/types';
import {
  buildUserFormDefaults,
  createUserFormSchema,
  editUserFormSchema,
  resolveUserFormField,
  type UserFormValues,
} from './validation';
import { UserStatus, type PublicUser } from './types';

type Props = {
  mode: 'create' | 'edit';
  initial?: PublicUser | null;
  managerOptions?: readonly PublicUser[];
  roleOptions?: readonly PublicRole[];
  projectOptions?: readonly PublicProject[];
  allowRoleAssignment?: boolean;
  allowProjectAssignment?: boolean;
  submitting?: boolean;
  serverError?: unknown;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function UserForm({
  mode,
  initial,
  managerOptions,
  roleOptions,
  projectOptions,
  allowRoleAssignment = false,
  allowProjectAssignment = false,
  submitting = false,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const defaults = useMemo(() => buildUserFormDefaults(initial), [initial]);
  const {
    control,
    handleSubmit,
    reset,
    resetField,
    setError,
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createUserFormSchema : editUserFormSchema,
    ),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const appError = useMemo(
    () =>
      serverError
        ? toAppError(serverError, 'Unable to save user')
        : null,
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveUserFormField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  const managerSelectOptions = useMemo(
    () => [
      { value: '', label: 'No reporting manager' },
      ...(initial?.reportingManager &&
      !(managerOptions ?? []).some(
        (user) => user.id === initial.reportingManager,
      )
        ? [
            {
              value: initial.reportingManager,
              label: `Current manager · ${initial.reportingManager}`,
            },
          ]
        : []),
      ...(managerOptions ?? [])
        .filter((user) => user.id !== initial?.id)
        .map((user) => ({
          value: user.id,
          label: `${user.fullName} · ${user.userCode}`,
        })),
    ],
    [initial?.id, initial?.reportingManager, managerOptions],
  );

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="user-form"
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          try {
            await onSubmit(values);
          } finally {
            // Passwords are request-only; never retain them after submission.
            if (mode === 'create') {
              resetField('password', { defaultValue: '' });
            }
          }
        })(event);
      }}
    >
      {appError ? (
        <Alert severity="error">
          {appError.message}
          <FieldErrorSummary error={appError} />
        </Alert>
      ) : null}

      <FormSection
        title="User identity"
        description="The server generates the immutable user code."
      >
        <FormTextField
          name="fullName"
          control={control}
          label="Full name"
          autoComplete="name"
          required
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="email"
            control={control}
            label="Email"
            type="email"
            autoComplete="off"
          />
          <FormTextField
            name="mobile"
            control={control}
            label="Mobile"
            autoComplete="off"
          />
        </Stack>
        {mode === 'create' ? (
          <FormTextField
            name="password"
            control={control}
            label="Initial password"
            type="password"
            autoComplete="new-password"
            required
            helperText="Sent once to the server and cleared from this form after submission."
            slotProps={{
              htmlInput: {
                minLength: 8,
                'data-testid': 'create-user-password',
              },
            }}
          />
        ) : null}
        {mode === 'create' ? (
          <FormSelect
            name="status"
            control={control}
            label="Initial status"
            options={[
              { value: UserStatus.Active, label: 'Active' },
              { value: UserStatus.Inactive, label: 'Inactive' },
            ]}
          />
        ) : null}
      </FormSection>

      <FormSection title="Employment">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormTextField
            name="employeeId"
            control={control}
            label="Employee ID"
          />
          <FormTextField
            name="designation"
            control={control}
            label="Designation"
          />
          <FormTextField
            name="department"
            control={control}
            label="Department"
          />
        </Stack>
        <DateInput
          name="joiningDate"
          control={control}
          label="Joining date"
        />
        {managerOptions !== undefined ? (
          <FormSelect
            name="reportingManager"
            control={control}
            label="Reporting manager"
            options={managerSelectOptions}
          />
        ) : null}
        <FormTextField
          name="profilePhoto"
          control={control}
          label="Profile photo reference"
          helperText="Optional URL or storage reference accepted by the current API."
        />
      </FormSection>

      {mode === 'create' &&
      allowRoleAssignment &&
      roleOptions !== undefined ? (
        <FormSection
          title="Initial roles"
          description="This sends a complete initial role list. Only active roles are selectable."
        >
          <Controller
            name="roleIds"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id="create-user-roles-label">Roles</InputLabel>
                <Select
                  {...field}
                  multiple
                  labelId="create-user-roles-label"
                  label="Roles"
                  value={field.value ?? []}
                >
                  {roleOptions.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name} · {role.code}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
        </FormSection>
      ) : null}

      {mode === 'create' &&
      allowProjectAssignment &&
      projectOptions !== undefined ? (
        <FormSection
          title="Initial projects"
          description="The backend creates project-access records for these projects."
        >
          <Controller
            name="assignedProjects"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl fullWidth error={Boolean(fieldState.error)}>
                <InputLabel id="create-user-projects-label">
                  Projects
                </InputLabel>
                <Select
                  {...field}
                  multiple
                  labelId="create-user-projects-label"
                  label="Projects"
                  value={field.value ?? []}
                >
                  {projectOptions.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.projectName} · {project.projectCode}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
        </FormSection>
      ) : null}

      <Stack direction="row" spacing={1.5}>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create user'
              : 'Save changes'}
        </Button>
        {onCancel ? (
          <Button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
