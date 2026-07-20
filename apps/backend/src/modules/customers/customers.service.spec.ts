import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { isEncryptedSensitive } from '../../common/utils/crypto.util';
import {
  Company,
  CompanySchema,
  CompanyStatus,
} from '../company/schemas/company.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import type { ResolvedUserAccess } from '../rbac/permissions.service';
import { PermissionsService } from '../rbac/permissions.service';
import { CustomersService } from './customers.service';
import {
  CustomerDocumentCategory,
  CustomerFile,
  CustomerFileSchema,
} from './schemas/customer-document.schema';
import {
  Customer,
  CustomerFundingType,
  CustomerKycStatus,
  CustomerSchema,
  CustomerStatus,
} from './schemas/customer.schema';

describe('CustomersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let customerModel: Model<Customer>;
  let documentModel: Model<CustomerFile>;
  let service: CustomersService;
  let companyId: string;

  const managerId = new Types.ObjectId().toHexString();
  const viewerId = new Types.ObjectId().toHexString();

  const manageAccess = {
    actorId: managerId,
    canManage: true,
  };

  const viewAccess = {
    actorId: viewerId,
    canManage: false,
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    customerModel = connection.model(
      Customer.name,
      CustomerSchema,
    ) as Model<Customer>;
    documentModel = connection.model(
      CustomerFile.name,
      CustomerFileSchema,
    ) as Model<CustomerFile>;
    const companyModel = connection.model(
      Company.name,
      CompanySchema,
    ) as Model<Company>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      customerModel.syncIndexes(),
      documentModel.syncIndexes(),
      companyModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const permissionsService = {
      resolveUserAccess: async (userId: string): Promise<ResolvedUserAccess> => ({
        userId: String(userId),
        roleIds: [],
        roleCodes: [],
        permissions:
          String(userId) === managerId
            ? ['customer.view', 'customer.manage']
            : ['customer.view'],
        bypassPermissions: false,
      }),
    } as unknown as PermissionsService;

    const configService = {
      get: (key: string) =>
        key === 'fieldEncryptionKey'
          ? 'luxaria-test-field-encryption-key'
          : undefined,
    } as unknown as ConfigService;

    service = new CustomersService(
      customerModel,
      documentModel,
      companyModel,
      numbering,
      permissionsService,
      configService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await customerModel.deleteMany({}).setOptions({ withDeleted: true });
    await documentModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Company.name).deleteMany({}).setOptions({ withDeleted: true });
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
  });

  it('creates customer with encrypted Aadhaar and CUS code', async () => {
    const created = await service.create(
      {
        fullName: 'Ravi Kumar',
        pan: 'AAAAA1111A',
        aadhaar: '1234 5678 9012',
        contact: { email: 'ravi@example.com', phone: '9000000001' },
        address: {
          addressLine1: '12 MG Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
        },
        occupation: 'Engineer',
        fundingType: CustomerFundingType.OwnFunds,
        companyId,
      },
      managerId,
    );

    expect(created.data?.customerCode).toMatch(/^CUS-/);
    expect(created.data?.aadhaarReference).toBe('9012');
    expect(created.data?.aadhaar).toBe('123456789012');
    expect(created.data?.fundingType).toBe(CustomerFundingType.OwnFunds);
    expect(created.data?.loanBank).toBeNull();

    const raw = await customerModel
      .findById(created.data!.id)
      .select('+aadhaarEncrypted')
      .lean();
    expect(raw?.aadhaarEncrypted).toBeTruthy();
    expect(isEncryptedSensitive(raw!.aadhaarEncrypted!)).toBe(true);
    expect(JSON.stringify(raw)).not.toContain('123456789012');
  });

  it('requires loanBank for bank_loan funding', async () => {
    await expect(
      service.create(
        {
          fullName: 'Loan Buyer',
          pan: 'BBBBB2222B',
          fundingType: CustomerFundingType.BankLoan,
        },
        managerId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const created = await service.create(
      {
        fullName: 'Loan Buyer',
        pan: 'BBBBB2222B',
        fundingType: CustomerFundingType.BankLoan,
        loanBank: 'HDFC Bank',
      },
      managerId,
    );
    expect(created.data?.loanBank).toBe('HDFC Bank');
  });

  it('hides full Aadhaar from view-only users', async () => {
    const created = await service.create(
      {
        fullName: 'Priya Nair',
        pan: 'CCCCC3333C',
        aadhaar: '987654321098',
        fundingType: CustomerFundingType.Mixed,
        loanBank: 'SBI',
        jointApplicant: {
          fullName: 'Anil Nair',
          relationship: 'Spouse',
          aadhaar: '112233445566',
        },
      },
      managerId,
    );

    const viewed = await service.getById(created.data!.id, viewAccess);
    expect(viewed.data?.aadhaarReference).toBe('1098');
    expect(viewed.data?.aadhaar).toBeNull();
    expect(viewed.data?.jointApplicant.aadhaarReference).toBe('5566');
    expect(viewed.data?.jointApplicant.aadhaar).toBeNull();

    const managed = await service.getById(created.data!.id, manageAccess);
    expect(managed.data?.aadhaar).toBe('987654321098');
    expect(managed.data?.jointApplicant.aadhaar).toBe('112233445566');
  });

  it('verifies KYC then activates; rejects activation without KYC', async () => {
    const created = await service.create(
      {
        fullName: 'KYC Customer',
        pan: 'DDDDD4444D',
        fundingType: CustomerFundingType.OwnFunds,
      },
      managerId,
    );

    await expect(
      service.activate(created.data!.id, manageAccess),
    ).rejects.toBeInstanceOf(BadRequestException);

    const verified = await service.verifyKyc(
      created.data!.id,
      { verified: true, notes: 'Docs OK' },
      manageAccess,
    );
    expect(verified.data?.kycStatus).toBe(CustomerKycStatus.Verified);
    expect(verified.data?.status).toBe(CustomerStatus.Active);

    const deactivated = await service.deactivate(
      created.data!.id,
      manageAccess,
    );
    expect(deactivated.data?.status).toBe(CustomerStatus.Inactive);

    const activated = await service.activate(created.data!.id, manageAccess);
    expect(activated.data?.status).toBe(CustomerStatus.Active);
  });

  it('blocks KYC verification for view-only users', async () => {
    const created = await service.create(
      {
        fullName: 'Scoped Viewer',
        pan: 'EEEEE5555E',
        fundingType: CustomerFundingType.OwnFunds,
      },
      managerId,
    );

    await expect(
      service.verifyKyc(created.data!.id, { verified: true }, viewAccess),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('protects sensitive KYC documents (no storage key in list; download gated)', async () => {
    const created = await service.create(
      {
        fullName: 'Doc Customer',
        pan: 'FFFFF6666F',
        fundingType: CustomerFundingType.OwnFunds,
      },
      managerId,
    );

    const uploaded = await service.addDocument(
      created.data!.id,
      {
        fileName: 'aadhaar.pdf',
        storageKey: 'uploads/private/customers/x/aadhaar.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        category: CustomerDocumentCategory.Aadhaar,
      },
      manageAccess,
    );

    expect(uploaded.data?.isSensitive).toBe(true);
    expect(uploaded.data).not.toHaveProperty('storageKey');
    expect(uploaded.data).not.toHaveProperty('filePath');

    const listed = await service.listDocuments(
      created.data!.id,
      {},
      viewAccess,
    );
    expect(listed.data).toHaveLength(1);
    expect(listed.data?.[0]).not.toHaveProperty('storageKey');

    await expect(
      service.getDocumentForDownload(
        created.data!.id,
        uploaded.data!.id,
        viewAccess,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const download = await service.getDocumentForDownload(
      created.data!.id,
      uploaded.data!.id,
      manageAccess,
    );
    expect(download.storageKey).toBe(
      'uploads/private/customers/x/aadhaar.pdf',
    );
    expect(download.isSensitive).toBe(true);

    const raw = await documentModel
      .findById(uploaded.data!.id)
      .lean();
    expect(raw).not.toHaveProperty('storageKey');

    const withKey = await documentModel
      .findById(uploaded.data!.id)
      .select('+storageKey')
      .lean();
    expect(withKey?.storageKey).toBe(
      'uploads/private/customers/x/aadhaar.pdf',
    );
  });

  it('rejects unsupported document MIME types', async () => {
    const created = await service.create(
      {
        fullName: 'Mime Customer',
        pan: 'GGGGG7777G',
        fundingType: CustomerFundingType.OwnFunds,
      },
      managerId,
    );

    await expect(
      service.addDocument(
        created.data!.id,
        {
          fileName: 'hack.exe',
          storageKey: 'uploads/private/customers/x/hack.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 10,
          category: CustomerDocumentCategory.Kyc,
        },
        manageAccess,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolveAccess reflects customer.manage', async () => {
    await expect(service.resolveAccess(managerId)).resolves.toEqual({
      actorId: managerId,
      canManage: true,
    });
    await expect(service.resolveAccess(viewerId)).resolves.toEqual({
      actorId: viewerId,
      canManage: false,
    });
  });

  it('searches by customer code, name, and aadhaar reference', async () => {
    await service.create(
      {
        fullName: 'Search Target',
        pan: 'HHHHH8888H',
        aadhaar: '556677889900',
        fundingType: CustomerFundingType.OwnFunds,
      },
      managerId,
    );

    const byRef = await service.list({ search: '9900' }, manageAccess);
    expect(byRef.data).toHaveLength(1);
    expect(byRef.data?.[0]?.fullName).toBe('Search Target');

    const byName = await service.list({ search: 'Search' }, manageAccess);
    expect(byName.data).toHaveLength(1);
  });
});
