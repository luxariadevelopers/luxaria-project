import {
  Controller,
  Get,
  type INestApplication,
  Module,
  Query,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { RequireProjectAccess } from '../src/modules/project-access/decorators/require-project-access.decorator';
import { ProjectScoped } from '../src/modules/project-access/decorators/route-scope.decorator';
import { ProjectAccessGuard } from '../src/modules/project-access/guards/project-access.guard';
import type { InvestorParticipationService } from '../src/modules/project-access/investor-participation.service';
import type { ProjectAccessService } from '../src/modules/project-access/project-access.service';
import type { ResourceOwnershipService } from '../src/modules/project-access/resource-ownership.service';
import { createApiApp } from './helpers/create-api-app';

@Controller('project-demo')
class ProjectDemoController {
  @RequireProjectAccess({ source: 'query', key: 'projectId', operation: 'read' })
  @Get('items')
  list(@Query('projectId') projectId: string) {
    return { success: true, data: { projectId }, message: 'ok' };
  }

  @ProjectScoped({ mode: 'single', operation: 'read' })
  @Get('header-items')
  headerItems() {
    return { success: true, data: { ok: true }, message: 'ok' };
  }

  @Get('unclassified')
  unclassified() {
    return { success: true, data: { ok: true }, message: 'ok' };
  }
}

describe('Project access API (e2e) — R-003', () => {
  let app: INestApplication;
  const assertCanAccessProject = jest.fn();
  const listAccessibleProjectIds = jest.fn();
  const recordUnauthorizedAttempt = jest.fn();
  const resolveOwnership = jest.fn();

  beforeAll(async () => {
    @Module({
      controllers: [ProjectDemoController],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new ProjectAccessGuard(
              reflector,
              {
                assertCanAccessProject,
                listAccessibleProjectIds,
                recordUnauthorizedAttempt,
              } as unknown as ProjectAccessService,
              {
                resolveOwnership,
              } as unknown as ResourceOwnershipService,
              {
                listAuthorisedProjectIds: jest.fn(),
                resolveLinkedInvestorId: jest.fn(),
                assertCanAccessInvestorProject: jest.fn(),
              } as unknown as InvestorParticipationService,
              {
                resolveUserAccess: jest.fn().mockResolvedValue({
                  bypassPermissions: false,
                  permissions: [],
                }),
              } as never,
              {
                get: jest.fn().mockReturnValue('enforce'),
              } as never,
              {
                assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
              } as never,
            ),
          inject: [Reflector],
        },
      ],
    })
    class ProjectDemoModule {}

    const created = await createApiApp({
      metadata: { imports: [ProjectDemoModule] },
      beforeInit: (nestApp) => {
        nestApp.use(
          (req: { user?: { id: string } }, _res: unknown, next: () => void) => {
            req.user = { id: 'user-1' };
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
    assertCanAccessProject.mockReset();
    assertCanAccessProject.mockResolvedValue({ allowed: true });
    listAccessibleProjectIds.mockReset();
    listAccessibleProjectIds.mockResolvedValue({
      globalAccess: false,
      projectIds: ['507f1f77bcf86cd799439011'],
    });
    recordUnauthorizedAttempt.mockReset();
    resolveOwnership.mockReset();
  });

  it('requires projectId query when decorator is present', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/project-demo/items',
    );
    expect(res.status).toBe(400);
  });

  it('calls project-access service with project id (object form)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/project-demo/items')
      .query({ projectId: '507f1f77bcf86cd799439011' })
      .expect(200);

    expect(assertCanAccessProject).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'user-1',
        projectId: '507f1f77bcf86cd799439011',
        action: 'read',
      }),
    );
  });

  it('resolves X-Project-Id header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/project-demo/header-items')
      .set('X-Project-Id', '507f1f77bcf86cd799439011')
      .expect(200);

    expect(assertCanAccessProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: '507f1f77bcf86cd799439011',
      }),
    );
  });

  it('denies unclassified authenticated routes (default-deny)', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/project-demo/unclassified',
    );
    expect(res.status).toBe(403);
    expect(recordUnauthorizedAttempt).toHaveBeenCalled();
  });
});
