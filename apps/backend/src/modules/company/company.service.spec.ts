import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { LUXARIA_AUTHORISED_SHARE_CAPITAL, LUXARIA_COMPANY_SEED } from './company.seed';
import { CompanySeedService } from './company.seed.service';
import { CompanyService } from './company.service';
import {
  CompanyAddressHistory,
  CompanyAddressHistorySchema,
  CompanyAddressType,
} from './schemas/company-address-history.schema';
import {
  CompanyCapitalHistory,
  CompanyCapitalHistorySchema,
  CompanyCapitalType,
} from './schemas/company-capital-history.schema';
import { Company, CompanySchema } from './schemas/company.schema';

describe('CompanyService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let companyModel: Model<Company>;
  let addressHistoryModel: Model<CompanyAddressHistory>;
  let capitalHistoryModel: Model<CompanyCapitalHistory>;
  let service: CompanyService;
  let seedService: CompanySeedService;
  let companyId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    addressHistoryModel = connection.model(
      CompanyAddressHistory.name,
      CompanyAddressHistorySchema,
    ) as Model<CompanyAddressHistory>;
    capitalHistoryModel = connection.model(
      CompanyCapitalHistory.name,
      CompanyCapitalHistorySchema,
    ) as Model<CompanyCapitalHistory>;
    await companyModel.syncIndexes();
    await addressHistoryModel.syncIndexes();
    await capitalHistoryModel.syncIndexes();

    service = new CompanyService(companyModel, addressHistoryModel, capitalHistoryModel);
    seedService = new CompanySeedService(
      companyModel,
      addressHistoryModel,
      capitalHistoryModel,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });
    await addressHistoryModel.deleteMany({}).setOptions({ withDeleted: true });
    await capitalHistoryModel.deleteMany({}).setOptions({ withDeleted: true });

    const seeded = await seedService.seedPrimaryCompany();
    companyId = seeded.companyId;
  });

  it('seeds Luxaria Developers with authorised capital ₹1,00,00,000', async () => {
    const response = await service.getPrimary();
    expect(response.data?.legalName).toBe(LUXARIA_COMPANY_SEED.legalName);
    expect(response.data?.companyCode).toBe('CMP-0001');
    expect(response.data?.authorisedShareCapital).toBe(LUXARIA_AUTHORISED_SHARE_CAPITAL);
    expect(response.data?.isPrimary).toBe(true);
    expect(response.data?.financialYearStartMonth).toBe(4);

    const oid = new Types.ObjectId(companyId);
    const capitalRows = await capitalHistoryModel.find({ companyId: oid }).lean();
    expect(capitalRows).toHaveLength(2);
  });

  it('is idempotent on re-seed and does not duplicate capital history', async () => {
    await seedService.seedPrimaryCompany();
    const count = await companyModel.countDocuments({});
    const capitalCount = await capitalHistoryModel.countDocuments({});
    expect(count).toBe(1);
    expect(capitalCount).toBe(2);
  });

  it('updates company profile and appends address history without losing prior rows', async () => {
    const oid = new Types.ObjectId(companyId);
    await service.update(companyId, {
      tradeName: 'Luxaria',
      registeredAddress: {
        line1: 'New Registered Office',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        country: 'India',
      },
      addressChangeReason: 'Registered office change',
    });

    const history = await addressHistoryModel
      .find({ companyId: oid, addressType: CompanyAddressType.Registered })
      .sort({ effectiveFrom: 1 })
      .lean();

    expect(history).toHaveLength(2);
    expect(history[0]?.effectiveTo).not.toBeNull();
    expect(history[1]?.address.city).toBe('Coimbatore');
    expect(history[1]?.effectiveTo).toBeNull();
  });

  it('updates statutory details with validation', async () => {
    const ok = await service.updateStatutory(companyId, {
      pan: 'ABCDE1234F',
      tan: 'CHEL12345A',
      gstin: '33ABCDE1234F1Z5',
      cin: 'U45200TN2020PTC123456',
    });
    expect(ok.data?.pan).toBe('ABCDE1234F');
    expect(ok.data?.gstin).toBe('33ABCDE1234F1Z5');
  });

  it('appends capital history and never overwrites prior capital entries', async () => {
    const oid = new Types.ObjectId(companyId);
    const before = await capitalHistoryModel
      .find({ companyId: oid, capitalType: CompanyCapitalType.Authorised })
      .lean();
    const seedRowId = String(before[0]?._id);
    const seedNewAmount = before[0]?.newAmount;

    await service.updateCapital(companyId, {
      capitalType: CompanyCapitalType.Authorised,
      newAmount: 20_000_000,
      changeReason: 'Board resolution',
      reference: 'BR-001',
    });

    const after = await capitalHistoryModel
      .find({ companyId: oid, capitalType: CompanyCapitalType.Authorised })
      .sort({ createdAt: 1 })
      .lean();

    expect(after).toHaveLength(2);
    const seedRow = after.find((row) => String(row._id) === seedRowId);
    expect(seedRow?.newAmount).toBe(seedNewAmount);
    expect(seedRow?.previousAmount).toBe(0);

    const latest = after[after.length - 1];
    expect(latest?.previousAmount).toBe(LUXARIA_AUTHORISED_SHARE_CAPITAL);
    expect(latest?.newAmount).toBe(20_000_000);

    const company = await service.getById(companyId);
    expect(company.data?.authorisedShareCapital).toBe(20_000_000);
  });

  it('rejects paid-up capital above authorised', async () => {
    await expect(
      service.updateCapital(companyId, {
        capitalType: CompanyCapitalType.PaidUp,
        newAmount: 50_000_000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects identical capital update', async () => {
    await expect(
      service.updateCapital(companyId, {
        capitalType: CompanyCapitalType.Authorised,
        newAmount: LUXARIA_AUTHORISED_SHARE_CAPITAL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores logo path', async () => {
    const response = await service.setLogo(companyId, 'uploads/company/logo-test.png');
    expect(response.data?.logo).toBe('uploads/company/logo-test.png');
  });
});
