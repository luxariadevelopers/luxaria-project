import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from '../accounting-period-closure/schemas/accounting-period.schema';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import { FinancialYearService } from './financial-year.service';
import {
  FinancialYearUnlockRequest,
  FinancialYearUnlockRequestSchema,
  UnlockRequestStatus,
} from './schemas/financial-year-unlock-request.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from './schemas/financial-year.schema';

describe('FinancialYearService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let fyModel: Model<FinancialYear>;
  let unlockModel: Model<FinancialYearUnlockRequest>;
  let companyModel: Model<Company>;
  let service: FinancialYearService;
  let companyId: string;
  const actorA = new Types.ObjectId().toHexString();
  const actorB = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    fyModel = connection.model(FinancialYear.name, FinancialYearSchema) as Model<FinancialYear>;
    unlockModel = connection.model(
      FinancialYearUnlockRequest.name,
      FinancialYearUnlockRequestSchema,
    ) as Model<FinancialYearUnlockRequest>;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    await fyModel.syncIndexes();
    await unlockModel.syncIndexes();
    await companyModel.syncIndexes();

    const periodModel = connection.model(
      AccountingPeriod.name,
      AccountingPeriodSchema,
    ) as Model<AccountingPeriod>;
    service = new FinancialYearService(
      fyModel,
      unlockModel,
      companyModel,
      periodModel,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await fyModel.deleteMany({}).setOptions({ withDeleted: true });
    await unlockModel.deleteMany({}).setOptions({ withDeleted: true });
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });

    const [company] = await companyModel.create([
      {
        companyCode: 'CMP-0001',
        legalName: 'Luxaria Developers Pvt. Ltd.',
        tradeName: 'Luxaria',
        registeredAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        corporateAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        authorisedShareCapital: 10_000_000,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: true,
      },
    ]);
    companyId = String(company._id);
  });

  it('creates a financial year and sets current when requested', async () => {
    const created = await service.create(
      {
        name: 'FY 2026-27',
        startDate: '2026-04-01',
        endDate: '2027-03-31',
        companyId,
        setAsCurrent: true,
      },
      actorA,
    );

    expect(created.data?.name).toBe('FY 2026-27');
    expect(created.data?.isCurrent).toBe(true);
    expect(created.data?.isLocked).toBe(false);
    expect(created.data?.status).toBe(FinancialYearStatus.Open);
  });

  it('rejects overlapping financial years', async () => {
    await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
    });

    await expect(
      service.create({
        name: 'Overlap',
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        companyId,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows only one current financial year', async () => {
    const first = await service.create({
      name: 'FY 2025-26',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
      companyId,
      setAsCurrent: true,
    });
    const second = await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
    });

    await service.setCurrent(second.data!.id, actorA);

    const refreshedFirst = await fyModel.findById(first.data!.id).lean();
    const refreshedSecond = await fyModel.findById(second.data!.id).lean();
    expect(refreshedFirst?.isCurrent).toBe(false);
    expect(refreshedSecond?.isCurrent).toBe(true);

    const currentCount = await fyModel.countDocuments({ isCurrent: true });
    expect(currentCount).toBe(1);
  });

  it('locked years reject accounting postings', async () => {
    const created = await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
      setAsCurrent: true,
    });

    await service.lock(created.data!.id, actorA);

    const validation = await service.validateTransactionDate({
      transactionDate: '2026-07-15',
      companyId,
      forPosting: true,
    });
    expect(validation.data?.valid).toBe(false);
    expect(validation.data?.reason).toMatch(/locked/i);

    await expect(
      service.assertPostingAllowed('2026-07-15', companyId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('unlock requires reason request then approval by a different user', async () => {
    const created = await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
    });
    await service.lock(created.data!.id, actorA);

    const request = await service.requestUnlock(
      created.data!.id,
      { reason: 'Need to reverse a misposted journal entry' },
      actorA,
    );
    expect(request.data?.status).toBe(UnlockRequestStatus.Pending);

    await expect(
      service.approveUnlock(
        created.data!.id,
        request.data!.id,
        { approvalNote: 'self approve' },
        actorA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const unlocked = await service.approveUnlock(
      created.data!.id,
      request.data!.id,
      { approvalNote: 'Approved for corrective posting' },
      actorB,
    );

    expect(unlocked.data?.financialYear.isLocked).toBe(false);
    expect(unlocked.data?.financialYear.status).toBe(FinancialYearStatus.Open);
    expect(unlocked.data?.unlockRequest.status).toBe(UnlockRequestStatus.Approved);

    const posting = await service.validateTransactionDate({
      transactionDate: '2026-07-15',
      companyId,
      forPosting: true,
    });
    expect(posting.data?.valid).toBe(true);
  });

  it('validates transaction dates inside and outside the year', async () => {
    await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
    });

    const inside = await service.validateTransactionDate({
      transactionDate: '2026-12-01',
      companyId,
      forPosting: true,
    });
    expect(inside.data?.valid).toBe(true);

    const outside = await service.validateTransactionDate({
      transactionDate: '2025-01-01',
      companyId,
      forPosting: true,
    });
    expect(outside.data?.valid).toBe(false);
    expect(outside.data?.reason).toMatch(/No financial year/);
  });

  it('rejects unlock request when year is not locked', async () => {
    const created = await service.create({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId,
    });

    await expect(
      service.requestUnlock(
        created.data!.id,
        { reason: 'Should not work for open year' },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes financial-year administration to the authenticated company', async () => {
    const [foreignCompany] = await companyModel.create([
      {
        companyCode: 'CMP-0002',
        legalName: 'Foreign Company Pvt. Ltd.',
        tradeName: 'Foreign',
        registeredAddress: {
          line1: 'Foreign Office',
          line2: null,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India',
        },
        corporateAddress: {
          line1: 'Foreign Office',
          line2: null,
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
          country: 'India',
        },
        authorisedShareCapital: 5_000_000,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: false,
      },
    ]);
    const foreignCompanyId = String(foreignCompany._id);
    const foreignYear = await service.create({
      name: 'Foreign FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId: foreignCompanyId,
    });

    await expect(
      service.getById(foreignYear.data!.id, companyId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.list({ companyId: foreignCompanyId }, companyId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create(
        {
          name: 'Forbidden foreign year',
          startDate: '2027-04-01',
          endDate: '2028-03-31',
          companyId: foreignCompanyId,
        },
        actorA,
        companyId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
