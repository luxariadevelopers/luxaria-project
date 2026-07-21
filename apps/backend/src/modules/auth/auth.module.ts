import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { AppConfig } from '../../config/configuration';
import { CompanyModule } from '../company/company.module';
import { EmployeesModule } from '../employees/employees.module';
import { ProjectAccessGuard } from '../project-access/guards/project-access.guard';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RbacModule } from '../rbac/rbac.module';
import { SessionModule } from '../sessions/session.module';
import { SitesModule } from '../sites/sites.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    CompanyModule,
    EmployeesModule,
    RbacModule,
    ProjectAccessModule,
    forwardRef(() => SitesModule),
    SessionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<AppConfig['jwtAccessSecret']>('jwtAccessSecret'),
        signOptions: {
          expiresIn: configService.getOrThrow<AppConfig['jwtAccessExpiresIn']>(
            'jwtAccessExpiresIn',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Order matters: JWT must populate request.user before permission / project checks.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ProjectAccessGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
