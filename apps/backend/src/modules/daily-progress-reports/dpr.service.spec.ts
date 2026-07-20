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
import { DprPdfService } from './dpr-pdf.service';
import { DprService } from './dpr.service';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
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
  let createActiveFromBuffer: jest.Mock;

  let actorId: string;
  let projectId: string;
  let boqItemId: string;

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
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    createActiveFromBuffer = jest.fn().mockResolvedValue({
      data: {
        id: new Types.ObjectId().toHexString(),
        checksum: 'abc',
      },
    });

    service = new DprService(
      dprModel,
      alertModel,
      projectModel,
      boqItemModel,
      new NumberingService(counterModel),
      new IdempotencyService(idempotencyModel),
      { createActiveFromBuffer } as unknown as DocumentsService,
      new DprPdfService(),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    createActiveFromBuffer.mockClear();
    await dprModel.deleteMany({}).setOptions({ withDeleted: true });
    await alertModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqItemModel.deleteMany({}).setOptions({ withDeleted: true });
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
  });

  it('enforces one DPR per project per date', async () => {
    await service.create(
      {
        projectId,
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
          reportDate: '2026-07-17',
          weather: DprWeather.Rain,
          workPerformed: 'Duplicate',
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('supports offline idempotent create+submit and PDF', async () => {
    const key = 'offline-dpr-key-1';
    const body = {
      projectId,
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
    expect(first.data!.boqQuantities[0].boqCode).toBe('BOQ-COL-01');
    expect(first.data!.pdfDocumentId).toBeTruthy();
    expect(createActiveFromBuffer).toHaveBeenCalled();

    const replay = await service.create(body, actorId, key);
    expect(replay.data!.id).toBe(first.data!.id);
    expect(replay.data!.status).toBe(DprStatus.Submitted);
  });

  it('follows Draft → Submitted → Reviewed and allows reopen', async () => {
    const created = await service.create(
      {
        projectId,
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

    const reviewed = await service.review(
      created.data!.id,
      { reviewNotes: 'OK' },
      actorId,
    );
    expect(reviewed.data!.status).toBe(DprStatus.Reviewed);

    const reopened = await service.reopen(
      created.data!.id,
      { reason: 'Correct labour count' },
      actorId,
    );
    expect(reopened.data!.status).toBe(DprStatus.Reopened);

    await service.update(
      created.data!.id,
      { labourCount: 16 },
      actorId,
    );
    const resubmitted = await service.submit(created.data!.id, actorId);
    expect(resubmitted.data!.status).toBe(DprStatus.Submitted);
    expect(resubmitted.data!.labourCount).toBe(16);
  });

  it('creates missing-DPR alerts for construction projects', async () => {
    const result = await service.evaluateMissingAlerts(
      new Date('2026-07-20T10:00:00.000Z'),
    );
    expect(result.data!.created).toBe(1);

    // Submit DPR clears alert acknowledgment path
    await service.create(
      {
        projectId,
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
});
