import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  LabourCategory,
  LabourCategorySchema,
} from '../labour-categories/schemas/labour-category.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import { LabourAttendanceController } from './labour-attendance.controller';
import { LabourAttendanceService } from './labour-attendance.service';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from './schemas/labour-attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: LabourCategory.name, schema: LabourCategorySchema },
    ]),
    RbacModule,
  ],
  controllers: [LabourAttendanceController],
  providers: [LabourAttendanceService],
  exports: [LabourAttendanceService, MongooseModule],
})
export class LabourAttendanceModule {}
