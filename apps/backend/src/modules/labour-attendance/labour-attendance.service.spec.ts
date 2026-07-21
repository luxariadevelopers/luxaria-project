import { ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { IdempotencyService } from '../../database/services/idempotency.service';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import {
  LabourCategory,
  LabourCategorySchema,
  LabourCategoryStatus,
  LabourSkillLevel,
} from '../labour-categories/schemas/labour-category.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { LabourAttendanceService } from './labour-attendance.service';
import {
  LabourAttendance,
  LabourAttendanceEntryMode,
  LabourAttendanceSchema,
  LabourAttendanceStatus,
} from './schemas/labour-attendance.schema';

describe('LabourAttendanceService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: LabourAttendanceService;
  let attendanceModel: Model<LabourAttendance>;
  let categoryModel: Model<LabourCategory>;

  let actorId: string;
  let projectId: string;
  let contractorId: string;
  let masonId: string;
  let helperId: string;
  let photoId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    attendanceModel = connection.model(
      LabourAttendance.name,
      LabourAttendanceSchema,
    ) as Model<LabourAttendance>;
    categoryModel = connection.model(
      LabourCategory.name,
      LabourCategorySchema,
    ) as Model<LabourCategory>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      attendanceModel.syncIndexes(),
      categoryModel.syncIndexes(),
      projectModel.syncIndexes(),
      contractorModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    const sitesService = {
      findById: jest.fn().mockResolvedValue(null),
    };
    const siteAccessService = {
      assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
    };

    service = new LabourAttendanceService(
      attendanceModel,
      projectModel,
      contractorModel,
      categoryModel,
      new NumberingService(counterModel),
      new IdempotencyService(idempotencyModel),
      sitesService as never,
      siteAccessService as never,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    photoId = new Types.ObjectId().toHexString();
    await attendanceModel.deleteMany({}).setOptions({ withDeleted: true });
    await categoryModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Contractor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-LAT-001',
        projectName: 'Attendance Tower',
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
        companyId: new Types.ObjectId(),
      },
    ]);
    projectId = String(project._id);

    const [contractor] = await connection.model(Contractor.name).create([
      {
        contractorCode: 'CON-000101',
        legalName: 'Site Labour Co',
        contractorType: ContractorType.Labour,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);

    const [mason, helper] = await categoryModel.create([
      {
        categoryCode: 'LBC-000001',
        name: 'Mason',
        skillLevel: LabourSkillLevel.Skilled,
        defaultDailyRate: 900,
        overtimeRate: 1350,
        status: LabourCategoryStatus.Active,
      },
      {
        categoryCode: 'LBC-000002',
        name: 'Helper',
        skillLevel: LabourSkillLevel.Unskilled,
        defaultDailyRate: 550,
        overtimeRate: 800,
        status: LabourCategoryStatus.Active,
      },
    ]);
    masonId = String(mason._id);
    helperId = String(helper._id);
  });

  it('detects duplicate attendance for project+contractor+date', async () => {
    await service.create(
      {
        projectId,
        contractorId,
        attendanceDate: '2026-07-20',
        latitude: 13.08,
        longitude: 80.27,
        lines: [
          {
            labourCategoryId: masonId,
            entryMode: LabourAttendanceEntryMode.Group,
            workerCount: 8,
          },
        ],
        groupPhotoDocumentIds: [photoId],
      },
      actorId,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          attendanceDate: '2026-07-20',
          lines: [
            {
              labourCategoryId: helperId,
              entryMode: LabourAttendanceEntryMode.Group,
              workerCount: 4,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('supports offline idempotent create+submit with group and individual lines', async () => {
    const key = 'offline-attendance-key-1';
    const body = {
      projectId,
      contractorId,
      attendanceDate: '2026-07-21',
      workLocation: 'Block A',
      latitude: 13.0827,
      longitude: 80.2707,
      lines: [
        {
          labourCategoryId: masonId,
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 10,
          overtimeHours: 2,
        },
        {
          labourCategoryId: helperId,
          entryMode: LabourAttendanceEntryMode.Individual,
          workers: [
            {
              workerName: 'Ravi',
              workerCode: 'W-01',
              checkIn: '2026-07-21T08:00:00.000Z',
              checkOut: '2026-07-21T17:30:00.000Z',
              overtimeHours: 0.5,
            },
            {
              workerName: 'Suresh',
              checkIn: '2026-07-21T08:15:00.000Z',
              checkOut: '2026-07-21T17:00:00.000Z',
            },
          ],
        },
      ],
      submit: true as const,
      clientDeviceId: 'device-lat-1',
      offlineCapturedAt: '2026-07-21T07:55:00.000Z',
      attachments: {
        group_photo_0: photoId,
      },
    };

    const first = await service.create(body, actorId, key);
    expect(first.data!.status).toBe(LabourAttendanceStatus.Submitted);
    expect(first.data!.attendanceNumber).toMatch(/^LAT-/);
    expect(first.data!.totalWorkers).toBe(12);
    expect(first.data!.lines).toHaveLength(2);
    expect(first.data!.groupPhotoDocumentIds).toContain(photoId);
    expect(first.data!.clientDeviceId).toBe('device-lat-1');

    const replay = await service.create(body, actorId, key);
    expect(replay.data!.id).toBe(first.data!.id);
    expect(replay.data!.status).toBe(LabourAttendanceStatus.Submitted);
  });

  it('requires supervisor confirmation and builds daily report', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        attendanceDate: '2026-07-22',
        workLocation: 'Podium',
        latitude: 13.1,
        longitude: 80.2,
        lines: [
          {
            labourCategoryId: masonId,
            entryMode: LabourAttendanceEntryMode.Group,
            workerCount: 6,
            overtimeHours: 1,
          },
        ],
        groupPhotoDocumentIds: [photoId],
      },
      actorId,
    );
    expect(created.data!.status).toBe(LabourAttendanceStatus.Draft);

    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data!.status).toBe(LabourAttendanceStatus.Submitted);
    expect(submitted.data!.supervisorConfirmed).toBe(false);

    const confirmed = await service.confirm(
      created.data!.id,
      { confirmationNotes: 'Headcount verified' },
      actorId,
    );
    expect(confirmed.data!.status).toBe(LabourAttendanceStatus.Confirmed);
    expect(confirmed.data!.supervisorConfirmed).toBe(true);
    expect(confirmed.data!.confirmationNotes).toBe('Headcount verified');

    const report = await service.dailyReport({
      projectId,
      attendanceDate: '2026-07-22',
    });
    expect(report.data!.sheetCount).toBe(1);
    expect(report.data!.totalWorkers).toBe(6);
    expect(report.data!.confirmedCount).toBe(1);
    expect(report.data!.sheets[0].byCategory[0].labourCategoryName).toBe(
      'Mason',
    );
    expect(report.data!.sheets[0].shift).toBe('general');

    const deployment = await service.dailyDeployment({
      projectId,
      attendanceDate: '2026-07-22',
      shift: 'general' as never,
    });
    expect(deployment.data!.sheetCount).toBe(1);
    expect(deployment.data!.shift).toBe('general');
  });

  it('allows same contractor on same day for different shifts', async () => {
    await service.create(
      {
        projectId,
        contractorId,
        attendanceDate: '2026-07-23',
        shift: 'morning' as never,
        latitude: 13.08,
        longitude: 80.27,
        lines: [
          {
            labourCategoryId: masonId,
            entryMode: LabourAttendanceEntryMode.Group,
            workerCount: 4,
            overtimeHours: 0.5,
          },
        ],
        groupPhotoDocumentIds: [photoId],
      },
      actorId,
    );

    const second = await service.create(
      {
        projectId,
        contractorId,
        attendanceDate: '2026-07-23',
        shift: 'night' as never,
        latitude: 13.08,
        longitude: 80.27,
        lines: [
          {
            labourCategoryId: helperId,
            entryMode: LabourAttendanceEntryMode.Group,
            workerCount: 3,
          },
        ],
        groupPhotoDocumentIds: [photoId],
      },
      actorId,
    );

    expect(second.data!.shift).toBe('night');
    expect(second.data!.totalWorkers).toBe(3);
  });
});
