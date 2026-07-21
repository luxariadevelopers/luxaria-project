import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UnitStatus } from '../units/schemas/unit.schema';
import { UnitHandoversService } from './unit-handovers.service';
import {
  SnagStatus,
  UnitHandoverStatus,
} from './schemas/unit-handover.schema';

describe('UnitHandoversService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();

  function mockHandover(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      handoverNumber: 'HO-2026-000001',
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: new Types.ObjectId(unitId),
      status: UnitHandoverStatus.Draft,
      scheduledAt: null,
      completedAt: null,
      snagList: [],
      keysHandedOver: false,
      meterReadings: [],
      warrantyDocuments: [],
      maintenanceNotes: null,
      assetRegister: [],
      customerAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedByName: null,
      photos: [],
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates a draft handover', async () => {
    const created = mockHandover();
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new UnitHandoversService(
      model as never,
      { findById: jest.fn() } as never,
    );

    const res = await service.create(
      { projectId, bookingId, customerId, unitId },
      actorId,
    );

    expect(res.data?.status).toBe(UnitHandoverStatus.Draft);
    expect(model.create).toHaveBeenCalled();
  });

  it('requires keys and acknowledgement to complete', async () => {
    const doc = mockHandover({
      status: UnitHandoverStatus.InProgress,
      keysHandedOver: false,
      customerAcknowledged: false,
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new UnitHandoversService(
      model as never,
      { findById: jest.fn() } as never,
    );

    await expect(service.complete(String(doc._id), actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('completes handover and sets unit status to handed_over', async () => {
    const doc = mockHandover({
      status: UnitHandoverStatus.InProgress,
      keysHandedOver: true,
      customerAcknowledged: true,
    });
    const unit = {
      _id: doc.unitId,
      status: 'registered',
      notes: 'Existing note',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const unitModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(unit),
      }),
    };
    const service = new UnitHandoversService(
      model as never,
      unitModel as never,
    );

    const res = await service.complete(String(doc._id), actorId);
    expect(res.data?.status).toBe(UnitHandoverStatus.Completed);
    expect(unit.status).toBe(UnitStatus.HandedOver);
    expect(unit.save).toHaveBeenCalled();
  });

  it('closes an open snag', async () => {
    const snagId = new Types.ObjectId();
    const snag = {
      _id: snagId,
      description: 'Paint chip',
      status: SnagStatus.Open,
      closedAt: null,
      notes: null,
    };
    const snagList = [snag] as unknown as typeof snag[] & {
      id: (id: string) => typeof snag | null;
    };
    snagList.id = jest.fn().mockReturnValue(snag);
    const doc = mockHandover({
      status: UnitHandoverStatus.InProgress,
      snagList,
    });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new UnitHandoversService(
      model as never,
      { findById: jest.fn() } as never,
    );

    const res = await service.closeSnag(
      String(doc._id),
      String(snagId),
      { notes: 'Fixed' },
      actorId,
    );
    expect(res.message).toBe('Snag closed');
    expect(doc.save).toHaveBeenCalled();
  });
});
