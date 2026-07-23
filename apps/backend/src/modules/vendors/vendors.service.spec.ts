import { BadRequestException, ConflictException } from '@nestjs/common';
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
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  VendorFile,
  VendorFileSchema,
  VendorDocumentCategory,
} from './schemas/vendor-document.schema';
import {
  VendorProjectAssignment,
  VendorProjectAssignmentSchema,
} from './schemas/vendor-project-assignment.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from './schemas/vendor.schema';
import { AccountingReportsService } from '../accounting-reports/accounting-reports.service';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { VendorsService } from './vendors.service';

describe('VendorsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let vendorModel: Model<Vendor>;
  let service: VendorsService;
  let accountingReports: { getReport: jest.Mock };
  let companyId: string;
  let projectId: string;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    vendorModel = connection.model(Vendor.name, VendorSchema) as Model<Vendor>;
    const documentModel = connection.model(
      VendorFile.name,
      VendorFileSchema,
    ) as Model<VendorFile>;
    const assignmentModel = connection.model(
      VendorProjectAssignment.name,
      VendorProjectAssignmentSchema,
    ) as Model<VendorProjectAssignment>;
    const companyModel = connection.model(
      Company.name,
      CompanySchema,
    ) as Model<Company>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      vendorModel.syncIndexes(),
      documentModel.syncIndexes(),
      assignmentModel.syncIndexes(),
      companyModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const configService = {
      get: (key: string) =>
        key === 'fieldEncryptionKey'
          ? 'luxaria-test-field-encryption-key'
          : undefined,
    } as unknown as ConfigService;

    accountingReports = {
      getReport: jest.fn().mockResolvedValue(
        createSuccessResponse(
          {
            openingBalance: 0,
            closingBalance: 0,
            rows: [],
            totals: {
              debit: 0,
              credit: 0,
              openingBalance: 0,
              closingBalance: 0,
            },
            meta: {
              reportType: 'vendor-ledger',
              title: 'Vendor Ledger',
              filters: {
                financialYearId: null,
                financialYearName: null,
                projectId: null,
                projectCode: null,
                projectName: null,
                from: null,
                to: null,
                accountId: null,
                partyId: null,
              },
              generatedAt: new Date().toISOString(),
              reconciled: true,
              reconciliationNotes: [],
            },
          },
          'Vendor Ledger',
        ),
      ),
    };

    service = new VendorsService(
      vendorModel,
      documentModel,
      assignmentModel,
      companyModel,
      projectModel,
      numbering,
      configService,
      accountingReports as unknown as AccountingReportsService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    accountingReports.getReport.mockClear();
    await vendorModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(VendorFile.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(VendorProjectAssignment.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Company.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const address = {
      line1: 'Office',
      line2: null,
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      country: 'India',
    };
    const [company] = await connection.model(Company.name).create([
      {
        companyCode: 'CMP-0001',
        legalName: 'Luxaria Developers Pvt. Ltd.',
        tradeName: 'Luxaria',
        registeredAddress: address,
        corporateAddress: address,
        authorisedShareCapital: 10_000_000,
        paidUpShareCapital: 10_000_000,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: true,
      },
    ]);
    companyId = String(company._id);

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-0001',
        projectName: 'Marina Residences',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        companyId: company._id,
      },
    ]);
    projectId = String(project._id);
  });

  it('creates vendor with VEN code, encrypted bank, and pending verification', async () => {
    const response = await service.create(
      {
        legalName: 'Southern Steels Pvt Ltd',
        tradeName: 'Southern Steels',
        pan: 'ABCDE1234F',
        gstin: '33ABCDE1234F1Z5',
        materialCategories: ['Steel', 'cement'],
        paymentTerms: 'Net 30',
        creditLimit: 250000,
        tdsApplicable: true,
        tdsPercentage: 1,
        retentionPercentage: 5,
        rating: 4,
        contact: {
          email: 'sales@southern.example',
          phone: '9876543210',
          contactPerson: 'Ravi',
        },
        billingAddress: {
          line1: 'Industrial Estate',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
        },
        bankDetails: {
          bankName: 'HDFC',
          ifsc: 'HDFC0001234',
          accountHolderName: 'Southern Steels Pvt Ltd',
          accountNumber: '123456789012',
        },
        companyId,
      },
      actorId,
    );

    expect(response.data?.vendorCode).toMatch(/^VEN-\d{6}$/);
    expect(response.data?.status).toBe(VendorStatus.PendingVerification);
    expect(response.data?.verificationStatus).toBe(
      VendorVerificationStatus.Pending,
    );
    expect(response.data?.materialCategories).toEqual(['steel', 'cement']);
    expect(response.data?.bankDetails.accountNumber).toBe('123456789012');
    expect(response.data?.bankDetails.accountNumberLast4).toBe('9012');

    const stored = await vendorModel
      .findById(response.data!.id)
      .select('+bankDetails.accountNumberEncrypted')
      .lean()
      .exec();
    expect(
      isEncryptedSensitive(stored?.bankDetails?.accountNumberEncrypted ?? ''),
    ).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('123456789012');
  });

  it('rejects invalid TDS / GSTIN / material category on create', async () => {
    await expect(
      service.create(
        {
          legalName: 'Bad Vendor',
          tdsApplicable: true,
          tdsPercentage: null,
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          legalName: 'Bad GST',
          gstin: 'INVALID',
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          legalName: 'Bad Category',
          materialCategories: ['Not Valid!'],
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates, verifies, activates, and blocks vendor', async () => {
    const created = await service.create(
      {
        legalName: 'Alpha Supplies',
        pan: 'AAAAA1111A',
      },
      actorId,
    );
    const id = created.data!.id;

    const updated = await service.update(
      id,
      { tradeName: 'Alpha', creditLimit: 10000, rating: 3 },
      actorId,
    );
    expect(updated.data?.tradeName).toBe('Alpha');
    expect(updated.data?.creditLimit).toBe(10000);

    await expect(service.activate(id, actorId)).rejects.toThrow(
      BadRequestException,
    );

    const verified = await service.verify(
      id,
      { verified: true, notes: 'Docs ok' },
      actorId,
    );
    expect(verified.data?.verificationStatus).toBe(
      VendorVerificationStatus.Verified,
    );
    expect(verified.data?.status).toBe(VendorStatus.Active);

    const blocked = await service.block(
      id,
      { reason: 'Quality issues' },
      actorId,
    );
    expect(blocked.data?.status).toBe(VendorStatus.Blocked);
    expect(blocked.data?.blockReason).toBe('Quality issues');

    await expect(service.activate(id, actorId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('searches vendors and filters by material category', async () => {
    await service.create(
      {
        legalName: 'Cement House',
        materialCategories: ['cement'],
        pan: 'BBBBB2222B',
      },
      actorId,
    );
    await service.create(
      {
        legalName: 'Steel House',
        materialCategories: ['steel'],
        pan: 'CCCCC3333C',
      },
      actorId,
    );

    const search = await service.list({ search: 'steel' });
    expect(search.data).toHaveLength(1);
    expect(search.data?.[0]?.legalName).toBe('Steel House');

    const byCategory = await service.list({ materialCategory: 'cement' });
    expect(byCategory.data).toHaveLength(1);
    expect(byCategory.data?.[0]?.legalName).toBe('Cement House');
  });

  it('assigns vendor to project and returns journal-backed ledger', async () => {
    const created = await service.create(
      { legalName: 'Project Vendor', pan: 'DDDDD4444D' },
      actorId,
    );
    const vendorId = created.data!.id;

    const assigned = await service.assignProject(
      vendorId,
      { projectId, notes: 'Primary steel vendor' },
      actorId,
    );
    expect(assigned.data?.projectId).toBe(projectId);

    const projects = await service.listProjects(vendorId, {});
    expect(projects.data).toHaveLength(1);

    const filtered = await service.list({ projectId });
    expect(filtered.data).toHaveLength(1);

    await service.unassignProject(vendorId, projectId, actorId);
    const after = await service.listProjects(vendorId, {});
    expect(after.data).toHaveLength(0);

    accountingReports.getReport.mockResolvedValueOnce(
      createSuccessResponse(
        {
          openingBalance: 100,
          closingBalance: 250,
          rows: [
            {
              journalId: new Types.ObjectId().toHexString(),
              journalNumber: 'JE-1',
              journalDate: '2026-05-01T00:00:00.000Z',
              accountId: new Types.ObjectId().toHexString(),
              accountCode: '2100',
              accountName: 'Accounts Payable',
              narration: 'Vendor invoice',
              description: null,
              debit: 0,
              credit: 150,
              runningBalance: 250,
              projectId: null,
              partyType: 'vendor',
              partyId: vendorId,
              fundingSource: null,
              sourceModule: 'vendor-invoices',
              sourceEntityType: 'vendor_invoice',
              sourceEntityId: new Types.ObjectId().toHexString(),
              drillDown: [],
              partyName: 'Project Vendor',
            },
          ],
          totals: {
            debit: 0,
            credit: 150,
            openingBalance: 100,
            closingBalance: 250,
          },
          meta: {
            reportType: 'vendor-ledger',
            title: 'Vendor Ledger',
            filters: {
              financialYearId: null,
              financialYearName: null,
              projectId: null,
              projectCode: null,
              projectName: null,
              from: null,
              to: null,
              accountId: null,
              partyId: vendorId,
            },
            generatedAt: '2026-07-22T00:00:00.000Z',
            reconciled: true,
            reconciliationNotes: [],
          },
        },
        'Vendor Ledger',
      ),
    );

    const ledger = await service.getLedger(
      vendorId,
      { from: '2026-04-01', to: '2026-07-22' },
      actorId,
    );
    expect(accountingReports.getReport).toHaveBeenCalledWith(
      'vendor-ledger',
      expect.objectContaining({
        partyId: vendorId,
        from: '2026-04-01',
        to: '2026-07-22',
      }),
      actorId,
    );
    expect(ledger.data?.rows).toHaveLength(1);
    expect(ledger.data?.closingBalance).toBe(250);
    expect(ledger.data?.totalCredit).toBe(150);
    expect(ledger.data?.vendorId).toBe(vendorId);
    expect(ledger.message).toBe('Vendor ledger');
  });

  it('uploads and lists agreement documents', async () => {
    const created = await service.create(
      { legalName: 'Doc Vendor', pan: 'EEEEE5555E' },
      actorId,
    );
    const vendorId = created.data!.id;

    const uploaded = await service.addDocument(
      vendorId,
      {
        fileName: 'agreement.pdf',
        filePath: `uploads/vendors/${vendorId}/agreement.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        category: VendorDocumentCategory.Agreement,
      },
      actorId,
    );
    expect(uploaded.data?.category).toBe(VendorDocumentCategory.Agreement);

    const listed = await service.listDocuments(vendorId, {
      category: VendorDocumentCategory.Agreement,
    });
    expect(listed.data).toHaveLength(1);
  });

  it('rejects duplicate PAN', async () => {
    await service.create(
      { legalName: 'One', pan: 'FFFFF6666F' },
      actorId,
    );
    await expect(
      service.create({ legalName: 'Two', pan: 'FFFFF6666F' }, actorId),
    ).rejects.toThrow(ConflictException);
  });
});
