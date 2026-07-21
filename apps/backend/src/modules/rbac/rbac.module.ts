import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionOverridesController } from './permission-overrides.controller';
import { PermissionOverridesService } from './permission-overrides.service';
import { PermissionsService } from './permissions.service';
import { RbacController } from './rbac.controller';
import { RbacSeedService } from './rbac.seed.service';
import { RolesService } from './roles.service';
import {
  PermissionOverride,
  PermissionOverrideSchema,
} from './schemas/permission-override.schema';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: PermissionOverride.name, schema: PermissionOverrideSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [RbacController, PermissionOverridesController],
  providers: [
    RolesService,
    PermissionsService,
    PermissionOverridesService,
    RbacSeedService,
    PermissionsGuard,
  ],
  // APP_GUARD for PermissionsGuard is registered in AuthModule after JwtAuthGuard
  // so request.user is available when permission checks run.
  exports: [
    RolesService,
    PermissionsService,
    PermissionOverridesService,
    PermissionsGuard,
    MongooseModule,
  ],
})
export class RbacModule {}
