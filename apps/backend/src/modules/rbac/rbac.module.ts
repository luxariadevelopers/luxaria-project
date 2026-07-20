import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsService } from './permissions.service';
import { RbacController } from './rbac.controller';
import { RbacSeedService } from './rbac.seed.service';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    forwardRef(() => UsersModule),
  ],
  controllers: [RbacController],
  providers: [RolesService, PermissionsService, RbacSeedService, PermissionsGuard],
  // APP_GUARD for PermissionsGuard is registered in AuthModule after JwtAuthGuard
  // so request.user is available when permission checks run.
  exports: [RolesService, PermissionsService, PermissionsGuard, MongooseModule],
})
export class RbacModule {}
