import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoqItemStatus, BoqUnit } from '../boq/schemas/boq.schema';
import { MeasurementBookService } from './measurement-book.service';
import { MeasurementBookStatus } from './schemas/measurement-book-entry.schema';

describe('MeasurementBookService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const otherId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const contractorId = new Types.ObjectId().toHexString();
  const boqItemId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      entryNumber: 'MB-2026-0001',
      revision: 1,
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      boqItemId: new Types.ObjectId(boqItemId),
      boqCode: 'BOQ-01',
      workOrderId: null,
      workMeasurementId: null,
      dprId: null,
      drawingId: null,
      siteId: null,
      location: {
        siteId: null,
        phaseId: null,
        blockId: null,
        towerId: null,
        floorId: null,
        locationLabel: 'Block A',
      },
      length: 2,
      breadth: 3,
      height: 1,
      numberOfUnits: 1,
      calculatedQuantity: 6,
      formula: null,
      formulaQuantity: null,
      quantity: 6,
      unit: BoqUnit.CubicMetre,
      periodFrom: new Date('2026-07-01'),
      periodTo: new Date('2026-07-15'),
      measurementDate: new Date('2026-07-15'),
      workDescription: 'Slab',
      sheetReference: 'MB-01',
      notes: null,
      photoDocumentIds: [],
      status: MeasurementBookStatus.Draft,
      supersedesId: null,
      supersededById: null,
      revisionReason: null,
      measuredBy: new Types.ObjectId(actorId),
      submittedBy: null,
      submittedAt: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
      verifiedBy: null,
      verifiedAt: null,
      certifiedBy: null,
      certifiedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      save: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      ...overrides,
    };
  }

  function buildService(model: unknown, boqModel?: unknown) {
    const siteAccess = {
      assertSiteAccessIfScoped: jest.fn().mockResolvedValue(undefined),
    };
    const defaultBoq = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(boqItemId),
          projectId: new Types.ObjectId(projectId),
          boqCode: 'BOQ-01',
          unit: BoqUnit.CubicMetre,
          status: BoqItemStatus.Active,
        }),
      }),
    };
    return new MeasurementBookService(
      model as never,
      (boqModel ?? defaultBoq) as never,
      siteAccess as never,
    );
  }

  it('rejects silent update of certified entry', async () => {
    const doc = mockDoc({ status: MeasurementBookStatus.Certified });
    const service = buildService({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    });

    await expect(
      service.update(String(doc._id), { notes: 'hack' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates revision from certified entry without mutating original qty', async () => {
    const doc = mockDoc({ status: MeasurementBookStatus.Certified });
    const created = mockDoc({
      revision: 2,
      supersedesId: doc._id,
      quantity: 7.5,
      status: MeasurementBookStatus.Draft,
      revisionReason: 'Correct breadth',
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      create: jest.fn().mockResolvedValue(created),
    };
    const service = buildService(model);

    const res = await service.revise(
      String(doc._id),
      { reason: 'Correct breadth', formulaQuantity: 7.5 },
      actorId,
    );

    expect(res.data?.revision).toBe(2);
    expect(res.data?.supersedesId).toBe(String(doc._id));
    expect(res.data?.status).toBe(MeasurementBookStatus.Draft);
    expect(doc.quantity).toBe(6);
    expect(doc.status).toBe(MeasurementBookStatus.Certified);
    expect(model.create).toHaveBeenCalled();
  });

  it('marks prior revision superseded on certify', async () => {
    const priorId = new Types.ObjectId();
    const doc = mockDoc({
      status: MeasurementBookStatus.Verified,
      measuredBy: new Types.ObjectId(actorId),
      supersedesId: priorId,
    });
    const updateOne = jest.fn().mockReturnValue({ exec: jest.fn() });
    const service = buildService({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
      updateOne,
    });

    const res = await service.certify(String(doc._id), otherId);
    expect(res.data?.status).toBe(MeasurementBookStatus.Certified);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: priorId },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: MeasurementBookStatus.Superseded,
        }),
      }),
    );
  });

  it('enforces separation of duties on verify', async () => {
    const doc = mockDoc({
      status: MeasurementBookStatus.Submitted,
      measuredBy: new Types.ObjectId(actorId),
    });
    const service = buildService({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    });

    await expect(service.verify(String(doc._id), actorId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('acknowledges submitted entry', async () => {
    const doc = mockDoc({ status: MeasurementBookStatus.Submitted });
    const service = buildService({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    });

    const res = await service.acknowledge(String(doc._id), otherId);
    expect(res.data?.status).toBe(MeasurementBookStatus.Acknowledged);
    expect(res.data?.acknowledgedBy).toBe(otherId);
  });
});
