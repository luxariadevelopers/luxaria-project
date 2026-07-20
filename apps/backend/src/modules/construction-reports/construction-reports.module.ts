import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqVersion,
  BoqVersionSchema,
} from '../boq/schemas/boq.schema';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  LabourAttendance,
  LabourAttendanceSchema,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
} from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportSchema,
} from '../material-consumption/schemas/material-consumption-report.schema';
import {
  MaterialIssue,
  MaterialIssueSchema,
} from '../material-issues/schemas/material-issue.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '../purchase-orders/schemas/purchase-order.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
} from '../work-measurements/schemas/work-measurement.schema';
import { ProjectAccessModule } from '../project-access/project-access.module';
import { ConstructionReportsExportService } from './construction-reports-export.service';
import { ConstructionReportsController } from './construction-reports.controller';
import { ConstructionReportsService } from './construction-reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: BoqVersion.name, schema: BoqVersionSchema },
      { name: BoqItem.name, schema: BoqItemSchema },
      { name: WorkMeasurement.name, schema: WorkMeasurementSchema },
      { name: GoodsReceipt.name, schema: GoodsReceiptSchema },
      { name: MaterialIssue.name, schema: MaterialIssueSchema },
      { name: MaterialStockBalance.name, schema: MaterialStockBalanceSchema },
      {
        name: MaterialStockTransaction.name,
        schema: MaterialStockTransactionSchema,
      },
      {
        name: MaterialConsumptionReport.name,
        schema: MaterialConsumptionReportSchema,
      },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: LabourAttendance.name, schema: LabourAttendanceSchema },
      {
        name: ManpowerShortfallAlert.name,
        schema: ManpowerShortfallAlertSchema,
      },
      { name: Contractor.name, schema: ContractorSchema },
      { name: ContractorBill.name, schema: ContractorBillSchema },
      {
        name: DailyProgressReport.name,
        schema: DailyProgressReportSchema,
      },
      { name: DprMissingAlert.name, schema: DprMissingAlertSchema },
    ]),
    ProjectAccessModule,
  ],
  controllers: [ConstructionReportsController],
  providers: [ConstructionReportsService, ConstructionReportsExportService],
  exports: [ConstructionReportsService, ConstructionReportsExportService],
})
export class ConstructionReportsModule {}
