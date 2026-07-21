import { ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { IdempotencyService } from '../../database/services/idempotency.service';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import type { DocumentsService } from '../documents/documents.service';
import type { MaterialIssuesService } from '../material-issues/material-issues.service';
import {
  MaterialIssue,
  MaterialIssueSchema,
  MaterialIssueStatus,
  MaterialIssueTarget,
} from '../material-issues/schemas/material-issue.schema';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  BoqItem,
  BoqItemSchema,
  BoqItemStatus,
  BoqUnit,
} from '../boq/schemas/boq.schema';
import {
  Site,
  SiteSchema,
  SiteStatus,
  SiteType,
} from '../sites/schemas/site.schema';
import type { SiteAccessService } from '../sites/site-access.service';
import type { StockReservationsService } from '../stock-reservations/stock-reservations.service';
import { DprPdfService } from './dpr-pdf.service';
import { DprService } from './dpr.service';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
  DprShift,
  DprStatus,
  DprWeather,
} from './schemas/daily-progress-report.schema';

describe('DprService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: DprService;
  let dprModel: Model<DailyProgressReport>;
  let alertModel: Model<DprMissingAlert>;
  let projectModel: Model<Project>;
  let boqItemModel: Model<BoqItem>;
  let siteModel: Model<Site>;
  let materialIssueModel: Model<MaterialIssue>;
  let materialModel: Model<Material>;
  let createActiveFromBuffer: jest.Mock;
  let confirmForDpr: jest.Mock;
  let createMaterialIssue: jest.Mock;
  let createReservation: jest.Mock;
  let markConsumed: jest.Mock;
  let listActiveBySource: jest.Mock;

  let actorId: string;
  let projectId: string;
  let siteId: string;
  let boqItemId: string;
  let materialId: string;
  let companyId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    dprModel = connection.model(
      DailyProgressReport.name,
      DailyProgressReportSchema,
    ) as Model<DailyProgressReport>;
    alertModel = connection.model(
      DprMissingAlert.name,
      DprMissingAlertSchema,
    ) as Model<DprMissingAlert>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    boqItemModel = connection.model(
      BoqItem.name,
      BoqItemSchema,
    ) as Model<BoqItem>;
    siteModel = connection.model(Site.name, SiteSchema) as Model<Site>;
    materialIssueModel = connection.model(
      MaterialIssue.name,
      MaterialIssueSchema,
    ) as Model<MaterialIssue>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      dprModel.syncIndexes(),
      alertModel.syncIndexes(),
      projectModel.syncIndexes(),
      boqItemModel.syncIndexes(),
      siteModel.syncIndexes(),
      materialIssueModel.syncIndexes(),
      materialModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    createActiveFromBuffer = jest.fn().mockResolvedValue({
      data: {
        id: new Types.ObjectId().toHexString(),
        checksum: 'abc',
      },
    });
    confirmForDpr = jest.fn().mockResolvedValue({ data: { id: 'issue' } });
    createMaterialIssue = jest.fn();
    createReservation = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    markConsumed = jest.fn().mockResolvedValue({ data: {} });
    listActiveBySource = jest.fn().mockResolvedValue([]);

    service = new DprService(
      dprModel,
      alertModel,
      projectModel,
      boqItemModel,
      siteModel,
      materialIssueModel,
      materialModel,
      new NumberingService(counterModel),
      new IdempotencyService(idempotencyModel),
      { createActiveFromBuffer } as unknown as DocumentsService,
      new DprPdfService(),
      {
        assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
      } as unknown as SiteAccessService,
      {
        confirmForDpr,
        create: createMaterialIssue,
      } as unknown as MaterialIssuesService,
      {
        create: createReservation,
        markConsumed,
        listActiveBySource,
      } as unknown as StockReservationsService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    companyId = new Types.ObjectId();
    createActiveFromBuffer.mockClear();
    confirmForDpr.mockClear();
    createMaterialIssue.mockClear();
    createReservation.mockClear();
    markConsumed.mockClear();
    listActiveBySource.mockClear().mockResolvedValue([]);

    await dprModel.deleteMany({}).setOptions({ withDeleted: true });
    await alertModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqItemModel.deleteMany({}).setOptions({ withDeleted: true });
    await siteModel.deleteMany({}).setOptions({ withDeleted: true });
    await materialIssueModel.deleteMany({}).setOptions({ withDeleted: true });
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

    const [project] = await projectModel.create([
      {
        projectCode: 'PRJ-DPR-001',
        projectName: 'DPR Tower',
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

    const [site] = await siteModel.create([
      {
        companyId,
        projectId: project._id,
        siteCode: 'SITE-A',
        siteName: 'Main Site',
        type: SiteType.Site,
        status: SiteStatus.Active,
      },
    ]);
    siteId = String(site._id);

    const [boq] = await boqItemModel.create([
      {
        projectId: project._id,
        versionId: new Types.ObjectId(),
        blockId: new Types.ObjectId(),
        floorId: new Types.ObjectId(),
        workCategoryId: new Types.ObjectId(),
        boqCode: 'BOQ-COL-01',
        description: 'RCC columns',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 100,
        materialCost: 4000,
        labourCost: 1000,
        subcontractCost: 500,
        otherCost: 500,
        plannedRate: 6000,
        plannedValue: 600000,
        status: BoqItemStatus.Active,
      },
    ]);
    boqItemId = String(boq._id);

    const [material] = await materialModel.create([
      {
        materialCode: 'CEM-001',
        name: 'Cement',
        category: 'cement',
        baseUnit: MaterialUnit.Bag,
        alternateUnits: [],
        conversionFactors: [],
        ledgerAccountId: new Types.ObjectId(),
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);
  });

  it('enforces one DPR per project+site+date+shift', async () => {
    await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-17',
        weather: DprWeather.Clear,
        workPerformed: 'Cast columns',
        labourCount: 10,
      },
      actorId,
    );

    await expect(
      service.create(
        {
          projectId,
          siteId,
          reportDate: '2026-07-17',
          weather: DprWeather.Rain,
          workPerformed: 'Duplicate',
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);

    // Different shift is allowed
    const otherShift = await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-17',
        shift: DprShift.Night,
        weather: DprWeather.Clear,
        workPerformed: 'Night pour',
      },
      actorId,
    );
    expect(otherShift.data!.shift).toBe(DprShift.Night);
  });

  it('supports offline idempotent create+submit and PDF', async () => {
    const key = 'offline-dpr-key-1';
    const body = {
      projectId,
      siteId,
      reportDate: '2026-07-18',
      weather: DprWeather.Cloudy,
      workPerformed: 'Slab shuttering',
      labourCount: 20,
      skilledLabourCount: 8,
      unskilledLabourCount: 12,
      boqQuantities: [{ boqItemId, quantityCompleted: 5 }],
      siteCashBalance: 15000,
      staffPresent: [{ name: 'Ravi', role: 'Site Engineer' }],
      tomorrowPlan: 'Pour slab',
      submit: true as const,
      clientDeviceId: 'device-1',
      offlineCapturedAt: '2026-07-18T08:00:00.000Z',
    };

    const first = await service.create(body, actorId, key);

    expect(first.data!.status).toBe(DprStatus.Submitted);
    expect(first.data!.dprNumber).toMatch(/^DPR-/);
    expect(first.data!.siteId).toBe(siteId);
    expect(first.data!.boqQuantities[0].boqCode).toBe('BOQ-COL-01');
    expect(first.data!.pdfDocumentId).toBeTruthy();
    expect(createActiveFromBuffer).toHaveBeenCalled();

    const replay = await service.create(body, actorId, key);
    expect(replay.data!.id).toBe(first.data!.id);
    expect(replay.data!.status).toBe(DprStatus.Submitted);
  });

  it('follows Draft → Submitted → Verified → Approved → Locked', async () => {
    const created = await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-19',
        weather: DprWeather.Hot,
        workPerformed: 'Brick work',
        labourCount: 15,
      },
      actorId,
    );
    expect(created.data!.status).toBe(DprStatus.Draft);

    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data!.status).toBe(DprStatus.Submitted);

    const verified = await service.verify(
      created.data!.id,
      { verifyNotes: 'Checked' },
      actorId,
    );
    expect(verified.data!.status).toBe(DprStatus.Verified);

    const approved = await service.approve(
      created.data!.id,
      { approveNotes: 'OK' },
      actorId,
    );
    expect(approved.data!.status).toBe(DprStatus.Approved);

    const locked = await service.lock(created.data!.id, actorId);
    expect(locked.data!.status).toBe(DprStatus.Locked);

    const reopened = await service.reopen(
      created.data!.id,
      { reason: 'Correct labour count' },
      actorId,
    );
    expect(reopened.data!.status).toBe(DprStatus.Reopened);

    await service.update(created.data!.id, { labourCount: 16 }, actorId);
    const resubmitted = await service.submit(created.data!.id, actorId);
    expect(resubmitted.data!.status).toBe(DprStatus.Submitted);
    expect(resubmitted.data!.labourCount).toBe(16);
  });

  it('legacy review maps to approved-like reviewed status and confirms issues', async () => {
    const created = await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-21',
        weather: DprWeather.Clear,
        workPerformed: 'Review path',
        labourCount: 5,
      },
      actorId,
    );
    await service.submit(created.data!.id, actorId);
    const reviewed = await service.review(
      created.data!.id,
      { reviewNotes: 'legacy' },
      actorId,
    );
    expect(reviewed.data!.status).toBe(DprStatus.Reviewed);
    expect(reviewed.data!.approvedBy).toBe(actorId);
  });

  it('on approve confirms linked draft material issues via confirmForDpr', async () => {
    const created = await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-22',
        weather: DprWeather.Clear,
        workPerformed: 'Cement issue day',
        labourCount: 8,
        materialsIssued: [
          {
            materialId,
            materialName: 'Cement',
            quantity: 20,
            unit: MaterialUnit.Bag,
          },
        ],
      },
      actorId,
    );

    const issue = await materialIssueModel.create({
      issueNumber: 'MI-DPR-001',
      projectId: new Types.ObjectId(projectId),
      issueDate: new Date('2026-07-22T00:00:00.000Z'),
      issuedBy: new Types.ObjectId(actorId),
      receivedBy: new Types.ObjectId(actorId),
      issueTarget: MaterialIssueTarget.Site,
      issueSiteId: new Types.ObjectId(siteId),
      dprId: new Types.ObjectId(created.data!.id),
      workLocation: 'DPR linked',
      storeLocation: '',
      items: [
        {
          materialId: new Types.ObjectId(materialId),
          materialCode: 'CEM-001',
          materialName: 'Cement',
          unit: MaterialUnit.Bag,
          quantity: 20,
          baseUnit: MaterialUnit.Bag,
          baseUnitQuantity: 20,
          returnedBaseQuantity: 0,
        },
      ],
      status: MaterialIssueStatus.Draft,
      signatures: {},
      returns: [],
      createdBy: new Types.ObjectId(actorId),
    });

    await service.update(
      created.data!.id,
      { materialIssueIds: [String(issue._id)] },
      actorId,
    );
    await service.submit(created.data!.id, actorId);

    const approved = await service.approve(created.data!.id, {}, actorId);

    expect(approved.data!.status).toBe(DprStatus.Approved);
    expect(confirmForDpr).toHaveBeenCalledWith(
      String(issue._id),
      created.data!.id,
      actorId,
    );
    expect(markConsumed).toHaveBeenCalled();
  });

  it('creates missing-DPR alerts for construction projects', async () => {
    const result = await service.evaluateMissingAlerts(
      new Date('2026-07-20T10:00:00.000Z'),
    );
    expect(result.data!.created).toBe(1);

    await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-20',
        weather: DprWeather.Clear,
        workPerformed: 'Caught up',
        labourCount: 5,
        submit: true,
      },
      actorId,
    );

    const alerts = await service.listMissingAlerts(projectId);
    expect(alerts.data!.every((a) => a.acknowledged)).toBe(true);
  });

  it('rejectToDraft returns submitted DPR to draft', async () => {
    const created = await service.create(
      {
        projectId,
        siteId,
        reportDate: '2026-07-23',
        weather: DprWeather.Clear,
        workPerformed: 'Reject me',
        labourCount: 3,
        submit: true,
      },
      actorId,
    );
    expect(created.data!.status).toBe(DprStatus.Submitted);

    const rejected = await service.reopen(
      created.data!.id,
      { reason: 'Missing photos', rejectToDraft: true },
      actorId,
    );
    expect(rejected.data!.status).toBe(DprStatus.Draft);
  });
});
