import { describe, expect, it } from 'vitest';
import {
  buildUserFormDefaults,
  createUserFormSchema,
  editUserFormSchema,
  toCreateUserInput,
  toUpdateUserInput,
} from './validation';
import { ReportingApprovalMode, UserStatus } from './types';

describe('user administration validation', () => {
  it('requires a masked create password that meets the backend minimum', () => {
    const values = {
      ...buildUserFormDefaults(),
      email: 'user@example.com',
    };
    expect(
      createUserFormSchema.safeParse({
        ...values,
        fullName: 'User One',
        password: 'short',
      }).success,
    ).toBe(false);
    expect(
      createUserFormSchema.safeParse({
        ...values,
        fullName: 'User One',
        password: 'Temporary123!',
      }).success,
    ).toBe(true);
  });

  it('requires email or mobile for login', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: 'User One',
      password: 'Temporary123!',
      email: '',
      mobile: '',
    };
    expect(createUserFormSchema.safeParse(values).success).toBe(false);
    expect(
      createUserFormSchema.safeParse({
        ...values,
        mobile: '9876543210',
      }).success,
    ).toBe(true);
  });

  it('validates optional email and calendar dates', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: 'User One',
      password: 'Temporary123!',
      email: 'user@example.com',
    };
    expect(
      createUserFormSchema.safeParse({
        ...values,
        email: 'not-an-email',
      }).success,
    ).toBe(false);
    expect(
      createUserFormSchema.safeParse({
        ...values,
        joiningDate: '2026-02-30',
      }).success,
    ).toBe(false);
  });

  it('only includes initial access fields when their actions are allowed', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: ' User One ',
      email: 'user@example.com',
      password: 'Temporary123!',
      status: UserStatus.Active,
      roleIds: ['role-1'],
      assignedProjects: ['project-1'],
      reportingOfficers: ['mgr-1', 'mgr-2'],
      reportingManager: 'mgr-1',
      reportingApprovalMode: ReportingApprovalMode.All,
    };

    const restricted = toCreateUserInput(values, {
      includeRoleIds: false,
      includeAssignedProjects: false,
    });
    const allowed = toCreateUserInput(values, {
      includeRoleIds: true,
      includeAssignedProjects: true,
    });

    expect(restricted).not.toHaveProperty('roleIds');
    expect(restricted).not.toHaveProperty('assignedProjects');
    expect(allowed.roleIds).toEqual(['role-1']);
    expect(allowed.assignedProjects).toEqual(['project-1']);
    expect(restricted.reportingOfficers).toEqual(['mgr-1', 'mgr-2']);
    expect(restricted.reportingApprovalMode).toBe(ReportingApprovalMode.All);
  });

  it('includes temporary password and reporting fields on update when set', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: 'User One',
      email: 'user@example.com',
      password: '',
      temporaryPassword: 'ResetPass1!',
      status: UserStatus.Inactive,
      roleIds: ['role-1'],
      assignedProjects: ['project-1'],
      reportingOfficers: ['mgr-2'],
      reportingManager: 'mgr-2',
      reportingApprovalMode: ReportingApprovalMode.Any,
    };

    expect(editUserFormSchema.safeParse(values).success).toBe(true);
    const update = toUpdateUserInput(values);
    expect(update).not.toHaveProperty('password');
    expect(update).not.toHaveProperty('status');
    expect(update).not.toHaveProperty('roleIds');
    expect(update).not.toHaveProperty('assignedProjects');
    expect(update.temporaryPassword).toBe('ResetPass1!');
    expect(update.reportingOfficers).toEqual(['mgr-2']);
    expect(update.reportingManager).toBe('mgr-2');
  });
});
