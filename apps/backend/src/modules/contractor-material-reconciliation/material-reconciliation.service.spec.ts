import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContractorRecoveryStatus } from '../contractor-recoveries/schemas/contractor-recovery.schema';
import { MaterialReconciliationService } from './material-reconciliation.service';
import { ContractorMaterialReconciliationStatus } from './schemas/contractor-material-reconciliation.schema';

describe('MaterialReconciliationService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();
  const materialId = new Types.ObjectId().toHexString();

  function draftDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      workOrderId: null,
      materialId: new Types.ObjectId(materialId),
      period: {
        from: new Date('2026-07-01'),
        to: new Date('2026-07-31'),
      },
      issuedQuantity: 100,
      theoreticalConsumption: 80,
      approvedWastage: 5,
      returnedQuantity: 10,
      recoverableDifference: 5,
      unitRate: 400,
      recoveryAmount: 2000,
      status: ContractorMaterialReconciliationStatus.Draft,
      billId: null,
      recoveryId: null,
      notes: null,
      approvedBy: null,
      approvedAt: null,
      postedBy: null,
      postedAt: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates draft with computed recoverable difference', async () => {
    const created: Record<string, unknown>[] = [];
    const model = {
      create: jest.fn().mockImplementation(async (payload) => {
        const row = {
          _id: new Types.ObjectId(),
          ...payload,
        };
        created.push(row);
        return row;
      }),
    };
    const recoveryModel = { create: jest.fn(), updateOne: jest.fn() };
    const billsService = {
      getById: jest.fn(),
      update: jest.fn(),
    };
    const service = new MaterialReconciliationService(
      model as never,
      recoveryModel as never,
      billsService as never,
    );

    const res = await service.create(
      {
        projectId,
        contractorId,
        materialId,
        period: { from: '2026-07-01', to: '2026-07-31' },
        issuedQuantity: 100,
        theoreticalConsumption: 80,
        approvedWastage: 5,
        returnedQuantity: 10,
        unitRate: 400,
      },
      actorId,
    );

    expect(res.data?.recoverableDifference).toBe(5);
    expect(res.data?.recoveryAmount).toBe(2000);
    expect(res.data?.status).toBe(ContractorMaterialReconciliationStatus.Draft);
    expect(created[0]?.recoverableDifference).toBe(5);
  });

  it('approves and creates material recovery when amount > 0', async () => {
    const doc = draftDoc();
    const recoveryId = new Types.ObjectId();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const recoveryModel = {
      create: jest.fn().mockResolvedValue({
        _id: recoveryId,
      }),
      updateOne: jest.fn(),
    };
    const service = new MaterialReconciliationService(
      model as never,
      recoveryModel as never,
      { getById: jest.fn(), update: jest.fn() } as never,
    );

    const res = await service.approve(String(doc._id), actorId);
    expect(res.data?.status).toBe(
      ContractorMaterialReconciliationStatus.Approved,
    );
    expect(res.data?.recoveryId).toBe(String(recoveryId));
    expect(recoveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2000,
        status: ContractorRecoveryStatus.Approved,
      }),
    );
  });

  it('does not create recovery when recoveryAmount is 0', async () => {
    const doc = draftDoc({
      issuedQuantity: 50,
      theoreticalConsumption: 60,
      approvedWastage: 0,
      returnedQuantity: 0,
      recoverableDifference: -10,
      recoveryAmount: 0,
      unitRate: 100,
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const recoveryModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    const service = new MaterialReconciliationService(
      model as never,
      recoveryModel as never,
      { getById: jest.fn(), update: jest.fn() } as never,
    );

    const res = await service.approve(String(doc._id), actorId);
    expect(res.data?.recoveryAmount).toBe(0);
    expect(res.data?.recoveryId).toBeNull();
    expect(recoveryModel.create).not.toHaveBeenCalled();
  });

  it('posts approved reconciliation to bill and posts linked recovery', async () => {
    const recoveryId = new Types.ObjectId();
    const doc = draftDoc({
      status: ContractorMaterialReconciliationStatus.Approved,
      recoveryId,
      approvedBy: new Types.ObjectId(actorId),
      approvedAt: new Date(),
    });
    const billId = new Types.ObjectId().toHexString();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const recoveryModel = {
      create: jest.fn(),
      updateOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ acknowledged: true }),
      }),
    };
    const billsService = {
      getById: jest.fn().mockResolvedValue({
        data: {
          id: billId,
          projectId,
          contractorId,
          materialRecovery: 100,
        },
      }),
      update: jest.fn().mockResolvedValue({ data: {} }),
    };
    const service = new MaterialReconciliationService(
      model as never,
      recoveryModel as never,
      billsService as never,
    );

    const res = await service.postToBill(String(doc._id), { billId }, actorId);
    expect(res.data?.status).toBe(
      ContractorMaterialReconciliationStatus.PostedToBill,
    );
    expect(res.data?.billId).toBe(billId);
    expect(billsService.update).toHaveBeenCalledWith(
      billId,
      { materialRecovery: 2100 },
      actorId,
    );
    expect(recoveryModel.updateOne).toHaveBeenCalled();
  });

  it('rejects post-to-bill when not approved', async () => {
    const doc = draftDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new MaterialReconciliationService(
      model as never,
      { create: jest.fn(), updateOne: jest.fn() } as never,
      { getById: jest.fn(), update: jest.fn() } as never,
    );

    await expect(
      service.postToBill(
        String(doc._id),
        { billId: new Types.ObjectId().toHexString() },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
