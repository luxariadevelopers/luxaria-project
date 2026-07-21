import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { CompanyModule } from '../company/company.module';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import {
  ProjectFile,
  ProjectFileSchema,
} from './schemas/project-document.schema';
import { Project, ProjectSchema } from './schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
    ]),
    AuditLogModule,
    forwardRef(() => UsersModule),
    CompanyModule,
    forwardRef(() => ProjectAccessModule),
    RbacModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, MongooseModule],
})
export class ProjectsModule {}
