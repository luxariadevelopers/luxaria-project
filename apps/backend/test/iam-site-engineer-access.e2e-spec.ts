import {
  Controller,
  ForbiddenException,
  Get,
  type INestApplication,
  Module,
  Query,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { RequirePermissions } from '../src/modules/rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../src/modules/rbac/guards/permissions.guard';
import { ProjectScoped } from '../src/modules/project-access/decorators/route-scope.decorator';
import { ProjectAccessGuard } from '../src/modules/project-access/guards/project-access.guard';
import type { InvestorParticipationService } from '../src/modules/project-access/investor-participation.service';
import type { ProjectAccessService } from '../src/modules/project-access/project-access.service';
import type { ResourceOwnershipService } from '../src/modules/project-access/resource-ownership.service';
import { createApiApp } from './helpers/create-api-app';

/**
 * IAM vertical-slice matrix (R-003 + site scope):
 * Company A / Project A / Sites A1+A2 — Site Engineer assigned to A/A1 only.
 * - A1 allowed
 * - A2 denied when site-scoped
 * - Project B denied
 * - permission without assignment denied (existing R-003)
 * - assignment without dpr.create denied
 */
@Controller('iam-demo')
class IamDemoController {
  @ProjectScoped({ mode: 'single', operation: 'read' })
  @RequirePermissions('dpr.create')
  @Get('dpr')
  dpr(
    @Query('projectId') projectId: string,
    @Query('siteId') siteId?: string,
  ) {
    return {
      success: true,
      data: { projectId, siteId: siteId ?? null },
      message: 'ok',
    };
  }
}

describe('IAM site engineer access (e2e)', () => {
  let app: INestApplication;

  const projectA = '507f1f77bcf86cd7994390aa';
  const projectB = '507f1f77bcf86cd7994390bb';
  const siteA1 = '507f1f77bcf86cd7994390a1';
  const siteA2 = '507f1f77bcf86cd7994390a2';

  const assertCanAccessProject = jest.fn();
  const assertSiteAccessIfScoped = jest.fn();
  const hasAllPermissions = jest.fn();
  const resolveUserAccess = jest.fn();

  beforeAll(async () => {
    @Module({
      controllers: [IamDemoController],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new PermissionsGuard(reflector, {
              hasAllPermissions,
              resolveUserAccess,
            } as never),
          inject: [Reflector],
        },
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new ProjectAccessGuard(
              reflector,
              {
                assertCanAccessProject,
                listAccessibleProjectIds: jest.fn(),
                recordUnauthorizedAttempt: jest.fn(),
                assertProjectCompanyBoundary: jest.fn().mockResolvedValue({
                  allowed: true,
                  reason: 'ok',
                  globalAccess: false,
                  bypassPermissions: false,
                }),
              } as unknown as ProjectAccessService,
              {
                resolveOwnership: jest.fn(),
              } as unknown as ResourceOwnershipService,
              {
                listAuthorisedProjectIds: jest.fn(),
                resolveLinkedInvestorId: jest.fn(),
                assertCanAccessInvestorProject: jest.fn(),
              } as unknown as InvestorParticipationService,
              { resolveUserAccess } as never,
              { get: jest.fn().mockReturnValue('enforce') } as never,
              { assertSiteAccessIfScoped } as never,
            ),
          inject: [Reflector],
        },
      ],
    })
    class IamDemoModule {}

    const created = await createApiApp({
      metadata: { imports: [IamDemoModule] },
      beforeInit: (nestApp) => {
        nestApp.use(
          (
            req: { user?: { id: string; companyId: string } },
            _res: unknown,
            next: () => void,
          ) => {
            req.user = { id: 'site-engineer-1', companyId: 'company-a' };
            next();
          },
        );
      },
    });
    app = created.app;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: ['dpr.create', 'project.view'],
    });
    hasAllPermissions.mockResolvedValue(true);
    assertCanAccessProject.mockImplementation(
      async (input: { projectId: string }) => {
        if (input.projectId === projectA) {
          return { allowed: true };
        }
        throw new ForbiddenException('Project access denied');
      },
    );
    assertSiteAccessIfScoped.mockImplementation(
      async (input: { projectId: string; siteId?: string | null }) => {
        if (!input.siteId) return;
        if (input.projectId === projectA && input.siteId === siteA1) return;
        throw new ForbiddenException('Site access denied');
      },
    );
  });

  it('allows Site Engineer on Project A / Site A1', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/iam-demo/dpr?projectId=${projectA}&siteId=${siteA1}`)
      .expect(200);
    expect(assertCanAccessProject).toHaveBeenCalled();
    expect(assertSiteAccessIfScoped).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: projectA,
        siteId: siteA1,
      }),
    );
  });

  it('denies Site A2 when site-scoped', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/iam-demo/dpr?projectId=${projectA}&siteId=${siteA2}`)
      .expect(403);
  });

  it('denies Project B (R-003)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/iam-demo/dpr?projectId=${projectB}&siteId=${siteA1}`)
      .expect(403);
  });

  it('denies when permission missing even with assignment', async () => {
    hasAllPermissions.mockResolvedValue(false);
    await request(app.getHttpServer())
      .get(`/api/v1/iam-demo/dpr?projectId=${projectA}&siteId=${siteA1}`)
      .expect(403);
  });

  it('denies project without assignment (permission alone insufficient)', async () => {
    assertCanAccessProject.mockRejectedValue(
      new ForbiddenException('No active project assignment'),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/iam-demo/dpr?projectId=${projectA}&siteId=${siteA1}`)
      .expect(403);
  });
});
