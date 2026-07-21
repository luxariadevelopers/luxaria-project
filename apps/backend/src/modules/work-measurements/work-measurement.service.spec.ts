import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
  DailyProgressReport,
  DailyProgressReportSchema,
  DprStatus,
  DprWeather,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { WorkMeasurementService } from './work-measurement.service';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from './schemas/work-measurement.schema';

describe('WorkMeasurementService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: WorkMeasurementService;
  let measurementModel: Model<WorkMeasurement>;
  let projectModel: Model<Project>;
  let boqItemModel: Model<BoqItem>;
  let boqVersionModel: Model<BoqVersion>;
  let dprModel: Model<DailyProgressReport>;
  let boqService: {
    applyCertifiedProgressQuantity: (
      id: string,
      progressQuantity: number,
      actorId?: string,
    ) => Promise<BoqItem>;
  };

  let actorId: string;
  let engineerId: string;
  let projectId: string;
  let contractorId: string;
  let boqItemId: string;
  let versionId: string;
  let dprId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    boqItemModel = connection.model(
      BoqItem.name,
      BoqItemSchema,
    ) as Model<BoqItem>;
    boqVersionModel = connection.model(
      BoqVersion.name,
      BoqVersionSchema,
    ) as Model<BoqVersion>;
    dprModel = connection.model(
      DailyProgressReport.name,
      DailyProgressReportSchema,
    ) as Model<DailyProgressReport>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      measurementModel.syncIndexes(),
      projectModel.syncIndexes(),
      boqItemModel.syncIndexes(),
      boqVersionModel.syncIndexes(),
      dprModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);
    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;

    const mockSiteAccess = {
      assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
    } as never;
    const mockSites = {
      findById: jest.fn().mockResolvedValue(null),
    } as never;

    boqService = {
      applyCertifiedProgressQuantity: async (
        id: string,
        progressQuantity: number,
        actorIdArg?: string,
      ) => {
        const row = await boqItemModel.findById(id).exec();
        if (!row) throw new Error('BOQ item not found');
        row.progressQuantity = progressQuantity;
        if (actorIdArg) {
          row.set('updatedBy', new Types.ObjectId(actorIdArg));
        }
        await row.save();
        return row;
      },
    };

    service = new WorkMeasurementService(
      measurementModel,
      projectModel,
      boqItemModel,
      boqVersionModel,
      dprModel,
      new NumberingService(counterModel),
      mockProjectScope,
      mockSiteAccess,
      mockSites,
      boqService as never,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    engineerId = new Types.ObjectId().toHexString();
    contractorId = new Types.ObjectId().toHexString();

    await measurementModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqItemModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqVersionModel.deleteMany({}).setOptions({ withDeleted: true });
    await dprModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await projectModel.create([
      {
        projectCode: 'PRJ-WM-001',
        projectName: 'WM Test Tower',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
      },
    ]);
    projectId = String(project._id);

    const [version] = await boqVersionModel.create([
      {
        projectId: project._id,
        versionNumber: 1,
        versionType: BoqVersionType.Original,
        effectiveDate: new Date('2026-01-01'),
        reason: 'Original BOQ',
        costImpact: 0,
        timeImpact: 0,
        approvalReference: null,
        status: BoqVersionStatus.Active,
        totalPlannedValue: 100000,
      },
    ]);
    versionId = String(version._id);

    const [item] = await boqItemModel.create([
      {
        projectId: project._id,
        versionId: version._id,
        blockId: new Types.ObjectId(),
        floorId: new Types.ObjectId(),
        workCategoryId: new Types.ObjectId(),
        boqCode: 'BOQ-COL-01',
        description: 'RCC Columns',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 100,
        progressQuantity: 0,
        materialCost: 0,
        labourCost: 0,
        subcontractCost: 0,
        otherCost: 0,
        plannedRate: 1000,
        plannedValue: 100000,
        status: BoqItemStatus.Active,
      },
    ]);
    boqItemId = String(item._id);

    const [dpr] = await dprModel.create([
      {
        dprNumber: 'DPR-WM-001',
        projectId: project._id,
        reportDate: new Date('2026-07-17'),
        weather: DprWeather.Clear,
        labourCount: 0,
        skilledLabourCount: 0,
        unskilledLabourCount: 0,
        siteCashBalance: 0,
        status: DprStatus.Draft,
      },
    ]);
    dprId = String(dpr._id);
  });

  it('creates measurement with previous/cumulative and WM number', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A / L2',
        measurementDate: '2026-07-17',
        currentQuantity: 25,
        sheetReference: 'MB-01 / Sheet 2',
        workDescription: 'Column casting up to +3.0m',
        drawingReference: 'DRG-COL-02',
        photoDocumentIds: [new Types.ObjectId().toHexString()],
      },
      actorId,
    );

    expect(created.data!.status).toBe(WorkMeasurementStatus.Draft);
    expect(created.data!.measurementNumber).toMatch(/^WM-/);
    expect(created.data!.previousQuantity).toBe(0);
    expect(created.data!.currentQuantity).toBe(25);
    expect(created.data!.cumulativeQuantity).toBe(25);
    expect(created.data!.unit).toBe(BoqUnit.CubicMetre);
    expect(created.data!.measuredBy).toBe(actorId);
    expect(created.data!.photos).toHaveLength(1);
    expect(created.data!.drawingReference).toBe('DRG-COL-02');
    expect(created.data!.sheetReference).toBe('MB-01 / Sheet 2');
    expect(created.data!.workDescription).toBe('Column casting up to +3.0m');
    expect(created.data!.verifiedBy).toBeNull();
    expect(created.data!.dprId).toBeNull();
    expect(created.data!.siteId).toBeNull();
    expect(created.data!.drawingId).toBeNull();
  });

  it('links measurement to DPR and lists by dprId', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        dprId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 10,
      },
      actorId,
    );
    expect(created.data!.dprId).toBe(dprId);

    const dpr = await dprModel.findById(dprId).lean().exec();
    expect(dpr!.workMeasurementIds.map(String)).toContain(created.data!.id);

    const listed = await service.list({ dprId, projectId }, actorId);
    expect(listed.data).toHaveLength(1);
    expect(listed.data![0].id).toBe(created.data!.id);
  });

  it('requires engineer verification by a different user', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 10,
        submit: true,
      },
      actorId,
    );
    expect(created.data!.status).toBe(WorkMeasurementStatus.Submitted);

    await expect(
      service.verify(created.data!.id, {}, actorId),
    ).rejects.toThrow(ForbiddenException);

    const verified = await service.verify(created.data!.id, {}, engineerId);
    expect(verified.data!.status).toBe(WorkMeasurementStatus.Verified);
    expect(verified.data!.verifiedBy).toBe(engineerId);
    expect(verified.data!.verifiedAt).toBeTruthy();

    const boqAfterVerify = await boqItemModel.findById(boqItemId).lean().exec();
    expect(boqAfterVerify!.progressQuantity).toBe(0);
  });

  it('certify updates BOQ progressQuantity from cumulative certified qty', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 40,
        submit: true,
      },
      actorId,
    );
    await service.verify(created.data!.id, {}, engineerId);

    await expect(
      service.certify(created.data!.id, {}, actorId),
    ).rejects.toThrow(ForbiddenException);

    const certified = await service.certify(
      created.data!.id,
      { notes: 'Accepted for progress' },
      engineerId,
    );
    expect(certified.data!.status).toBe(WorkMeasurementStatus.Certified);
    expect(certified.data!.certifiedBy).toBe(engineerId);
    expect(certified.data!.certifiedAt).toBeTruthy();

    const boq = await boqItemModel.findById(boqItemId).lean().exec();
    expect(boq!.progressQuantity).toBe(40);
  });

  it('approve is an alias for certify', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 15,
        submit: true,
      },
      actorId,
    );
    await service.verify(created.data!.id, {}, engineerId);
    const approved = await service.approve(created.data!.id, {}, engineerId);
    expect(approved.data!.status).toBe(WorkMeasurementStatus.Certified);

    const boq = await boqItemModel.findById(boqItemId).lean().exec();
    expect(boq!.progressQuantity).toBe(15);
  });

  it('rejects cumulative quantity above BOQ without approved variation', async () => {
    await expect(
      service.create(
        {
          projectId,
          contractorId,
          boqItemId,
          location: 'Block A',
          measurementDate: '2026-07-17',
          currentQuantity: 110,
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          boqItemId,
          location: 'Block A',
          measurementDate: '2026-07-17',
          currentQuantity: 110,
        },
        actorId,
      ),
    ).rejects.toThrow(/Approve a BOQ variation/);
  });

  it('allows cumulative up to BOQ raised by approved active variation', async () => {
    await boqVersionModel.updateOne(
      { _id: versionId },
      { $set: { status: BoqVersionStatus.Superseded } },
    );

    const [variation] = await boqVersionModel.create([
      {
        projectId: new Types.ObjectId(projectId),
        versionNumber: 2,
        versionType: BoqVersionType.Variation,
        effectiveDate: new Date('2026-07-01'),
        reason: 'Extra columns',
        costImpact: 20000,
        timeImpact: 5,
        approvalReference: 'APR-VAR-001',
        status: BoqVersionStatus.Active,
        totalPlannedValue: 120000,
      },
    ]);

    await boqItemModel.updateOne(
      { _id: boqItemId },
      {
        $set: {
          versionId: variation._id,
          plannedQuantity: 120,
          plannedValue: 120000,
        },
      },
    );

    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 110,
      },
      actorId,
    );
    expect(created.data!.cumulativeQuantity).toBe(110);
    expect(created.data!.boqPlannedQuantity).toBe(120);
  });

  it('accumulates previous from submitted/verified/certified measurements', async () => {
    const first = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-10',
        currentQuantity: 40,
        submit: true,
      },
      actorId,
    );
    await service.verify(first.data!.id, {}, engineerId);
    await service.certify(first.data!.id, {}, engineerId);

    const second = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block A',
        measurementDate: '2026-07-17',
        currentQuantity: 30,
      },
      actorId,
    );

    expect(second.data!.previousQuantity).toBe(40);
    expect(second.data!.cumulativeQuantity).toBe(70);
  });

  it('follows Draft → Submitted → Verified → Certified workflow', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        boqItemId,
        location: 'Block B',
        measurementDate: '2026-07-18',
        currentQuantity: 15,
      },
      actorId,
    );
    expect(created.data!.status).toBe(WorkMeasurementStatus.Draft);

    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data!.status).toBe(WorkMeasurementStatus.Submitted);

    const verified = await service.verify(
      created.data!.id,
      { notes: 'OK' },
      engineerId,
    );
    expect(verified.data!.status).toBe(WorkMeasurementStatus.Verified);
    expect(verified.data!.verifiedBy).toBe(engineerId);

    const certified = await service.certify(created.data!.id, {}, engineerId);
    expect(certified.data!.status).toBe(WorkMeasurementStatus.Certified);
  });
});
