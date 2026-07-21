import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
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
import { SiteExecutionDashboardController } from './site-execution-dashboard.controller';
import { SiteExecutionDashboardService } from './site-execution-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyProgressReport.name, schema: DailyProgressReportSchema },
      { name: DprMissingAlert.name, schema: DprMissingAlertSchema },
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
  controllers: [SiteExecutionDashboardController],
  providers: [SiteExecutionDashboardService],
  exports: [SiteExecutionDashboardService],
})
export class SiteExecutionDashboardModule {}
