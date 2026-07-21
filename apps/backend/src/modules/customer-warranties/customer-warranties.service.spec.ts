import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CustomerWarrantiesService } from './customer-warranties.service';
import {
  WarrantyCategory,
  WarrantyStatus,
} from './schemas/customer-warranty.schema';

describe('CustomerWarrantiesService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();

  function mockTicket(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      ticketNumber: 'WR-2026-000001',
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: new Types.ObjectId(unitId),
      handoverId: null,
      category: WarrantyCategory.Plumbing,
      description: 'Leak in bathroom',
      slaDueAt: null,
      status: WarrantyStatus.Complaint,
      assignedContractorId: null,
      assignedUserId: null,
      materialUsage: [],
      completionPhotos: [],
      inspectionNotes: null,
      rectificationNotes: null,
      verificationNotes: null,
      raisedAt: new Date(),
      closedAt: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates ticket in complaint status', async () => {
    const created = mockTicket();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new CustomerWarrantiesService(model as never);

    const res = await service.create(
      {
        projectId,
        bookingId,
        customerId,
        unitId,
        category: WarrantyCategory.Plumbing,
        description: 'Leak in bathroom',
      },
      actorId,
    );

    expect(res.data?.status).toBe(WarrantyStatus.Complaint);
    expect(model.create).toHaveBeenCalled();
  });

  it('enforces transition sequence', async () => {
    const doc = mockTicket({ status: WarrantyStatus.Complaint });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerWarrantiesService(model as never);

    await expect(
      service.transition(
        String(doc._id),
        { status: WarrantyStatus.Closed },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transitions complaint to inspection', async () => {
    const doc = mockTicket({ status: WarrantyStatus.Complaint });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerWarrantiesService(model as never);

    const res = await service.transition(
      String(doc._id),
      { status: WarrantyStatus.Inspection },
      actorId,
    );
    expect(res.data?.status).toBe(WarrantyStatus.Inspection);
    expect(doc.save).toHaveBeenCalled();
  });

  it('assigns contractor and auto-advances from inspection', async () => {
    const doc = mockTicket({ status: WarrantyStatus.Inspection });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerWarrantiesService(model as never);

    const res = await service.assign(
      String(doc._id),
      { assignedContractorId: contractorId },
      actorId,
    );
    expect(res.data?.status).toBe(WarrantyStatus.Assigned);
    expect(res.data?.assignedContractorId).toBe(contractorId);
  });

  it('requires assignment before transition to assigned', async () => {
    const doc = mockTicket({ status: WarrantyStatus.Inspection });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new CustomerWarrantiesService(model as never);

    await expect(
      service.transition(
        String(doc._id),
        { status: WarrantyStatus.Assigned },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
