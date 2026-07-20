import { BadRequestException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { REQUIRE_PROJECT_ACCESS_KEY } from '../decorators/require-project-access.decorator';
import type { ProjectAccessService } from '../project-access.service';
import { ProjectAccessGuard } from './project-access.guard';

describe('ProjectAccessGuard', () => {
  const projectAccessService = {
    assertCanAccessProject: jest.fn().mockResolvedValue({ allowed: true }),
  };

  const buildContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips when route is public', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      }),
    };
    const guard = new ProjectAccessGuard(
      reflector as unknown as Reflector,
      projectAccessService as unknown as ProjectAccessService,
    );

    await expect(guard.canActivate(buildContext({}))).resolves.toBe(true);
    expect(projectAccessService.assertCanAccessProject).not.toHaveBeenCalled();
  });

  it('skips when decorator is absent', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new ProjectAccessGuard(
      reflector as unknown as Reflector,
      projectAccessService as unknown as ProjectAccessService,
    );

    await expect(
      guard.canActivate(buildContext({ user: { id: 'u1' } })),
    ).resolves.toBe(true);
  });

  it('requires project id when decorator is present', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === REQUIRE_PROJECT_ACCESS_KEY) {
          return {
            source: 'params',
            key: 'projectId',
            operation: 'read',
            required: true,
          };
        }
        return undefined;
      }),
    };
    const guard = new ProjectAccessGuard(
      reflector as unknown as Reflector,
      projectAccessService as unknown as ProjectAccessService,
    );

    await expect(
      guard.canActivate(buildContext({ user: { id: 'u1' }, params: {} })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calls assertCanAccessProject for assigned project routes', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === REQUIRE_PROJECT_ACCESS_KEY) {
          return {
            source: 'params',
            key: 'projectId',
            operation: 'approve',
            required: true,
          };
        }
        return undefined;
      }),
    };
    const guard = new ProjectAccessGuard(
      reflector as unknown as Reflector,
      projectAccessService as unknown as ProjectAccessService,
    );

    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1' },
          params: { projectId: '507f1f77bcf86cd799439011' },
          method: 'POST',
          originalUrl: '/api/v1/project-access/check/507f1f77bcf86cd799439011/approve',
          headers: {},
        }),
      ),
    ).resolves.toBe(true);

    expect(projectAccessService.assertCanAccessProject).toHaveBeenCalledWith(
      'u1',
      '507f1f77bcf86cd799439011',
      'approve',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
