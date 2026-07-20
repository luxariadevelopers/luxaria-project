import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { isEncryptedSensitive } from '../../common/utils/crypto.util';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import {
  Director,
  DirectorSchema,
  DirectorStatus,
} from '../directors/schemas/director.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import type { ResolvedUserAccess } from '../rbac/permissions.service';
import { PermissionsService } from '../rbac/permissions.service';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { InvestorsService } from './investors.service';
import {
  InvestorFile,
  InvestorFileSchema,
} from './schemas/investor-document.schema';
import {
  Investor,
  InvestorKycStatus,
  InvestorSchema,
  InvestorStatus,
  InvestorType,
} from './schemas/investor.schema';

describe('InvestorsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let investorModel: Model<Investor>;
  let service: InvestorsService;
  let companyId: string;
  let directorId: string;
  const staffId = new Types.ObjectId().toHexString();
  const investorUserA = new Types.ObjectId().toHexString();
  const investorUserB = new Types.ObjectId().toHexString();

  const staffAccess = {
    actorId: staffId,
    canViewAll: true,
  };

  const ownAccessA = {
    actorId: investorUserA,
    canViewAll: false,
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    investorModel = connection.model(Investor.name, InvestorSchema) as Model<Investor>;
    const documentModel = connection.model(
      InvestorFile.name,
      InvestorFileSchema,
    ) as Model<InvestorFile>;
    const userModel = connection.model(User.name, UserSchema) as Model<User>;
    const companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    const directorModel = connection.model(
      Director.name,
      DirectorSchema,
    ) as Model<Director>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;

    await Promise.all([
      investorModel.syncIndexes(),
      documentModel.syncIndexes(),
      userModel.syncIndexes(),
      companyModel.syncIndexes(),
      directorModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const permissionsService = {
      resolveUserAccess: async (userId: string): Promise<ResolvedUserAccess> => ({
        userId: String(userId),
        roleIds: [],
        roleCodes: [],
        permissions:
          String(userId) === staffId
            ? ['investor.view', 'investor.view_all']
            : ['investor.view'],
        bypassPermissions: false,
      }),
    } as unknown as PermissionsService;

    const configService = {
      get: (key: string) =>
        key === 'fieldEncryptionKey'
          ? 'luxaria-test-field-encryption-key'
          : undefined,
    } as unknown as ConfigService;

    service = new InvestorsService(
      investorModel,
      documentModel,
      userModel,
      companyModel,
      directorModel,
      numbering,
      permissionsService,
      configService,
    );

    for (const id of [staffId, investorUserA, investorUserB]) {
      await userModel.create({
        _id: new Types.ObjectId(id),
        userCode: `USR-${id.slice(-4)}`,
        fullName: `User ${id.slice(-4)}`,
        email: `${id.slice(-6)}@test.luxaria.local`,
        mobile: null,
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [],
      });
    }
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await investorModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(InvestorFile.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Company.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Director.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [company] = await connection.model(Company.name).create([
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

    const [director] = await connection.model(Director.name).create([
      {
        companyId: company._id,
        directorCode: 'DIR-0001',
        fullName: 'Director One',
        din: '10000001',
        status: DirectorStatus.Active,
        isPlaceholder: true,
      },
    ]);
    directorId = String(director._id);
  });

  it('creates investor with encrypted bank account number', async () => {
    const created = await service.create(
      {
        investorType: InvestorType.Individual,
        legalName: 'Investor Alpha',
        pan: 'AAAAA1111A',
        userId: investorUserA,
        contact: { email: 'alpha@example.com', phone: '9000000001' },
        bankDetails: {
          bankName: 'HDFC Bank',
          ifsc: 'HDFC0001234',
          accountHolderName: 'Investor Alpha',
          accountNumber: '123456789012',
        },
        companyId,
      },
      staffId,
    );

    expect(created.data?.investorCode).toMatch(/^INV-/);
    expect(created.data?.bankDetails.accountNumber).toBe('123456789012');
    expect(created.data?.bankDetails.accountNumberLast4).toBe('9012');

    const raw = await investorModel
      .findById(created.data!.id)
      .select('+bankDetails.accountNumberEncrypted')
      .lean();
    expect(raw?.bankDetails?.accountNumberEncrypted).toBeTruthy();
    expect(isEncryptedSensitive(raw!.bankDetails!.accountNumberEncrypted!)).toBe(
      true,
    );
    expect(JSON.stringify(raw)).not.toContain('123456789012');
  });

  it('requires CIN for company investors', async () => {
    await expect(
      service.create(
        {
          investorType: InvestorType.Company,
          legalName: 'Acme Pvt Ltd',
          pan: 'BBBBB2222B',
        },
        staffId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes list/get so investors cannot see other investors', async () => {
    const a = await service.create(
      {
        investorType: InvestorType.Individual,
        legalName: 'Investor A',
        pan: 'CCCCC3333C',
        userId: investorUserA,
      },
      staffId,
    );
    const b = await service.create(
      {
        investorType: InvestorType.Individual,
        legalName: 'Investor B',
        pan: 'DDDDD4444D',
        userId: investorUserB,
      },
      staffId,
    );

    const listA = await service.list({}, ownAccessA);
    expect(listA.data).toHaveLength(1);
    expect(listA.data?.[0]?.id).toBe(a.data?.id);

    await expect(service.getById(b.data!.id, ownAccessA)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const staffList = await service.list({ search: 'Investor' }, staffAccess);
    expect(staffList.data).toHaveLength(2);
  });

  it('verifies KYC then activates; rejects activation without KYC', async () => {
    const created = await service.create(
      {
        investorType: InvestorType.DirectorAsProjectInvestor,
        legalName: 'Director Investor',
        pan: 'EEEEE5555E',
        directorId,
      },
      staffId,
    );

    await expect(
      service.activate(created.data!.id, staffAccess),
    ).rejects.toBeInstanceOf(BadRequestException);

    const verified = await service.verifyKyc(
      created.data!.id,
      { verified: true, notes: 'Docs OK' },
      staffAccess,
    );
    expect(verified.data?.kycStatus).toBe(InvestorKycStatus.Verified);
    expect(verified.data?.status).toBe(InvestorStatus.Active);

    const deactivated = await service.deactivate(created.data!.id, staffAccess);
    expect(deactivated.data?.status).toBe(InvestorStatus.Inactive);

    const activated = await service.activate(created.data!.id, staffAccess);
    expect(activated.data?.status).toBe(InvestorStatus.Active);
  });

  it('blocks KYC verification for non-staff scoped users', async () => {
    const created = await service.create(
      {
        investorType: InvestorType.Individual,
        legalName: 'Scoped User',
        pan: 'FFFFF6666F',
        userId: investorUserA,
      },
      staffId,
    );

    await expect(
      service.verifyKyc(created.data!.id, { verified: true }, ownAccessA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('resolveAccess reflects view_all for staff', async () => {
    await expect(service.resolveAccess(staffId)).resolves.toEqual({
      actorId: staffId,
      canViewAll: true,
    });
    await expect(service.resolveAccess(investorUserA)).resolves.toEqual({
      actorId: investorUserA,
      canViewAll: false,
    });
  });
});
