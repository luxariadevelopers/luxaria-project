import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import {
  ReportingApprovalMode,
  UserStatus,
  type CreateUserInput,
  type PublicUser,
  type UpdateUserInput,
} from './types';

const userStatuses = Object.values(UserStatus) as [
  UserStatus,
  ...UserStatus[],
];

const approvalModes = Object.values(ReportingApprovalMode) as [
  ReportingApprovalMode,
  ...ReportingApprovalMode[],
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

const loginCredentialFields = {
  email: optionalEmail,
  mobile: z.string(),
};

function requireLoginCredential<T extends { email: string; mobile: string }>(
  schema: z.ZodType<T>,
) {
  return schema.superRefine((values, ctx) => {
    if (!values.email.trim() && !values.mobile.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email or mobile is required for login',
        path: ['email'],
      });
    }
  });
}

const userFields = {
  fullName: z.string().trim().min(1, 'Full name is required'),
  ...loginCredentialFields,
  employeeId: z.string(),
  designation: z.string(),
  department: z.string(),
  profilePhoto: z.string(),
  reportingManager: z.string(),
  reportingOfficers: z.array(z.string()),
  reportingApprovalMode: z.enum(approvalModes),
  joiningDate: z.string().refine(
    (value) => value.trim() === '' || isCalendarDate(value),
    'Enter a valid joining date',
  ),
  status: z.enum(userStatuses),
  roleIds: z.array(z.string()),
  assignedProjects: z.array(z.string()),
  temporaryPassword: z.string(),
};

export const createUserFormSchema = requireLoginCredential(
  z.object({
    ...userFields,
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
);

export const editUserFormSchema = requireLoginCredential(
  z
    .object({
      ...userFields,
      password: z.literal(''),
    })
    .superRefine((values, ctx) => {
      const temp = values.temporaryPassword.trim();
      if (temp && temp.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Temporary password must be at least 8 characters',
          path: ['temporaryPassword'],
        });
      }
    }),
);

export type UserFormValues = z.infer<typeof createUserFormSchema>;

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildUserFormDefaults(
  user?: PublicUser | null,
): UserFormValues {
  const officers =
    user?.reportingOfficers?.length
      ? user.reportingOfficers
      : user?.reportingManager
        ? [user.reportingManager]
        : [];
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    mobile: user?.mobile ?? '',
    password: '',
    temporaryPassword: '',
    employeeId: user?.employeeId ?? '',
    designation: user?.designation ?? '',
    department: user?.department ?? '',
    profilePhoto: user?.profilePhoto ?? '',
    reportingManager: user?.reportingManager ?? officers[0] ?? '',
    reportingOfficers: officers,
    reportingApprovalMode:
      user?.reportingApprovalMode === ReportingApprovalMode.All
        ? ReportingApprovalMode.All
        : ReportingApprovalMode.Any,
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
  const officers = [...new Set(values.reportingOfficers.filter(Boolean))];
  const primary =
    values.reportingManager.trim() || officers[0] || null;
  return {
    fullName: values.fullName.trim(),
    email: optionalString(values.email),
    mobile: optionalString(values.mobile),
    password: values.password,
    designation: optionalString(values.designation),
    department: optionalString(values.department),
    profilePhoto: optionalString(values.profilePhoto),
    status: values.status,
    reportingManager: primary,
    reportingOfficers: officers,
    reportingApprovalMode: values.reportingApprovalMode,
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
  const officers = [...new Set(values.reportingOfficers.filter(Boolean))];
  const primary =
    values.reportingManager.trim() || officers[0] || null;
  const temporaryPassword = values.temporaryPassword.trim();
  return {
    fullName: values.fullName.trim(),
    email: optionalString(values.email),
    mobile: optionalString(values.mobile),
    designation: optionalString(values.designation),
    department: optionalString(values.department),
    profilePhoto: optionalString(values.profilePhoto),
    reportingManager: primary,
    reportingOfficers: officers,
    reportingApprovalMode: values.reportingApprovalMode,
    joiningDate: optionalString(values.joiningDate),
    ...(temporaryPassword ? { temporaryPassword } : {}),
  };
}

const userFormPaths = new Set<FieldPath<UserFormValues>>([
  'fullName',
  'email',
  'mobile',
  'password',
  'temporaryPassword',
  'employeeId',
  'designation',
  'department',
  'profilePhoto',
  'reportingManager',
  'reportingOfficers',
  'reportingApprovalMode',
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
