import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContractorRecoveriesService } from './contractor-recoveries.service';
import {
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from './schemas/contractor-recovery.schema';

describe('ContractorRecoveriesService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();

  function draftDoc() {
    return {
      _id: new Types.ObjectId(),
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      workOrderId: null,
      type: ContractorRecoveryType.Penalty,
      amount: 1500,
      description: 'LD for delay',
      notes: null,
      billId: null,
      materialReconciliationId: null,
      status: ContractorRecoveryStatus.Draft,
      approvedBy: null,
      approvedAt: null,
      postedBy: null,
      postedAt: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('approves draft → approved with audit fields', async () => {
    const doc = draftDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new ContractorRecoveriesService(model as never);

    const res = await service.approve(String(doc._id), actorId);
    expect(res.data?.status).toBe(ContractorRecoveryStatus.Approved);
    expect(res.data?.approvedBy).toBe(actorId);
    expect(res.data?.approvedAt).toBeTruthy();
  });

  it('posts approved → posted and may attach billId', async () => {
    const doc = draftDoc();
    doc.status = ContractorRecoveryStatus.Approved;
    doc.approvedBy = new Types.ObjectId(actorId);
    doc.approvedAt = new Date();
    const billId = new Types.ObjectId().toHexString();

    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new ContractorRecoveriesService(model as never);

    const res = await service.post(String(doc._id), { billId }, actorId);
    expect(res.data?.status).toBe(ContractorRecoveryStatus.Posted);
    expect(res.data?.billId).toBe(billId);
    expect(res.data?.postedBy).toBe(actorId);
  });

  it('rejects update when not draft', async () => {
    const doc = draftDoc();
    doc.status = ContractorRecoveryStatus.Approved;
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new ContractorRecoveriesService(model as never);

    await expect(
      service.update(String(doc._id), { amount: 10 }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
