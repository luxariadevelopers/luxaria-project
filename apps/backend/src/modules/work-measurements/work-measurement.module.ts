import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BoqModule } from '../boq/boq.module';
import {
  BoqItem,
  BoqItemSchema,
  BoqVersion,
  BoqVersionSchema,
} from '../boq/schemas/boq.schema';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { SitesModule } from '../sites/sites.module';
import { WorkMeasurementController } from './work-measurement.controller';
import { WorkMeasurementService } from './work-measurement.service';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from './schemas/work-measurement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
    ]),
    ProjectAccessModule,
    SitesModule,
    BoqModule,
  ],
  controllers: [WorkMeasurementController],
  providers: [WorkMeasurementService],
  exports: [WorkMeasurementService, MongooseModule],
})
export class WorkMeasurementsModule {}
