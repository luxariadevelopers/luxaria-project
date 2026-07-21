import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { REQUIRE_PROJECT_ACCESS_KEY } from '../decorators/require-project-access.decorator';
import { ROUTE_SCOPE_KEY } from '../decorators/route-scope.decorator';
import type { InvestorParticipationService } from '../investor-participation.service';
import type { ProjectAccessService } from '../project-access.service';
import type { ResourceOwnershipService } from '../resource-ownership.service';
import { ProjectAccessGuard } from './project-access.guard';

describe('ProjectAccessGuard (R-003 default-deny)', () => {
  const projectAccessService = {
    assertCanAccessProject: jest.fn().mockResolvedValue({ allowed: true }),
    assertProjectCompanyBoundary: jest.fn().mockResolvedValue({
      allowed: true,
      reason: 'ok',
      globalAccess: false,
      bypassPermissions: false,
    }),
    listAccessibleProjectIds: jest.fn().mockResolvedValue({
      globalAccess: false,
      projectIds: ['507f1f77bcf86cd799439011'],
    }),
    recordUnauthorizedAttempt: jest.fn().mockResolvedValue(undefined),
  };

  const resourceOwnershipService = {
    resolveOwnership: jest.fn().mockResolvedValue({
      found: true,
      projectId: '507f1f77bcf86cd799439011',
      companyId: null,
      resourceType: 'purchase-order',
      resourceId: '507f1f77bcf86cd799439099',
    }),
  };

  const investorParticipationService = {
    listAuthorisedProjectIds: jest.fn().mockResolvedValue([]),
    resolveLinkedInvestorId: jest.fn().mockResolvedValue(null),
    assertCanAccessInvestorProject: jest.fn().mockResolvedValue({
      investorId: 'i1',
      projectId: '507f1f77bcf86cd799439011',
    }),
  };

  const permissionsService = {
    resolveUserAccess: jest.fn().mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
    }),
  };

  const configService = {
    get: jest.fn().mockReturnValue('enforce'),
  };

  const siteAccessService = {
    assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
  };

  const buildGuard = (reflector: Reflector) =>
    new ProjectAccessGuard(
      reflector,
      projectAccessService as unknown as ProjectAccessService,
      resourceOwnershipService as unknown as ResourceOwnershipService,
      investorParticipationService as unknown as InvestorParticipationService,
      permissionsService as never,
      configService as never,
      siteAccessService as never,
    );

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
    configService.get.mockReturnValue('enforce');
  });

  it('skips when route is public', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(guard.canActivate(buildContext({}))).resolves.toBe(true);
    expect(projectAccessService.assertCanAccessProject).not.toHaveBeenCalled();
  });

  it('fails closed when scope metadata is absent', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(buildContext({ user: { id: 'u1' }, originalUrl: '/x' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(projectAccessService.recordUnauthorizedAttempt).toHaveBeenCalled();
  });

  it('allows explicit global scope without project assert', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) return { kind: 'global' };
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(buildContext({ user: { id: 'u1' } })),
    ).resolves.toBe(true);
    expect(projectAccessService.assertCanAccessProject).not.toHaveBeenCalled();
  });

  it('resolves project id from header and asserts', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) {
          return {
            kind: 'project',
            mode: 'single',
            operation: 'read',
            required: true,
          };
        }
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1' },
          headers: { 'x-project-id': '507f1f77bcf86cd799439011' },
          method: 'GET',
          originalUrl: '/api/v1/purchase-orders',
        }),
      ),
    ).resolves.toBe(true);
    expect(projectAccessService.assertCanAccessProject).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'u1',
        projectId: '507f1f77bcf86cd799439011',
      }),
    );
  });

  it('denies mismatched path and body project ids', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) {
          return {
            kind: 'project',
            mode: 'single',
            operation: 'create',
            required: true,
          };
        }
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1' },
          params: { projectId: '507f1f77bcf86cd799439011' },
          body: { projectId: '507f1f77bcf86cd799439012' },
          method: 'POST',
          originalUrl: '/api/v1/x',
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies header vs path mismatch even with narrowed projectIdKeys', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) {
          return {
            kind: 'project',
            mode: 'single',
            operation: 'read',
            required: true,
            projectIdKeys: [{ source: 'params', key: 'id' }],
          };
        }
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1' },
          params: { id: '507f1f77bcf86cd799439011' },
          headers: { 'x-project-id': '507f1f77bcf86cd799439012' },
          method: 'GET',
          originalUrl: '/api/v1/projects/507f1f77bcf86cd799439011',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hard-denies cross-company even in observe mode', async () => {
    configService.get.mockReturnValue('observe');
    projectAccessService.assertProjectCompanyBoundary.mockResolvedValue({
      allowed: false,
      reason: 'Project belongs to a different company',
      globalAccess: false,
      bypassPermissions: false,
    });
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) {
          return {
            kind: 'project',
            mode: 'single',
            operation: 'create',
            required: true,
          };
        }
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1', companyId: '507f1f77bcf86cd7994390aa' },
          params: { projectId: '507f1f77bcf86cd799439011' },
          body: { projectId: '507f1f77bcf86cd799439012' },
          method: 'POST',
          originalUrl: '/api/v1/x',
          headers: {},
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolves ownership from resource id', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROUTE_SCOPE_KEY) {
          return {
            kind: 'project',
            mode: 'single',
            operation: 'read',
            required: true,
            resource: { resourceType: 'purchase-order', idParam: 'id' },
          };
        }
        return undefined;
      }),
    };
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(
        buildContext({
          user: { id: 'u1' },
          params: { id: '507f1f77bcf86cd799439099' },
          headers: {},
          method: 'GET',
          originalUrl: '/api/v1/purchase-orders/507f1f77bcf86cd799439099',
        }),
      ),
    ).resolves.toBe(true);
    expect(resourceOwnershipService.resolveOwnership).toHaveBeenCalledWith(
      'purchase-order',
      '507f1f77bcf86cd799439099',
    );
  });

  it('requires project id when legacy decorator is present', async () => {
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
    const guard = buildGuard(reflector as unknown as Reflector);
    await expect(
      guard.canActivate(buildContext({ user: { id: 'u1' }, params: {} })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
