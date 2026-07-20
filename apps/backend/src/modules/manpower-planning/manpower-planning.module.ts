import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  BoqItem,
  BoqItemSchema,
} from '../boq/schemas/boq.schema';
import {
  ContractorAgreement,
  ContractorAgreementSchema,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { RbacModule } from '../rbac/rbac.module';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { ManpowerPlanningController } from './manpower-planning.controller';
import { ManpowerPlanningScheduler } from './manpower-planning.scheduler';
import { ManpowerPlanningService } from './manpower-planning.service';
import {
  ManpowerDailyPlan,
  ManpowerDailyPlanSchema,
} from './schemas/manpower-plan.schema';
import {
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
} from './schemas/manpower-shortfall-alert.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: ManpowerDailyPlan.name, schema: ManpowerDailyPlanSchema },
      {
        name: ManpowerShortfallAlert.name,
        schema: ManpowerShortfallAlertSchema,
      },
      { name: ContractorAgreement.name, schema: ContractorAgreementSchema },
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Contractor.name, schema: ContractorSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
    ]),
    RbacModule,
  ],
  controllers: [ManpowerPlanningController],
  providers: [ManpowerPlanningService, ManpowerPlanningScheduler],
  exports: [ManpowerPlanningService, MongooseModule],
})
export class ManpowerPlanningModule {}
