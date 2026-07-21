import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import {
  UserStatus,
  type CreateUserInput,
  type PublicUser,
  type UpdateUserInput,
} from './types';

const userStatuses = Object.values(UserStatus) as [
  UserStatus,
  ...UserStatus[],
];

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const optionalEmail = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    'Enter a valid email address',
  );

const userFields = {
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: optionalEmail,
  mobile: z.string(),
  employeeId: z.string(),
  designation: z.string(),
  department: z.string(),
  profilePhoto: z.string(),
  reportingManager: z.string(),
  joiningDate: z.string().refine(
    (value) => value.trim() === '' || isCalendarDate(value),
    'Enter a valid joining date',
  ),
  status: z.enum(userStatuses),
  roleIds: z.array(z.string()),
  assignedProjects: z.array(z.string()),
};

export const createUserFormSchema = z.object({
  ...userFields,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const editUserFormSchema = z.object({
  ...userFields,
  password: z.literal(''),
});

export type UserFormValues = z.infer<typeof createUserFormSchema>;

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildUserFormDefaults(
  user?: PublicUser | null,
): UserFormValues {
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    mobile: user?.mobile ?? '',
    password: '',
    employeeId: user?.employeeId ?? '',
    designation: user?.designation ?? '',
    department: user?.department ?? '',
    profilePhoto: user?.profilePhoto ?? '',
    reportingManager: user?.reportingManager ?? '',
    joiningDate: user?.joiningDate?.slice(0, 10) ?? '',
    status:
      user?.status === UserStatus.Inactive
        ? UserStatus.Inactive
        : UserStatus.Active,
    roleIds: user?.roleIds ?? [],
    assignedProjects: user?.assignedProjects ?? [],
  };
}

export function toCreateUserInput(
  values: UserFormValues,
  options: {
    includeRoleIds: boolean;
    includeAssignedProjects: boolean;
  },
): CreateUserInput {
  return {
    fullName: values.fullName.trim(),
    email: optionalString(values.email),
    mobile: optionalString(values.mobile),
    password: values.password,
    employeeId: optionalString(values.employeeId),
    designation: optionalString(values.designation),
    department: optionalString(values.department),
    profilePhoto: optionalString(values.profilePhoto),
    status: values.status,
    reportingManager: optionalString(values.reportingManager),
    joiningDate: optionalString(values.joiningDate),
    ...(options.includeRoleIds ? { roleIds: values.roleIds } : {}),
    ...(options.includeAssignedProjects
      ? { assignedProjects: values.assignedProjects }
      : {}),
  };
}

export function toUpdateUserInput(
  values: UserFormValues,
): UpdateUserInput {
  return {
    fullName: values.fullName.trim(),
    email: optionalString(values.email),
    mobile: optionalString(values.mobile),
    employeeId: optionalString(values.employeeId),
    designation: optionalString(values.designation),
    department: optionalString(values.department),
    profilePhoto: optionalString(values.profilePhoto),
    reportingManager: optionalString(values.reportingManager),
    joiningDate: optionalString(values.joiningDate),
  };
}

const userFormPaths = new Set<FieldPath<UserFormValues>>([
  'fullName',
  'email',
  'mobile',
  'password',
  'employeeId',
  'designation',
  'department',
  'profilePhoto',
  'reportingManager',
  'joiningDate',
  'status',
  'roleIds',
  'assignedProjects',
]);

export function resolveUserFormField(
  serverField: string,
): FieldPath<UserFormValues> | null {
  const normalised = serverField
    .replace(/^body\./, '')
    .replace(/\[(\w+)\]/g, '.$1');
  return userFormPaths.has(normalised as FieldPath<UserFormValues>)
    ? (normalised as FieldPath<UserFormValues>)
    : null;
}
