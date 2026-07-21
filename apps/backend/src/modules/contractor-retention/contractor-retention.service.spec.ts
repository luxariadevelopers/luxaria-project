import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContractorBillStatus } from '../contractor-bills/schemas/contractor-bill.schema';
import { ContractorRetentionService } from './contractor-retention.service';
import {
  RetentionKind,
  RetentionReleaseStage,
  RetentionStatus,
} from './schemas/contractor-retention.schema';

describe('ContractorRetentionService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();
  const billId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      retentionNumber: 'RET-2026-000001',
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      agreementId: null,
      billId: new Types.ObjectId(billId),
      kind: RetentionKind.Deduction,
      ceilingAmount: 100_000,
      amount: 5_000,
      releaseStage: null,
      bgReference: null,
      status: RetentionStatus.Draft,
      notes: null,
      rejectionReason: null,
      requestedBy: null,
      requestedAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      releasedBy: null,
      releasedAt: null,
      cancelledBy: null,
      cancelledAt: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function billDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(billId),
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      status: ContractorBillStatus.Posted,
      retention: 5_000,
      ...overrides,
    };
  }

  it('rejects deduction without billId', async () => {
    const service = new ContractorRetentionService(
      { create: jest.fn() } as never,
      { findById: jest.fn() } as never,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          kind: RetentionKind.Deduction,
          ceilingAmount: 100_000,
          amount: 1_000,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates deduction from posted bill', async () => {
    const created = mockDoc();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    const billModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(billDoc()),
      }),
    };
    const service = new ContractorRetentionService(
      model as never,
      billModel as never,
    );

    const res = await service.create(
      {
        projectId,
        contractorId,
        billId,
        kind: RetentionKind.Deduction,
        ceilingAmount: 100_000,
        amount: 5_000,
      },
      actorId,
    );

    expect(res.data?.kind).toBe(RetentionKind.Deduction);
    expect(res.data?.amount).toBe(5_000);
    expect(model.create).toHaveBeenCalled();
  });

  it('rejects release exceeding held balance', async () => {
    const model = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    const service = new ContractorRetentionService(
      model as never,
      { findById: jest.fn() } as never,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          kind: RetentionKind.Release,
          releaseStage: RetentionReleaseStage.PracticalCompletion,
          ceilingAmount: 100_000,
          amount: 1_000,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires bgReference for bg_replacement', async () => {
    const model = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              kind: RetentionKind.Deduction,
              status: RetentionStatus.Approved,
              amount: 10_000,
              ceilingAmount: 100_000,
            },
          ]),
        }),
      }),
    };
    const service = new ContractorRetentionService(
      model as never,
      { findById: jest.fn() } as never,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          kind: RetentionKind.Release,
          releaseStage: RetentionReleaseStage.BgReplacement,
          ceilingAmount: 100_000,
          amount: 1_000,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('releases approved release record', async () => {
    const doc = mockDoc({
      kind: RetentionKind.Release,
      releaseStage: RetentionReleaseStage.DefectLiability,
      status: RetentionStatus.Approved,
      amount: 2_000,
      billId: null,
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            // balances() then pending releases
            .mockResolvedValueOnce([
              {
                kind: RetentionKind.Deduction,
                status: RetentionStatus.Approved,
                amount: 10_000,
                ceilingAmount: 100_000,
              },
            ])
            .mockResolvedValueOnce([]),
        }),
      }),
    };
    const service = new ContractorRetentionService(
      model as never,
      { findById: jest.fn() } as never,
    );

    const res = await service.release(String(doc._id), actorId);
    expect(res.data?.status).toBe(RetentionStatus.Released);
    expect(doc.releasedBy).toEqual(expect.any(Types.ObjectId));
    expect(doc.save).toHaveBeenCalled();
  });

  it('submits draft to pending_approval', async () => {
    const doc = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new ContractorRetentionService(
      model as never,
      { findById: jest.fn() } as never,
    );

    const res = await service.submit(String(doc._id), actorId);
    expect(res.data?.status).toBe(RetentionStatus.PendingApproval);
  });
});
