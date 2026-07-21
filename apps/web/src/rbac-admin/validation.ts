import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import type {
  CloneRoleInput,
  CreateRoleInput,
  PublicRole,
  UpdateRoleInput,
} from './types';

const roleCode = z.string().trim().refine(
  (value) => value === '' || /^[A-Z][A-Z0-9_]{1,63}$/.test(value),
  'Use 2–64 uppercase letters, numbers, or underscores',
);

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required'),
  code: roleCode,
  description: z.string(),
  permissions: z.array(z.string()).refine(
    (values) => new Set(values).size === values.length,
    'Permission selections must be unique',
  ),
  bypassPermissions: z.boolean(),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const cloneRoleSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required'),
  code: roleCode,
  description: z.string(),
});

export type CloneRoleFormValues = z.infer<typeof cloneRoleSchema>;

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildRoleFormDefaults(
  role?: PublicRole | null,
): RoleFormValues {
  return {
    name: role?.name ?? '',
    code: role?.code ?? '',
    description: role?.description ?? '',
    permissions: role?.permissions ?? [],
    bypassPermissions: role?.bypassPermissions ?? false,
  };
}

export function toCreateRoleInput(
  values: RoleFormValues,
  options: {
    includePermissions: boolean;
    allowBypass: boolean;
  },
): CreateRoleInput {
  return {
    name: values.name.trim(),
    ...(values.code.trim() ? { code: values.code.trim() } : {}),
    description: optionalString(values.description),
    ...(options.includePermissions
      ? { permissions: values.permissions }
      : {}),
    ...(options.allowBypass
      ? { bypassPermissions: values.bypassPermissions }
      : {}),
  };
}

export function toUpdateRoleInput(
  values: RoleFormValues,
  allowBypass: boolean,
): UpdateRoleInput {
  return {
    name: values.name.trim(),
    description: optionalString(values.description),
    ...(allowBypass
      ? { bypassPermissions: values.bypassPermissions }
      : {}),
  };
}

export function toCloneRoleInput(
  values: CloneRoleFormValues,
): CloneRoleInput {
  return {
    name: values.name.trim(),
    ...(values.code.trim() ? { code: values.code.trim() } : {}),
    description: optionalString(values.description),
  };
}

const roleFormPaths = new Set<FieldPath<RoleFormValues>>([
  'name',
  'code',
  'description',
  'permissions',
  'bypassPermissions',
]);

export function resolveRoleFormField(
  serverField: string,
): FieldPath<RoleFormValues> | null {
  const normalised = serverField
    .replace(/^body\./, '')
    .replace(/\[(\w+)\]/g, '.$1');
  return roleFormPaths.has(normalised as FieldPath<RoleFormValues>)
    ? (normalised as FieldPath<RoleFormValues>)
    : null;
}
