import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UnitRegistrationStatus } from './schemas/unit-registration.schema';
import { UnitRegistrationsService } from './unit-registrations.service';

describe('UnitRegistrationsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      registrationNumber: 'UREG-2026-000001',
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: new Types.ObjectId(unitId),
      agreementId: null,
      status: UnitRegistrationStatus.Draft,
      registrationDate: null,
      documentNumber: null,
      ecReference: null,
      sro: {},
      stampDuty: null,
      registrationCharges: null,
      witnesses: [],
      documentPath: null,
      documentFileName: null,
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function buildService(
    model: Record<string, unknown>,
    bookingModel?: Record<string, unknown>,
    unitModel?: Record<string, unknown>,
  ) {
    return new UnitRegistrationsService(
      model as never,
      bookingModel as never,
      unitModel as never,
    );
  }

  it('creates draft unit registration', async () => {
    const created = mockDoc();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = buildService(model);

    const res = await service.create(
      { projectId, bookingId, customerId, unitId },
      actorId,
    );

    expect(res.data?.status).toBe(UnitRegistrationStatus.Draft);
    expect(model.create).toHaveBeenCalled();
  });

  it('rejects update on submitted registration', async () => {
    const row = mockDoc({ status: UnitRegistrationStatus.Submitted });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    await expect(
      service.update(String(row._id), { notes: 'x' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits draft registration', async () => {
    const row = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    const res = await service.submit(String(row._id), actorId);
    expect(res.data?.status).toBe(UnitRegistrationStatus.Submitted);
    expect(row.save).toHaveBeenCalled();
  });

  it('mark-registered updates booking and unit softly', async () => {
    const row = mockDoc({ status: UnitRegistrationStatus.Submitted });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const bookingModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };
    const unitModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      }),
    };
    const service = buildService(model, bookingModel, unitModel);

    const res = await service.markRegistered(String(row._id), {}, actorId);
    expect(res.data?.status).toBe(UnitRegistrationStatus.Registered);
    expect(bookingModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(unitModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('cancels draft registration', async () => {
    const row = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    const res = await service.cancel(String(row._id), actorId);
    expect(res.data?.status).toBe(UnitRegistrationStatus.Cancelled);
    expect(row.cancelledAt).toBeInstanceOf(Date);
  });
});
