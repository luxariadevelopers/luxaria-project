import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../company/schemas/company.schema';
import { EmployeesModule } from '../employees/employees.module';
import {
  Investor,
  InvestorSchema,
} from '../investors/schemas/investor.schema';
import {
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { SitesModule } from '../sites/sites.module';
import { UsersModule } from '../users/users.module';
import { ActorContextService } from './actor-context.service';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { InvestorParticipationService } from './investor-participation.service';
import { ProjectAccessController } from './project-access.controller';
import { ProjectAccessService } from './project-access.service';
import { ProjectScopedDataHelper } from './project-scoped-data.helper';
import { ResourceOwnershipService } from './resource-ownership.service';
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
    ConfigModule,
    MongooseModule.forFeature([
      { name: ProjectAssignment.name, schema: ProjectAssignmentSchema },
      { name: UnauthorizedProjectAccess.name, schema: UnauthorizedProjectAccessSchema },
      { name: Investor.name, schema: InvestorSchema },
      { name: ProjectParticipant.name, schema: ProjectParticipantSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => EmployeesModule),
    forwardRef(() => SitesModule),
    RbacModule,
  ],
  controllers: [ProjectAccessController],
  providers: [
    ProjectAccessService,
    ProjectAccessGuard,
    ResourceOwnershipService,
    InvestorParticipationService,
    ProjectScopedDataHelper,
    ActorContextService,
  ],
  exports: [
    ProjectAccessService,
    ProjectAccessGuard,
    ResourceOwnershipService,
    InvestorParticipationService,
    ProjectScopedDataHelper,
    ActorContextService,
    MongooseModule,
  ],
})
export class ProjectAccessModule {}
