import { describe, expect, it } from 'vitest';
import {
  buildRoleFormDefaults,
  cloneRoleSchema,
  roleFormSchema,
  toCreateRoleInput,
  toUpdateRoleInput,
} from './validation';

describe('RBAC administration validation', () => {
  it('accepts an omitted generated code and validates explicit codes', () => {
    const defaults = {
      ...buildRoleFormDefaults(),
      name: 'Custom Role',
    };

    expect(roleFormSchema.safeParse(defaults).success).toBe(true);
    expect(
      roleFormSchema.safeParse({
        ...defaults,
        code: 'custom-role',
      }).success,
    ).toBe(false);
    expect(
      roleFormSchema.safeParse({
        ...defaults,
        code: 'CUSTOM_ROLE',
      }).success,
    ).toBe(true);
  });

  it('validates clone role names and codes', () => {
    expect(
      cloneRoleSchema.safeParse({
        name: '',
        code: '',
        description: '',
      }).success,
    ).toBe(false);
    expect(
      cloneRoleSchema.safeParse({
        name: 'Role Copy',
        code: 'ROLE_COPY',
        description: '',
      }).success,
    ).toBe(true);
  });

  it('only submits permission and bypass fields when authorized', () => {
    const values = {
      ...buildRoleFormDefaults(),
      name: 'Custom Role',
      permissions: ['user.view'],
      bypassPermissions: true,
    };

    const restricted = toCreateRoleInput(values, {
      includePermissions: false,
      allowBypass: false,
    });
    const allowed = toCreateRoleInput(values, {
      includePermissions: true,
      allowBypass: true,
    });

    expect(restricted).not.toHaveProperty('permissions');
    expect(restricted).not.toHaveProperty('bypassPermissions');
    expect(allowed.permissions).toEqual(['user.view']);
    expect(allowed.bypassPermissions).toBe(true);
  });

  it('never updates immutable code or permissions through metadata update', () => {
    const values = {
      ...buildRoleFormDefaults(),
      name: 'Updated Role',
      code: 'ORIGINAL_CODE',
      permissions: ['role.view'],
    };
    const update = toUpdateRoleInput(values, false);

    expect(update).toEqual({
      name: 'Updated Role',
      description: null,
    });
  });
});
