import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Company } from '../company/schemas/company.schema';
import { AnalyticsSnapshotService } from './snapshot.service';
import {
  AnalyticsKpiSnapshot,
  AnalyticsSnapshotKind,
} from './schemas/analytics-kpi-snapshot.schema';

describe('AnalyticsSnapshotService immutability', () => {
  const companyId = new Types.ObjectId();
  const snapshotId = new Types.ObjectId();

  const snapshotModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };
  const companyModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: companyId }),
    }),
  };

  let service: AnalyticsSnapshotService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsSnapshotService,
        {
          provide: getModelToken(AnalyticsKpiSnapshot.name),
          useValue: snapshotModel,
        },
        { provide: getModelToken(Company.name), useValue: companyModel },
      ],
    }).compile();
    service = moduleRef.get(AnalyticsSnapshotService);
  });

  it('creates an immutable snapshot', async () => {
    const created = {
      _id: snapshotId,
      companyId,
      kind: AnalyticsSnapshotKind.DailyProjectKpi,
      asOfDate: new Date('2026-07-21T00:00:00.000Z'),
      versionLabel: 'daily_project_kpi-2026-07-21',
      payload: { eac: 100 },
      createdByUserId: new Types.ObjectId(),
      immutable: true,
      createdAt: new Date(),
    };
    snapshotModel.create.mockResolvedValue(created);

    const res = await service.create(
      {
        kind: AnalyticsSnapshotKind.DailyProjectKpi,
        asOfDate: '2026-07-21',
        projectId: new Types.ObjectId().toHexString(),
      },
      new Types.ObjectId().toHexString(),
      { eac: 100 },
    );

    expect(res.data?.immutable).toBe(true);
    expect(snapshotModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ immutable: true }),
    );
  });

  it('rejects mutation of immutable snapshots', async () => {
    snapshotModel.findById.mockReturnValue({
      lean: () => ({
        exec: jest.fn().mockResolvedValue({
          _id: snapshotId,
          immutable: true,
        }),
      }),
    });

    await expect(service.tryUpdateBlocked(String(snapshotId))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
