import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { SiteExecutionReportsController } from './site-execution-reports.controller';
import { SiteExecutionReportsService } from './site-execution-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
    ]),
    ProjectAccessModule,
    RbacModule,
  ],
  controllers: [SiteExecutionReportsController],
  providers: [SiteExecutionReportsService],
  exports: [SiteExecutionReportsService],
})
export class SiteExecutionReportsModule {}
