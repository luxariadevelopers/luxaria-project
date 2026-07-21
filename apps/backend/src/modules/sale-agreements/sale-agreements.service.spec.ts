import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SaleAgreementsService } from './sale-agreements.service';
import { SaleAgreementStatus } from './schemas/sale-agreement.schema';

describe('SaleAgreementsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const bookingId = new Types.ObjectId().toHexString();
  const customerId = new Types.ObjectId().toHexString();
  const unitId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    const id = new Types.ObjectId();
    return {
      _id: id,
      agreementNumber: 'SAG-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: new Types.ObjectId(projectId),
      bookingId: new Types.ObjectId(bookingId),
      customerId: new Types.ObjectId(customerId),
      unitId: new Types.ObjectId(unitId),
      version: 1,
      rootAgreementId: id,
      revisedFromId: null,
      status: SaleAgreementStatus.Draft,
      agreementValue: 5_000_000,
      stampPaper: {},
      paymentScheduleSnapshot: [],
      milestones: [],
      clauses: [],
      attachments: [],
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function buildService(model: Record<string, unknown>, bookingModel?: Record<string, unknown>) {
    return new SaleAgreementsService(model as never, bookingModel as never);
  }

  it('creates draft sale agreement', async () => {
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
      {
        companyId,
        projectId,
        bookingId,
        customerId,
        unitId,
        agreementValue: 5_000_000,
      },
      actorId,
    );

    expect(res.data?.status).toBe(SaleAgreementStatus.Draft);
    expect(res.data?.agreementValue).toBe(5_000_000);
    expect(model.create).toHaveBeenCalled();
    expect(created.save).toHaveBeenCalled();
  });

  it('rejects update on non-draft agreement', async () => {
    const row = mockDoc({ status: SaleAgreementStatus.Approved });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    await expect(
      service.update(String(row._id), { agreementValue: 1 }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits draft agreement', async () => {
    const row = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const service = buildService(model);

    const res = await service.submit(String(row._id), actorId);
    expect(res.data?.status).toBe(SaleAgreementStatus.PendingApproval);
    expect(row.save).toHaveBeenCalled();
  });

  it('executes approved agreement and soft-updates booking', async () => {
    const row = mockDoc({
      status: SaleAgreementStatus.Approved,
    });
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
    const service = buildService(model, bookingModel);

    const res = await service.execute(String(row._id), actorId);
    expect(res.data?.status).toBe(SaleAgreementStatus.Executed);
    expect(bookingModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('revise marks source superseded and creates new draft version', async () => {
    const source = mockDoc({ status: SaleAgreementStatus.Approved, version: 2 });
    const revised = mockDoc({ version: 3, revisedFromId: source._id });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(source),
      }),
      create: jest.fn().mockResolvedValue(revised),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(1),
        }),
      }),
    };
    const service = buildService(model);

    const res = await service.revise(String(source._id), {}, actorId);
    expect(source.status).toBe(SaleAgreementStatus.Superseded);
    expect(res.data?.version).toBe(3);
    expect(model.create).toHaveBeenCalled();
  });
});
