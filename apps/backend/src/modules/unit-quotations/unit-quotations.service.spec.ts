import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UnitStatus } from '../units/schemas/unit.schema';
import { computeUnitQuotationTotals } from './unit-quotations.calculation';
import { UnitQuotationsService } from './unit-quotations.service';
import { UnitQuotationStatus } from './schemas/unit-quotation.schema';

describe('computeUnitQuotationTotals', () => {
  it('computes grandTotal from full price breakup (2 decimal rounding)', () => {
    const totals = computeUnitQuotationTotals({
      basePrice: 5_000_000,
      plc: 250_000,
      floorRise: 100_000,
      carPark: 350_000,
      clubHouse: 75_000,
      corpusFund: 50_000,
      registrationEstimate: 120_000,
      gst: 450_000,
      stampDutyEstimate: 300_000,
      otherCharges: 25_000,
      discount: 200_000,
      offerAmount: 50_000,
    });

    expect(totals.subtotal).toBe(5_600_000);
    expect(totals.taxTotal).toBe(870_000);
    expect(totals.grandTotal).toBe(6_470_000);
  });

  it('rejects discount + offer exceeding charge subtotal', () => {
    expect(() =>
      computeUnitQuotationTotals({
        basePrice: 100,
        discount: 60,
        offerAmount: 50,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('UnitQuotationsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId();

  function mockQuotationDoc(overrides: Record<string, unknown> = {}) {
    const id = new Types.ObjectId();
    return {
      _id: id,
      quotationNumber: 'UQ-2026-000001',
      companyId,
      projectId: new Types.ObjectId(projectId),
      unitId: new Types.ObjectId(unitId),
      leadId: null,
      customerId: null,
      version: 1,
      rootQuotationId: id,
      revisedFromId: null,
      status: UnitQuotationStatus.Draft,
      validUntil: null,
      pricing: {
        basePrice: 5_000_000,
        plc: 0,
        floorRise: 0,
        carPark: 0,
        clubHouse: 0,
        corpusFund: 0,
        registrationEstimate: 0,
        gst: 0,
        stampDutyEstimate: 0,
        discount: 0,
        offerAmount: 0,
        otherCharges: 0,
      },
      totals: { subtotal: 5_000_000, taxTotal: 0, grandTotal: 5_000_000 },
      notes: null,
      terms: null,
      rejectionReason: null,
      issuedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiredAt: null,
      convertedAt: null,
      convertedBookingId: null,
      convertedReservationId: null,
      attachments: [],
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function buildService(
    model: Record<string, unknown>,
    projectModel?: Record<string, unknown>,
    unitModel?: Record<string, unknown>,
  ) {
    return new UnitQuotationsService(
      model as never,
      (projectModel ?? {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(projectId),
            companyId,
          }),
        }),
      }) as never,
      (unitModel ?? {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(unitId),
            projectId: new Types.ObjectId(projectId),
            basePrice: 5_000_000,
            status: UnitStatus.Available,
          }),
        }),
      }) as never,
    );
  }

  it('creates draft and seeds basePrice from unit when omitted', async () => {
    const created = mockQuotationDoc();
    const model = {
      create: jest.fn().mockImplementation(async (payload) => ({
        ...created,
        ...payload,
        save: jest.fn().mockResolvedValue(undefined),
      })),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };

    const service = buildService(model);
    const res = await service.create(
      { projectId, unitId },
      actorId,
    );

    expect(res.data?.pricing.basePrice).toBe(5_000_000);
    expect(res.data?.status).toBe(UnitQuotationStatus.Draft);
    expect(model.create).toHaveBeenCalled();
  });

  it('revises quotation: supersedes previous and opens new draft version', async () => {
    const previous = mockQuotationDoc({
      status: UnitQuotationStatus.Issued,
      version: 2,
      pricing: {
        basePrice: 5_000_000,
        plc: 100_000,
        floorRise: 0,
        carPark: 0,
        clubHouse: 0,
        corpusFund: 0,
        registrationEstimate: 0,
        gst: 0,
        stampDutyEstimate: 0,
        discount: 0,
        offerAmount: 0,
        otherCharges: 0,
      },
    });

    const revised = mockQuotationDoc({
      _id: new Types.ObjectId(),
      quotationNumber: 'UQ-2026-000003',
      version: 3,
      revisedFromId: previous._id,
      status: UnitQuotationStatus.Draft,
      pricing: {
        ...previous.pricing,
        plc: 150_000,
      },
      totals: { subtotal: 5_150_000, taxTotal: 0, grandTotal: 5_150_000 },
    });

    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(previous),
      }),
      create: jest.fn().mockResolvedValue(revised),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(2),
        }),
      }),
    };

    const service = buildService(model);
    const res = await service.revise(
      String(previous._id),
      { pricing: { plc: 150_000 } },
      actorId,
    );

    expect(previous.status).toBe(UnitQuotationStatus.Superseded);
    expect(previous.save).toHaveBeenCalled();
    expect(res.data?.version).toBe(3);
    expect(res.data?.status).toBe(UnitQuotationStatus.Draft);
    expect(res.data?.revisedFromId).toBe(String(previous._id));
    expect(res.data?.pricing.plc).toBe(150_000);
  });

  it('issues with soft warning when unit is not available or held', async () => {
    const row = mockQuotationDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const unitModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(unitId),
          status: UnitStatus.Booked,
        }),
      }),
    };

    const service = buildService(model, undefined, unitModel);
    const res = await service.issue(String(row._id), actorId);

    expect(row.status).toBe(UnitQuotationStatus.Issued);
    expect(res.data?.unitAvailabilityWarning).toContain('booked');
  });
});
