import { describe, expect, it } from 'vitest';
import {
  buildUserFormDefaults,
  createUserFormSchema,
  editUserFormSchema,
  toCreateUserInput,
  toUpdateUserInput,
} from './validation';
import { UserStatus } from './types';

describe('user administration validation', () => {
  it('requires a masked create password that meets the backend minimum', () => {
    const values = buildUserFormDefaults();
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

  it('validates optional email and calendar dates', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: 'User One',
      password: 'Temporary123!',
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
      password: 'Temporary123!',
      status: UserStatus.Active,
      roleIds: ['role-1'],
      assignedProjects: ['project-1'],
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
  });

  it('never puts password, status, roles, or projects in update payloads', () => {
    const values = {
      ...buildUserFormDefaults(),
      fullName: 'User One',
      password: '',
      status: UserStatus.Inactive,
      roleIds: ['role-1'],
      assignedProjects: ['project-1'],
    };

    expect(editUserFormSchema.safeParse(values).success).toBe(true);
    const update = toUpdateUserInput(values);
    expect(update).not.toHaveProperty('password');
    expect(update).not.toHaveProperty('status');
    expect(update).not.toHaveProperty('roleIds');
    expect(update).not.toHaveProperty('assignedProjects');
  });
});
