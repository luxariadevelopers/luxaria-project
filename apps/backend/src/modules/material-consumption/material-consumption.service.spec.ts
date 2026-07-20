import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BoqItem,
  BoqItemSchema,
  BoqUnit,
  BoqVersion,
  BoqVersionSchema,
  BoqVersionStatus,
  BoqVersionType,
} from '../boq/schemas/boq.schema';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardSchema,
} from '../material-consumption-standards/schemas/material-consumption-standard.schema';
import {
  MaterialIssue,
  MaterialIssueSchema,
  MaterialIssueStatus,
} from '../material-issues/schemas/material-issue.schema';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { PermissionsService } from '../rbac/permissions.service';
import {
  StockCount,
  StockCountSchema,
  StockCountStatus,
} from '../stock-counts/schemas/stock-count.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { MaterialConsumptionAlert } from './material-consumption.validation';
import { MaterialConsumptionService } from './material-consumption.service';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportSchema,
  MaterialConsumptionReportStatus,
} from './schemas/material-consumption-report.schema';

describe('MaterialConsumptionService', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let service: MaterialConsumptionService;
  let reportModel: Model<MaterialConsumptionReport>;
  let measurementModel: Model<WorkMeasurement>;
  let issueModel: Model<MaterialIssue>;
  let boqItemModel: Model<BoqItem>;
  let boqVersionModel: Model<BoqVersion>;
  let materialModel: Model<Material>;
  let standardModel: Model<MaterialConsumptionStandard>;
  let stockCountModel: Model<StockCount>;
  let permissionsService: { resolveUserAccess: jest.Mock };

  let projectId: string;
  let actorId: string;
  let approverId: string;
  let materialId: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    reportModel = connection.model(
      MaterialConsumptionReport.name,
      MaterialConsumptionReportSchema,
    ) as Model<MaterialConsumptionReport>;
    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    issueModel = connection.model(
      MaterialIssue.name,
      MaterialIssueSchema,
    ) as Model<MaterialIssue>;
    boqItemModel = connection.model(
      BoqItem.name,
      BoqItemSchema,
    ) as Model<BoqItem>;
    boqVersionModel = connection.model(
      BoqVersion.name,
      BoqVersionSchema,
    ) as Model<BoqVersion>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    standardModel = connection.model(
      MaterialConsumptionStandard.name,
      MaterialConsumptionStandardSchema,
    ) as Model<MaterialConsumptionStandard>;
    stockCountModel = connection.model(
      StockCount.name,
      StockCountSchema,
    ) as Model<StockCount>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      reportModel.syncIndexes(),
      measurementModel.syncIndexes(),
      issueModel.syncIndexes(),
      boqItemModel.syncIndexes(),
      boqVersionModel.syncIndexes(),
      materialModel.syncIndexes(),
      standardModel.syncIndexes(),
      stockCountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    permissionsService = {
      resolveUserAccess: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'materialConsumptionVarianceThresholdPercent') return 5;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;

    service = new MaterialConsumptionService(
      reportModel,
      measurementModel,
      issueModel,
      boqItemModel,
      boqVersionModel,
      materialModel,
      standardModel,
      stockCountModel,
      new NumberingService(counterModel),
      permissionsService as unknown as PermissionsService,
      configService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approverId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();

    await Promise.all([
      reportModel.deleteMany({}).setOptions({ withDeleted: true }),
      measurementModel.deleteMany({}).setOptions({ withDeleted: true }),
      issueModel.deleteMany({}).setOptions({ withDeleted: true }),
      boqItemModel.deleteMany({}).setOptions({ withDeleted: true }),
      boqVersionModel.deleteMany({}).setOptions({ withDeleted: true }),
      materialModel.deleteMany({}).setOptions({ withDeleted: true }),
      standardModel.deleteMany({}).setOptions({ withDeleted: true }),
      stockCountModel.deleteMany({}).setOptions({ withDeleted: true }),
      connection.model(Counter.name).deleteMany({}),
    ]);

    permissionsService.resolveUserAccess.mockResolvedValue({
      userId: approverId,
      roleIds: [],
      roleCodes: [],
      permissions: ['material_consumption.approve'],
      bypassPermissions: false,
    });

    const [material] = await materialModel.create([
      {
        materialCode: 'MAT-CEM-001',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        standardRate: 400,
        minimumStock: 0,
        reorderLevel: 0,
        maximumStock: 0,
        standardWastagePercentage: 2,
        ledgerAccountId: new Types.ObjectId(),
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);

    const versionId = new Types.ObjectId();
    await boqVersionModel.create({
      _id: versionId,
      projectId: new Types.ObjectId(projectId),
      versionNumber: 1,
      versionType: BoqVersionType.Original,
      status: BoqVersionStatus.Active,
      effectiveDate: new Date('2026-01-01'),
      reason: 'Original BOQ',
      costImpact: 0,
      timeImpact: 0,
      totalPlannedValue: 0,
    });

    const [boqItem] = await boqItemModel.create([
      {
        projectId: new Types.ObjectId(projectId),
        versionId,
        blockId: new Types.ObjectId(),
        floorId: new Types.ObjectId(),
        workCategoryId: new Types.ObjectId(),
        boqCode: 'RCC-001',
        description: 'RCC columns',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 100,
        materialCost: 0,
        labourCost: 0,
        subcontractCost: 0,
        otherCost: 0,
        plannedRate: 0,
        plannedValue: 0,
        materialCoefficients: [
          {
            materialId: material._id,
            materialCode: 'MAT-CEM-001',
            description: 'Cement bags',
            coefficient: 7.5,
            unit: BoqUnit.CubicMetre,
          },
        ],
      },
    ]);
    await measurementModel.create({
      measurementNumber: 'WM-2026-000001',
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(),
      boqItemId: boqItem._id,
      boqCode: 'RCC-001',
      location: 'Block A',
      measurementDate: new Date('2026-07-10'),
      previousQuantity: 0,
      currentQuantity: 10,
      cumulativeQuantity: 10,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(actorId),
      status: WorkMeasurementStatus.Verified,
      verifiedBy: new Types.ObjectId(actorId),
      verifiedAt: new Date('2026-07-11'),
      boqPlannedQuantity: 100,
    });

    await issueModel.create({
      issueNumber: 'MI-2026-000001',
      projectId: new Types.ObjectId(projectId),
      issueDate: new Date('2026-07-08'),
      issuedBy: new Types.ObjectId(actorId),
      receivedBy: new Types.ObjectId(),
      boqItemId: boqItem._id,
      workLocation: 'Block A',
      storeLocation: '',
      status: MaterialIssueStatus.Confirmed,
      confirmedBy: new Types.ObjectId(actorId),
      confirmedAt: new Date('2026-07-08'),
      items: [
        {
          materialId: material._id,
          materialCode: 'MAT-CEM-001',
          materialName: 'Cement',
          unit: MaterialUnit.Bag,
          quantity: 80,
          baseUnit: MaterialUnit.Bag,
          baseUnitQuantity: 80,
          returnedBaseQuantity: 2,
        },
      ],
      returns: [],
      signatures: {},
    });
  });

  it('generates report with theoretical vs actual metrics and above-variance alert', async () => {
    const result = await service.generate(
      { projectId, asOfDate: '2026-07-17' },
      actorId,
    );

    expect(result.data?.reportNumber).toMatch(/^MCR-/);
    expect(result.data?.status).toBe(MaterialConsumptionReportStatus.Draft);
    expect(result.data?.lines).toHaveLength(1);

    const line = result.data!.lines[0]!;
    expect(line.workQuantityCompleted).toBe(10);
    expect(line.standardMaterialRequirement).toBe(75);
    expect(line.allowedWastage).toBe(1.5);
    expect(line.expectedConsumption).toBe(76.5);
    expect(line.actualMaterialIssued).toBe(80);
    expect(line.materialReturned).toBe(2);
    expect(line.netActualConsumption).toBe(78);
    expect(line.varianceQuantity).toBe(1.5);
    expect(line.varianceValue).toBe(600);
    expect(line.alerts).toContain(
      MaterialConsumptionAlert.AboveAllowedVariance,
    );
    expect(line.requiresApproval).toBe(true);
    expect(result.data?.requiresApproval).toBe(true);
  });

  it('requires explanation on submit and approval comment on approve', async () => {
    const created = await service.generate({ projectId }, actorId);
    const id = created.data!.id;
    const lineId = created.data!.lines[0]!.id;

    await expect(service.submit(id, actorId)).rejects.toThrow(
      BadRequestException,
    );

    await service.update(
      id,
      {
        explanations: [
          { lineId, explanation: 'Richer mix for columns as directed' },
        ],
      },
      actorId,
    );

    const submitted = await service.submit(id, actorId);
    expect(submitted.data?.status).toBe(
      MaterialConsumptionReportStatus.Submitted,
    );

    await expect(service.approve(id, approverId, {})).rejects.toThrow(
      BadRequestException,
    );

    const approved = await service.approve(id, approverId, {
      approvalComment: 'Accepted — temporary design change',
    });
    expect(approved.data?.status).toBe(
      MaterialConsumptionReportStatus.Approved,
    );
    expect(approved.data?.approvalComment).toContain('Accepted');
  });

  it('blocks approve without material_consumption.approve', async () => {
    const created = await service.generate({ projectId }, actorId);
    const lineId = created.data!.lines[0]!.id;
    await service.update(
      created.data!.id,
      { explanations: [{ lineId, explanation: 'Explained' }] },
      actorId,
    );
    await service.submit(created.data!.id, actorId);

    permissionsService.resolveUserAccess.mockResolvedValue({
      userId: approverId,
      roleIds: [],
      roleCodes: [],
      permissions: ['material_consumption.view'],
      bypassPermissions: false,
    });

    await expect(
      service.approve(created.data!.id, approverId, {
        approvalComment: 'ok',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('alerts on progress without material issue', async () => {
    await issueModel.deleteMany({});
    const result = await service.generate({ projectId }, actorId);
    const line = result.data!.lines[0]!;
    expect(line.actualMaterialIssued).toBe(0);
    expect(line.alerts).toContain(
      MaterialConsumptionAlert.ProgressWithoutMaterialIssue,
    );
  });

  it('alerts on material issue without progress', async () => {
    await measurementModel.deleteMany({});
    const result = await service.generate({ projectId }, actorId);
    const line = result.data!.lines[0]!;
    expect(line.workQuantityCompleted).toBe(0);
    expect(line.alerts).toContain(
      MaterialConsumptionAlert.MaterialIssueWithoutProgress,
    );
  });

  it('alerts on unexplained stock shortage', async () => {
    await stockCountModel.create({
      countNumber: 'SC-2026-000001',
      projectId: new Types.ObjectId(projectId),
      countDate: new Date('2026-07-15'),
      countedBy: new Types.ObjectId(actorId),
      location: '',
      status: StockCountStatus.Submitted,
      items: [
        {
          materialId: new Types.ObjectId(materialId),
          materialCode: 'MAT-CEM-001',
          materialName: 'Cement',
          baseUnit: MaterialUnit.Bag,
          systemQuantity: 50,
          physicalQuantity: 40,
          difference: -10,
          reason: null,
          isLargeVariance: true,
        },
      ],
    });

    const result = await service.generate({ projectId }, actorId);
    expect(result.data!.lines[0]!.alerts).toContain(
      MaterialConsumptionAlert.UnexplainedStockShortage,
    );
  });
});
