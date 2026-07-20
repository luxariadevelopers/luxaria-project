import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ApprovalsModule } from '../approvals/approvals.module';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { Role, RoleSchema } from '../rbac/schemas/role.schema';
import { ContractorAgreementsController } from './contractor-agreements.controller';
import { ContractorAgreementsScheduler } from './contractor-agreements.scheduler';
import { ContractorAgreementsSeedService } from './contractor-agreements.seed.service';
import { ContractorAgreementsService } from './contractor-agreements.service';
import {
  ContractorAgreement,
  ContractorAgreementExpiryAlert,
  ContractorAgreementExpiryAlertSchema,
  ContractorAgreementSchema,
} from './schemas/contractor-agreement.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    MongooseModule.forFeature([
      { name: ContractorAgreement.name, schema: ContractorAgreementSchema },
      {
        name: ContractorAgreementExpiryAlert.name,
        schema: ContractorAgreementExpiryAlertSchema,
      },
      { name: Contractor.name, schema: ContractorSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    ApprovalsModule,
    RbacModule,
  ],
  controllers: [ContractorAgreementsController],
  providers: [
    ContractorAgreementsService,
    ContractorAgreementsScheduler,
    ContractorAgreementsSeedService,
  ],
  exports: [ContractorAgreementsService, MongooseModule],
})
export class ContractorAgreementsModule {}
