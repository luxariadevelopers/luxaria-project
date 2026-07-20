import {
  Controller,
  Get,
  type INestApplication,
  Module,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { Public } from '../src/common/decorators/public.decorator';
import { RequirePermissions } from '../src/modules/rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../src/modules/rbac/guards/permissions.guard';
import type { PermissionsService } from '../src/modules/rbac/permissions.service';
import { createApiApp } from './helpers/create-api-app';

@Controller('perm-demo')
class PermDemoController {
  @Public()
  @Get('public')
  publicRoute() {
    return { success: true, data: { ok: true }, message: 'ok' };
  }

  @RequirePermissions('journal.view')
  @Get('protected')
  protectedRoute() {
    return { success: true, data: { ok: true }, message: 'ok' };
  }
}

describe('Permissions API (e2e)', () => {
  let app: INestApplication;
  const hasAllPermissions = jest.fn();

  beforeAll(async () => {
    @Module({
      controllers: [PermDemoController],
      providers: [
        Reflector,
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector) =>
            new PermissionsGuard(reflector, {
              hasAllPermissions,
            } as unknown as PermissionsService),
          inject: [Reflector],
        },
      ],
    })
    class PermDemoModule {}

    const created = await createApiApp({
      metadata: { imports: [PermDemoModule] },
      beforeInit: (nestApp) => {
        nestApp.use(
          (
            req: { user?: { id: string }; originalUrl?: string; url?: string },
            _res: unknown,
            next: () => void,
          ) => {
            const url = `${req.originalUrl ?? ''} ${req.url ?? ''}`;
            if (url.includes('protected')) {
              req.user = { id: 'user-1' };
            }
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
    hasAllPermissions.mockReset();
  });

  it('allows public routes without permission checks', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/perm-demo/public')
      .expect(200);
    expect(hasAllPermissions).not.toHaveBeenCalled();
  });

  it('forbids protected routes when user lacks permission', async () => {
    hasAllPermissions.mockResolvedValue(false);
    await request(app.getHttpServer())
      .get('/api/v1/perm-demo/protected')
      .expect(403);
    expect(hasAllPermissions).toHaveBeenCalled();
  });

  it('allows protected routes when user has permission', async () => {
    hasAllPermissions.mockResolvedValue(true);
    await request(app.getHttpServer())
      .get('/api/v1/perm-demo/protected')
      .expect(200);
  });
});
