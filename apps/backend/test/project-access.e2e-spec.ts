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
import { ProjectAccessGuard } from '../src/modules/project-access/guards/project-access.guard';
import type { ProjectAccessService } from '../src/modules/project-access/project-access.service';
import { createApiApp } from './helpers/create-api-app';

@Controller('project-demo')
class ProjectDemoController {
  @RequireProjectAccess({ source: 'query', key: 'projectId', operation: 'read' })
  @Get('items')
  list(@Query('projectId') projectId: string) {
    return { success: true, data: { projectId }, message: 'ok' };
  }
}

describe('Project access API (e2e)', () => {
  let app: INestApplication;
  const assertCanAccessProject = jest.fn();

  beforeAll(async () => {
    @Module({
      controllers: [ProjectDemoController],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new ProjectAccessGuard(reflector, {
              assertCanAccessProject,
            } as unknown as ProjectAccessService),
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
  });

  it('requires projectId query when decorator is present', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/project-demo/items',
    );
    expect(res.status).toBe(400);
  });

  it('calls project-access service with project id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/project-demo/items')
      .query({ projectId: '507f1f77bcf86cd799439011' })
      .expect(200);

    expect(assertCanAccessProject).toHaveBeenCalledWith(
      'user-1',
      '507f1f77bcf86cd799439011',
      'read',
      expect.any(Object),
    );
  });
});
