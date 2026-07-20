import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { ProjectAccessController } from './project-access.controller';
import { ProjectAccessService } from './project-access.service';
import {
  ProjectAssignment,
  ProjectAssignmentSchema,
} from './schemas/project-assignment.schema';
import {
  UnauthorizedProjectAccess,
  UnauthorizedProjectAccessSchema,
} from './schemas/unauthorized-project-access.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectAssignment.name, schema: ProjectAssignmentSchema },
      { name: UnauthorizedProjectAccess.name, schema: UnauthorizedProjectAccessSchema },
    ]),
    forwardRef(() => UsersModule),
    RbacModule,
  ],
  controllers: [ProjectAccessController],
  providers: [ProjectAccessService, ProjectAccessGuard],
  // APP_GUARD for ProjectAccessGuard is registered in AuthModule after JwtAuthGuard.
  exports: [ProjectAccessService, ProjectAccessGuard, MongooseModule],
})
export class ProjectAccessModule {}
