import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqItemStatus,
  BoqUnit,
  BoqVersion,
  BoqVersionSchema,
  BoqVersionStatus,
  BoqVersionType,
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
  DprStatus,
  DprWeather,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  GoodsReceipt,
  GoodsReceiptSchema,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  LabourAttendance,
  LabourAttendanceEntryMode,
  LabourAttendanceSchema,
  LabourAttendanceStatus,
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
import { MaterialUnit } from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  MaterialStockTransactionSchema,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  Project,
  ProjectSchema,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { ConstructionReportsExportService } from './construction-reports-export.service';
import { ConstructionReportType } from './construction-reports.constants';
import { ConstructionReportsService } from './construction-reports.service';

describe('ConstructionReportsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ConstructionReportsService;
  let exportService: ConstructionReportsExportService;
  let projectId: string;
  let boqItemId: Types.ObjectId;
  let contractorId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const models = {
      project: connection.model(Project.name, ProjectSchema) as Model<Project>,
      boqVersion: connection.model(
        BoqVersion.name,
        BoqVersionSchema,
      ) as Model<BoqVersion>,
      boqItem: connection.model(BoqItem.name, BoqItemSchema) as Model<BoqItem>,
      wm: connection.model(
        WorkMeasurement.name,
        WorkMeasurementSchema,
      ) as Model<WorkMeasurement>,
      grn: connection.model(
        GoodsReceipt.name,
        GoodsReceiptSchema,
      ) as Model<GoodsReceipt>,
      issue: connection.model(
        MaterialIssue.name,
        MaterialIssueSchema,
      ) as Model<MaterialIssue>,
      balance: connection.model(
        MaterialStockBalance.name,
        MaterialStockBalanceSchema,
      ) as Model<MaterialStockBalance>,
      txn: connection.model(
        MaterialStockTransaction.name,
        MaterialStockTransactionSchema,
      ) as Model<MaterialStockTransaction>,
      consumption: connection.model(
        MaterialConsumptionReport.name,
        MaterialConsumptionReportSchema,
      ) as Model<MaterialConsumptionReport>,
      po: connection.model(
        PurchaseOrder.name,
        PurchaseOrderSchema,
      ) as Model<PurchaseOrder>,
      vendor: connection.model(Vendor.name, VendorSchema) as Model<Vendor>,
      attendance: connection.model(
        LabourAttendance.name,
        LabourAttendanceSchema,
      ) as Model<LabourAttendance>,
      shortfall: connection.model(
        ManpowerShortfallAlert.name,
        ManpowerShortfallAlertSchema,
      ) as Model<ManpowerShortfallAlert>,
      contractor: connection.model(
        Contractor.name,
        ContractorSchema,
      ) as Model<Contractor>,
      bill: connection.model(
        ContractorBill.name,
        ContractorBillSchema,
      ) as Model<ContractorBill>,
      dpr: connection.model(
        DailyProgressReport.name,
        DailyProgressReportSchema,
      ) as Model<DailyProgressReport>,
      dprMissing: connection.model(
        DprMissingAlert.name,
        DprMissingAlertSchema,
      ) as Model<DprMissingAlert>,
    };

    service = new ConstructionReportsService(
      models.project,
      models.boqVersion,
      models.boqItem,
      models.wm,
      models.grn,
      models.issue,
      models.balance,
      models.txn,
      models.consumption,
      models.po,
      models.vendor,
      models.attendance,
      models.shortfall,
      models.contractor,
      models.bill,
      models.dpr,
      models.dprMissing,
    );
    exportService = new ConstructionReportsExportService(service);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    contractorId = new Types.ObjectId();
    const project = await connection.model(Project.name).create({
      projectCode: 'PRJ-CM',
      projectName: 'Construction Tower',
      projectType: ProjectType.Residential,
      startDate: new Date('2025-01-01'),
      expectedCompletionDate: new Date('2026-01-01'),
      address: {
        line1: 'Site',
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'India',
      },
    });
    projectId = String(project._id);
    const projectOid = project._id as Types.ObjectId;

    const version = await connection.model(BoqVersion.name).create({
      projectId: projectOid,
      versionNumber: 1,
      versionType: BoqVersionType.Original,
      effectiveDate: new Date('2026-01-01'),
      reason: 'Original',
      costImpact: 0,
      timeImpact: 0,
      status: BoqVersionStatus.Active,
      totalPlannedValue: 1_000_000,
    });

    const item = await connection.model(BoqItem.name).create({
      projectId: projectOid,
      versionId: version._id,
      blockId: new Types.ObjectId(),
      floorId: new Types.ObjectId(),
      workCategoryId: new Types.ObjectId(),
      boqCode: 'C-001',
      description: 'RCC footing',
      unit: BoqUnit.CubicMetre,
      plannedQuantity: 100,
      materialCost: 0,
      labourCost: 0,
      subcontractCost: 0,
      otherCost: 0,
      plannedRate: 5_000,
      plannedValue: 500_000,
      status: BoqItemStatus.Active,
    });
    boqItemId = item._id as Types.ObjectId;

    await connection.model(WorkMeasurement.name).create({
      measurementNumber: 'WM-CM-001',
      projectId: projectOid,
      contractorId,
      boqItemId,
      location: 'Block A',
      measurementDate: new Date('2026-07-10'),
      previousQuantity: 0,
      currentQuantity: 40,
      cumulativeQuantity: 40,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(),
      status: WorkMeasurementStatus.Verified,
      boqPlannedQuantity: 100,
    });

    await connection.model(MaterialStockBalance.name).create({
      materialId: new Types.ObjectId(),
      projectId: projectOid,
      location: 'Yard',
      quantityInBaseUnit: 250,
      baseUnit: MaterialUnit.Bag,
      version: 1,
    });

    await connection.model(PurchaseOrder.name).create({
      purchaseOrderNumber: 'PO-CM-001',
      projectId: projectOid,
      purchaseRequestId: new Types.ObjectId(),
      selectedQuotationId: new Types.ObjectId(),
      vendorId: new Types.ObjectId(),
      orderDate: new Date('2026-07-01'),
      expectedDeliveryDate: new Date('2026-07-05'),
      billingAddress: {
        line1: 'HQ',
        line2: null,
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'India',
      },
      deliveryAddress: {
        line1: 'Site',
        line2: null,
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'India',
      },
      items: [],
      subtotal: 100_000,
      taxes: 0,
      freight: 0,
      discount: 0,
      total: 100_000,
      balanceQuantity: 10,
      balanceAmount: 40_000,
      status: PurchaseOrderStatus.Issued,
      revisionNumber: 1,
    });

    await connection.model(LabourAttendance.name).create({
      attendanceNumber: 'LA-CM-001',
      projectId: projectOid,
      contractorId,
      attendanceDate: new Date('2026-07-15T00:00:00.000Z'),
      lines: [
        {
          labourCategoryId: new Types.ObjectId(),
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 22,
          overtimeHours: 4,
          workers: [],
        },
      ],
      status: LabourAttendanceStatus.Confirmed,
    });

    await connection.model(DailyProgressReport.name).create({
      dprNumber: 'DPR-CM-001',
      projectId: projectOid,
      reportDate: new Date('2026-07-15'),
      weather: DprWeather.Rain,
      labourCount: 22,
      skilledLabourCount: 12,
      unskilledLabourCount: 10,
      photoDocumentIds: [new Types.ObjectId()],
      siteCashBalance: 10_000,
      delays: [{ reason: 'Rain', hoursLost: 3 }],
      status: DprStatus.Submitted,
    });
  });

  it('lists all construction reports', () => {
    expect(service.listReports().data).toHaveLength(17);
  });

  it('builds BOQ budget vs actual with progress', async () => {
    const result = await service.getReport(
      ConstructionReportType.BoqBudgetVsActual,
      { projectId },
    );
    const data = result.data!;
    expect(data.totals!.plannedValue).toBe(500_000);
    expect(data.totals!.actualValue).toBe(200_000); // 40 × 5000
    const row = (data.rows as Array<{ progressPercent: number }>)[0];
    expect(row.progressPercent).toBe(40);
    expect(
      (data.rows as Array<{ drillDown: unknown[] }>)[0].drillDown.length,
    ).toBeGreaterThan(0);
  });

  it('builds planned vs actual progress', async () => {
    const result = await service.getReport(
      ConstructionReportType.PlannedVsActualProgress,
      { projectId },
    );
    expect(result.data!.totals!.progressPercent).toBe(40);
  });

  it('builds stock balance and open purchase orders', async () => {
    const stock = await service.getReport(ConstructionReportType.StockBalance, {
      projectId,
    });
    expect(stock.data!.totals!.totalQuantity).toBe(250);

    const open = await service.getReport(
      ConstructionReportType.OpenPurchaseOrders,
      { projectId, to: '2026-07-20' },
    );
    expect(open.data!.totals!.openBalance).toBe(40_000);
    expect(open.data!.totals!.overdueCount).toBe(1);
  });

  it('builds labour attendance and daily progress summary', async () => {
    const labour = await service.getReport(
      ConstructionReportType.LabourAttendance,
      { projectId },
    );
    expect(labour.data!.totals!.workerCount).toBe(22);

    const dpr = await service.getReport(
      ConstructionReportType.DailyProgressSummary,
      { projectId },
    );
    expect(dpr.data!.totals!.delayHours).toBe(3);
  });

  it('builds project delay report', async () => {
    const delay = await service.getReport(
      ConstructionReportType.ProjectDelayReport,
      { projectId, to: '2026-07-20' },
    );
    const row = (delay.data!.rows as Array<{ daysOverdue: number; delayed: boolean }>)[0];
    expect(row.daysOverdue).toBeGreaterThan(0);
    expect(row.delayed).toBe(true);
  });

  it('exports PDF and Excel', async () => {
    const xlsx = await exportService.export(
      ConstructionReportType.BoqBudgetVsActual,
      { projectId },
      'xlsx',
    );
    expect(xlsx.buffer.length).toBeGreaterThan(100);

    const pdf = await exportService.export(
      ConstructionReportType.StockBalance,
      { projectId },
      'pdf',
    );
    expect(pdf.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
