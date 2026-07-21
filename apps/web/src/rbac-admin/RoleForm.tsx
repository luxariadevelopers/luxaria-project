import { useEffect, useMemo } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toAppError } from '@/api/errors';
import { FieldErrorSummary } from '@/components/errors';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { PermissionChecklist } from './PermissionChecklist';
import type { PermissionCatalogItem, PublicRole } from './types';
import {
  buildRoleFormDefaults,
  resolveRoleFormField,
  roleFormSchema,
  type RoleFormValues,
} from './validation';

type Props = {
  mode: 'create' | 'edit';
  initial?: PublicRole | null;
  permissionCatalog?: readonly PermissionCatalogItem[];
  allowBypass?: boolean;
  submitting?: boolean;
  serverError?: unknown;
  onSubmit: (values: RoleFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function RoleForm({
  mode,
  initial,
  permissionCatalog,
  allowBypass = false,
  submitting = false,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const defaults = useMemo(() => buildRoleFormDefaults(initial), [initial]);
  const {
    control,
    handleSubmit,
    reset,
    setError,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const appError = useMemo(
    () =>
      serverError
        ? toAppError(serverError, 'Unable to save role')
        : null,
    [serverError],
  );

  useEffect(() => {
    if (!appError) return;
    for (const [field, message] of Object.entries(appError.fieldErrors)) {
      const path = resolveRoleFormField(field);
      if (path) {
        setError(path, { type: 'server', message });
      }
    }
  }, [appError, setError]);

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="role-form"
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      {appError ? (
        <Alert severity="error">
          {appError.message}
          <FieldErrorSummary error={appError} />
        </Alert>
      ) : null}

      <FormSection
        title="Role identity"
        description={
          mode === 'create'
            ? 'Leave code empty for a server-generated ROL-###### code.'
            : 'Role codes are immutable in the update API.'
        }
      >
        <FormTextField
          name="name"
          control={control}
          label="Role name"
          required
        />
        <FormTextField
          name="code"
          control={control}
          label="Role code"
          disabled={mode === 'edit'}
          helperText={
            mode === 'create'
              ? 'Optional: uppercase letters, numbers, and underscores.'
              : initial?.isSystem
                ? 'System role code is immutable.'
                : 'The current update endpoint does not accept code changes.'
          }
          slotProps={{
            htmlInput: {
              autoCapitalize: 'characters',
              maxLength: 64,
            },
          }}
        />
        <FormTextField
          name="description"
          control={control}
          label="Description"
          multiline
          minRows={3}
        />
      </FormSection>

      {mode === 'create' && permissionCatalog !== undefined ? (
        <FormSection
          title="Initial permissions"
          description="Only entries returned by GET /rbac/permissions can be selected."
        >
          <Controller
            name="permissions"
            control={control}
            render={({ field }) => (
              <PermissionChecklist
                catalog={permissionCatalog}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormSection>
      ) : null}

      {allowBypass ? (
        <FormSection
          title="Permission bypass"
          description="Bypass grants every permission. It is only exposed to an administrator who already has bypass access."
        >
          <FormCheckbox
            name="bypassPermissions"
            control={control}
            label="Bypass all permission checks"
          />
        </FormSection>
      ) : null}

      <Stack direction="row" spacing={1.5}>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'create'
              ? 'Create role'
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
