import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '../../modules/auth/auth.module';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { ProjectAccessGuard } from '../../modules/project-access/guards/project-access.guard';
import { PermissionsGuard } from '../../modules/rbac/guards/permissions.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('security guards registration', () => {
  it('registers JWT before permissions and project-access as APP_GUARD', () => {
    const providers =
      (Reflect.getMetadata('providers', AuthModule) as Array<{
        provide?: unknown;
        useClass?: unknown;
      }> ?? []);

    const guardClasses = providers
      .filter((p) => p?.provide === APP_GUARD)
      .map((p) => p.useClass);

    expect(guardClasses).toEqual([
      JwtAuthGuard,
      ThrottlerGuard,
      PermissionsGuard,
      ProjectAccessGuard,
    ]);
  });
});
