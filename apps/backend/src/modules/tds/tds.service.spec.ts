import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  TdsDeductionStatus,
  TdsPartyType,
} from './schemas/tds-deduction.schema';
import {
  TdsFormType,
  TdsQuarter,
  TdsReturnStatus,
} from './schemas/tds-return.schema';
import { TdsSectionStatus } from './schemas/tds-section.schema';
import { TdsService } from './tds.service';

describe('TdsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const sectionId = new Types.ObjectId().toHexString();

  function mockSection(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(sectionId),
      sectionCode: '194C',
      name: 'Contractors',
      ratePercent: 1,
      thresholdAmount: 30_000,
      status: TdsSectionStatus.Active,
      notes: null,
      ...overrides,
    };
  }

  function mockDeduction(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      deductionNumber: 'TDS-DED-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: null,
      sectionId: new Types.ObjectId(sectionId),
      sectionCode: '194C',
      partyType: TdsPartyType.Contractor,
      partyId: new Types.ObjectId(),
      partyName: 'ABC Contractors',
      partyPan: 'ABCDE1234F',
      deducteeType: 'company',
      transactionDate: new Date('2026-04-15'),
      transactionAmount: 100_000,
      tdsAmount: 1_000,
      sourceModule: null,
      sourceEntityType: null,
      sourceEntityId: null,
      challanNumber: null,
      challanDate: null,
      bsrCode: null,
      certificateNumber: null,
      status: TdsDeductionStatus.Withheld,
      journalEntryId: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function mockReturn(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      returnNumber: 'TDS-FORM26Q-202526-Q1-001',
      companyId: new Types.ObjectId(companyId),
      formType: TdsFormType.Form26q,
      quarter: TdsQuarter.Q1,
      financialYearLabel: '2025-26',
      status: TdsReturnStatus.Draft,
      totalDeductees: 0,
      totalTransactionAmount: 0,
      totalTds: 0,
      acknowledgementNumber: null,
      filedAt: null,
      notes: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates a withheld deduction from active section', async () => {
    const sectionModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSection()),
      }),
    };
    const created = mockDeduction();
    const deductionModel = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = new TdsService(
      sectionModel as never,
      deductionModel as never,
      {} as never,
    );

    const res = await service.createDeduction(
      {
        companyId,
        sectionId,
        partyType: TdsPartyType.Contractor,
        partyId: new Types.ObjectId().toHexString(),
        partyName: 'ABC Contractors',
        deducteeType: 'company',
        transactionDate: '2026-04-15',
        transactionAmount: 100_000,
        tdsAmount: 1_000,
      },
      actorId,
    );

    expect(res.data?.status).toBe(TdsDeductionStatus.Withheld);
    expect(deductionModel.create).toHaveBeenCalled();
  });

  it('marks withheld deduction as deposited then certified', async () => {
    const doc = mockDeduction();
    const deductionModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new TdsService({} as never, deductionModel as never, {} as never);

    const deposited = await service.markDeposited(
      String(doc._id),
      { challanNumber: 'CH-001', challanDate: '2026-04-20' },
      actorId,
    );
    expect(deposited.data?.status).toBe(TdsDeductionStatus.Deposited);

    doc.status = TdsDeductionStatus.Deposited;
    const certified = await service.markCertified(
      String(doc._id),
      { certificateNumber: 'CERT-001' },
      actorId,
    );
    expect(certified.data?.status).toBe(TdsDeductionStatus.Certified);
  });

  it('rejects certifying a withheld deduction', async () => {
    const doc = mockDeduction({ status: TdsDeductionStatus.Withheld });
    const deductionModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new TdsService({} as never, deductionModel as never, {} as never);

    await expect(
      service.markCertified(
        String(doc._id),
        { certificateNumber: 'CERT-001' },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes and files a quarterly return', async () => {
    const row = mockReturn();
    const returnModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(row),
      }),
    };
    const deductionModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              partyType: TdsPartyType.Contractor,
              partyId: new Types.ObjectId(),
              partyName: 'A',
              transactionAmount: 100_000,
              tdsAmount: 1_000,
            },
            {
              partyType: TdsPartyType.Vendor,
              partyId: new Types.ObjectId(),
              partyName: 'B',
              transactionAmount: 50_000,
              tdsAmount: 500,
            },
          ]),
        }),
      }),
    };
    const service = new TdsService(
      {} as never,
      deductionModel as never,
      returnModel as never,
    );

    const computed = await service.computeReturn(String(row._id), actorId);
    expect(computed.data?.status).toBe(TdsReturnStatus.Computed);
    expect(computed.data?.totalDeductees).toBe(2);
    expect(computed.data?.totalTds).toBe(1_500);

    row.status = TdsReturnStatus.Computed;
    const filed = await service.fileReturn(
      String(row._id),
      { acknowledgementNumber: 'TDS-ACK-99' },
      actorId,
    );
    expect(filed.data?.status).toBe(TdsReturnStatus.Filed);
    expect(filed.data?.acknowledgementNumber).toBe('TDS-ACK-99');
  });
});
