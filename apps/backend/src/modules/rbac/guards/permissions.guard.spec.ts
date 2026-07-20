import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { SKIP_PERMISSIONS_KEY } from '../decorators/skip-permissions.decorator';
import type { PermissionsService } from '../permissions.service';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const permissionsService = {
    hasAllPermissions: jest.fn(),
  };

  const buildContext = (user?: { id: string }): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows public routes', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      }),
    };
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );

    await expect(guard.canActivate(buildContext())).resolves.toBe(true);
    expect(permissionsService.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('allows routes with @SkipPermissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === SKIP_PERMISSIONS_KEY) return true;
        return undefined;
      }),
    };
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );

    await expect(guard.canActivate(buildContext({ id: 'u1' }))).resolves.toBe(true);
  });

  it('allows authenticated users when no permissions are required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );

    await expect(guard.canActivate(buildContext({ id: 'u1' }))).resolves.toBe(true);
  });

  it('denies when required permissions are missing', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === REQUIRE_PERMISSIONS_KEY) return ['expense.approve'];
        return undefined;
      }),
    };
    permissionsService.hasAllPermissions.mockResolvedValue(false);
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );

    await expect(guard.canActivate(buildContext({ id: 'u1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows when required permissions are granted', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === REQUIRE_PERMISSIONS_KEY) return ['project.create'];
        return undefined;
      }),
    };
    permissionsService.hasAllPermissions.mockResolvedValue(true);
    const guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      permissionsService as unknown as PermissionsService,
    );

    await expect(guard.canActivate(buildContext({ id: 'u1' }))).resolves.toBe(true);
    expect(permissionsService.hasAllPermissions).toHaveBeenCalledWith('u1', [
      'project.create',
    ]);
  });
});
