import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanyModule } from '../company/company.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { ContractorsController } from './contractors.controller';
import { ContractorsService } from './contractors.service';
import {
  ContractorFile,
  ContractorFileSchema,
} from './schemas/contractor-document.schema';
import {
  ContractorProjectAssignment,
  ContractorProjectAssignmentSchema,
} from './schemas/contractor-project-assignment.schema';
import { Contractor, ContractorSchema } from './schemas/contractor.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contractor.name, schema: ContractorSchema },
      { name: ContractorFile.name, schema: ContractorFileSchema },
      {
        name: ContractorProjectAssignment.name,
        schema: ContractorProjectAssignmentSchema,
      },
      { name: Project.name, schema: ProjectSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
    ]),
    CompanyModule,
    RbacModule,
  ],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService, MongooseModule],
})
export class ContractorsModule {}
