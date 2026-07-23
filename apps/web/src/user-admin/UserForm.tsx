import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
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
import { resolveUserProfilePhotoUrl } from './api';
import {
  departmentSelectOptions,
  designationSelectOptions,
  previewEmployeeId,
  USER_DESIGNATIONS_BY_DEPARTMENT,
} from './employmentOptions';
import {
  buildUserFormDefaults,
  createUserFormSchema,
  editUserFormSchema,
  resolveUserFormField,
  type UserFormValues,
} from './validation';
import {
  ReportingApprovalMode,
  UserStatus,
  type PublicUser,
} from './types';

const PROFILE_PHOTO_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export type UserFormSubmitExtras = {
  profilePhotoFile: File | null;
};

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
  onSubmit: (
    values: UserFormValues,
    extras: UserFormSubmitExtras,
  ) => void | Promise<void>;
  onCancel?: () => void;
};

function validateProfilePhoto(file: File): string | null {
  if (!PROFILE_PHOTO_ACCEPT.split(',').includes(file.type)) {
    return 'Use PNG, JPG, JPEG, WebP, or GIF';
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'Profile photo must be 2 MB or smaller';
  }
  return null;
}

export function UserForm({
  mode,
  initial,
  managerOptions = [],
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
    setValue,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createUserFormSchema : editUserFormSchema,
    ),
    defaultValues: defaults,
  });

  const previousDepartment = useRef(defaults.department);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState<string | null>(
    null,
  );
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null,
  );

  useEffect(() => {
    reset(defaults);
    previousDepartment.current = defaults.department;
    setProfilePhotoFile(null);
    setProfilePhotoError(null);
  }, [defaults, reset]);

  useEffect(() => {
    if (!profilePhotoFile) {
      setProfilePhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(profilePhotoFile);
    setProfilePhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhotoFile]);

  const department = watch('department');
  const designation = watch('designation');
  const reportingOfficers = watch('reportingOfficers');
  const reportingManager = watch('reportingManager');

  useEffect(() => {
    if (previousDepartment.current === department) return;
    previousDepartment.current = department;
    if (!department?.trim() || !designation?.trim()) return;
    const names = USER_DESIGNATIONS_BY_DEPARTMENT[department] ?? [];
    if (!names.includes(designation)) {
      setValue('designation', '', { shouldDirty: true });
    }
  }, [department, designation, setValue]);

  useEffect(() => {
    if (!reportingManager) return;
    if (!reportingOfficers.includes(reportingManager)) {
      setValue('reportingManager', reportingOfficers[0] ?? '', {
        shouldDirty: true,
      });
    }
  }, [reportingManager, reportingOfficers, setValue]);

  const employeeIdDisplay = useMemo(() => {
    if (mode === 'edit' && initial?.employeeId) {
      return initial.employeeId;
    }
    return previewEmployeeId(department, designation);
  }, [mode, initial?.employeeId, department, designation]);

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

  const officerOptions = useMemo(
    () =>
      managerOptions
        .filter((user) => user.id !== initial?.id)
        .map((user) => ({
          value: user.id,
          label: `${user.fullName} · ${user.userCode}${
            user.designation ? ` · ${user.designation}` : ''
          }`,
        })),
    [initial?.id, managerOptions],
  );

  const primaryOptions = useMemo(() => {
    const selected = new Set(reportingOfficers);
    const fromSelection = officerOptions.filter((option) =>
      selected.has(option.value),
    );
    if (
      reportingManager &&
      !fromSelection.some((option) => option.value === reportingManager)
    ) {
      return [
        {
          value: reportingManager,
          label: `Current primary · ${reportingManager}`,
        },
        ...fromSelection,
      ];
    }
    return fromSelection;
  }, [officerOptions, reportingManager, reportingOfficers]);

  const currentPhotoUrl = resolveUserProfilePhotoUrl(
    profilePhotoPreview ?? initial?.profilePhoto ?? watch('profilePhoto'),
  );

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="user-form"
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          try {
            await onSubmit(values, { profilePhotoFile });
          } finally {
            if (mode === 'create') {
              resetField('password', { defaultValue: '' });
            }
            resetField('temporaryPassword', { defaultValue: '' });
            setProfilePhotoFile(null);
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
        description="Email or mobile is the login ID. The server generates the immutable user code."
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
            label="Email (login)"
            type="email"
            autoComplete="off"
            helperText="Used to sign in"
          />
          <FormTextField
            name="mobile"
            control={control}
            label="Mobile (login)"
            autoComplete="off"
            helperText="Used to sign in if email is empty"
          />
        </Stack>
        {mode === 'create' ? (
          <FormTextField
            name="password"
            control={control}
            label="Initial temporary password"
            type="password"
            autoComplete="new-password"
            required
            helperText="Share securely. On first login they must set a permanent password."
            slotProps={{
              htmlInput: {
                minLength: 8,
                'data-testid': 'create-user-password',
              },
            }}
          />
        ) : (
          <FormTextField
            name="temporaryPassword"
            control={control}
            label="Set / reset temporary password"
            type="password"
            autoComplete="new-password"
            helperText="Optional. Leave blank to keep the current password. If set, they must choose a new permanent password on next login."
            slotProps={{
              htmlInput: {
                minLength: 8,
                'data-testid': 'edit-user-temporary-password',
              },
            }}
          />
        )}
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

      <FormSection
        title="Employment"
        description="Employee ID is generated from department + designation (for example ENG-SE-000042)."
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Employee ID"
            value={employeeIdDisplay}
            placeholder="Select department & designation"
            fullWidth
            disabled
            helperText={
              mode === 'edit' && initial?.employeeId
                ? 'Assigned and locked'
                : employeeIdDisplay
                  ? 'Final number is assigned when you save'
                  : 'Choose department and designation to preview'
            }
            slotProps={{
              htmlInput: { 'data-testid': 'employee-id-preview' },
            }}
          />
          <FormSelect
            name="department"
            control={control}
            label="Department"
            options={departmentSelectOptions(initial?.department)}
          />
          <FormSelect
            name="designation"
            control={control}
            label={
              department?.trim()
                ? 'Designation'
                : 'Designation (select department first)'
            }
            options={designationSelectOptions(department, designation)}
            disabled={!department?.trim()}
          />
        </Stack>
        <DateInput
          name="joiningDate"
          control={control}
          label="Joining date"
        />

        <Stack spacing={1.5} data-testid="reporting-officers-section">
          <Typography variant="subtitle2">Reporting & approvals</Typography>
          <Typography variant="body2" color="text.secondary">
            Optional. Leave empty if this person is top-level (no one above
            them), or set reporting officers later when more staff exist. When
            set, mark one as primary and choose whether any one or all must
            approve.
          </Typography>
          {officerOptions.length === 0 ? (
            <Alert severity="info">
              No other active users to assign yet. Leave reporting empty and
              save — you can update it later when directors or managers are
              added.
            </Alert>
          ) : null}
          <Controller
            name="reportingOfficers"
            control={control}
            render={({ field, fieldState }) => (
              <FormControl
                fullWidth
                error={Boolean(fieldState.error)}
                disabled={officerOptions.length === 0}
              >
                <InputLabel id="user-reporting-officers-label">
                  Reporting officers
                </InputLabel>
                <Select
                  {...field}
                  multiple
                  labelId="user-reporting-officers-label"
                  label="Reporting officers"
                  value={field.value ?? []}
                  onChange={(event) => {
                    const next = event.target.value as string[];
                    field.onChange(next);
                    const primary = watch('reportingManager');
                    if (!next.length) {
                      setValue('reportingManager', '', { shouldDirty: true });
                    } else if (!next.includes(primary)) {
                      setValue('reportingManager', next[0] ?? '', {
                        shouldDirty: true,
                      });
                    }
                  }}
                  renderValue={(selected) => {
                    const ids = selected as string[];
                    if (!ids.length) {
                      return officerOptions.length === 0
                        ? 'None — set later'
                        : 'None';
                    }
                    return ids
                      .map(
                        (id) =>
                          officerOptions.find((option) => option.value === id)
                            ?.label ?? id,
                      )
                      .join(', ');
                  }}
                >
                  {officerOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldState.error?.message ? (
                  <FormHelperText>{fieldState.error.message}</FormHelperText>
                ) : (
                  <FormHelperText>
                    Not required for top-level roles. Can be filled in later.
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          <FormSelect
            name="reportingManager"
            control={control}
            label="Primary reporting officer"
            options={[
              { value: '', label: 'None' },
              ...primaryOptions,
            ]}
            disabled={
              officerOptions.length === 0 || reportingOfficers.length === 0
            }
          />
          <FormSelect
            name="reportingApprovalMode"
            control={control}
            label="Approval rule"
            options={[
              {
                value: ReportingApprovalMode.Any,
                label: 'Any one reporting officer can approve',
              },
              {
                value: ReportingApprovalMode.All,
                label: 'All reporting officers must approve',
              },
            ]}
            disabled={
              officerOptions.length === 0 || reportingOfficers.length === 0
            }
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' } }}
          data-testid="profile-photo-section"
        >
          <Avatar
            src={currentPhotoUrl ?? undefined}
            alt="Profile photo preview"
            sx={{ width: 88, height: 88, fontSize: 28 }}
          >
            {(initial?.fullName ?? watch('fullName') ?? '?')
              .slice(0, 2)
              .toUpperCase()}
          </Avatar>
          <Stack spacing={1} sx={{ alignItems: 'flex-start', flex: 1 }}>
            <Button component="label" variant="outlined" disabled={submitting}>
              Choose profile photo
              <input
                hidden
                type="file"
                accept={PROFILE_PHOTO_ACCEPT}
                aria-label="Profile photo file"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  if (!next) {
                    setProfilePhotoFile(null);
                    setProfilePhotoError(null);
                    return;
                  }
                  const error = validateProfilePhoto(next);
                  setProfilePhotoError(error);
                  setProfilePhotoFile(error ? null : next);
                  event.target.value = '';
                }}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {profilePhotoFile
                ? `${profilePhotoFile.name} · ${Math.ceil(profilePhotoFile.size / 1024)} KB — uploaded when you save`
                : initial?.profilePhoto
                  ? 'Current photo on file'
                  : 'PNG, JPG, WebP, or GIF · max 2 MB'}
            </Typography>
            {profilePhotoError ? (
              <Alert severity="error">{profilePhotoError}</Alert>
            ) : null}
            {profilePhotoFile ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setProfilePhotoFile(null);
                  setProfilePhotoError(null);
                }}
              >
                Clear selection
              </Button>
            ) : null}
          </Stack>
        </Stack>
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
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || Boolean(profilePhotoError)}
        >
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
