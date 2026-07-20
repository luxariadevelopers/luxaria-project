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
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { BoqUnit } from '../boq/schemas/boq.schema';
import { ContractorsService } from './contractors.service';
import {
  ContractorDocumentCategory,
  ContractorFile,
  ContractorFileSchema,
} from './schemas/contractor-document.schema';
import {
  ContractorProjectAssignment,
  ContractorProjectAssignmentSchema,
} from './schemas/contractor-project-assignment.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from './schemas/contractor.schema';

describe('ContractorsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let contractorModel: Model<Contractor>;
  let measurementModel: Model<WorkMeasurement>;
  let service: ContractorsService;
  let companyId: string;
  let projectId: string;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const documentModel = connection.model(
      ContractorFile.name,
      ContractorFileSchema,
    ) as Model<ContractorFile>;
    const assignmentModel = connection.model(
      ContractorProjectAssignment.name,
      ContractorProjectAssignmentSchema,
    ) as Model<ContractorProjectAssignment>;
    const companyModel = connection.model(
      Company.name,
      CompanySchema,
    ) as Model<Company>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      contractorModel.syncIndexes(),
      documentModel.syncIndexes(),
      assignmentModel.syncIndexes(),
      companyModel.syncIndexes(),
      projectModel.syncIndexes(),
      measurementModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const configService = {
      get: (key: string) =>
        key === 'fieldEncryptionKey'
          ? 'luxaria-test-field-encryption-key'
          : undefined,
    } as unknown as ConfigService;

    service = new ContractorsService(
      contractorModel,
      documentModel,
      assignmentModel,
      companyModel,
      projectModel,
      measurementModel,
      numbering,
      configService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await contractorModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ContractorFile.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(ContractorProjectAssignment.name)
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
    await measurementModel.deleteMany({}).setOptions({ withDeleted: true });
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

  it('creates contractor with CON code, encrypted bank, and pending verification', async () => {
    const response = await service.create(
      {
        legalName: 'Sunrise Civil Contractors Pvt Ltd',
        tradeName: 'Sunrise Civil',
        contractorType: ContractorType.Civil,
        pan: 'ABCDE1234F',
        gstin: '33ABCDE1234F1Z5',
        workCategories: ['Brickwork', 'rcc'],
        rating: 4,
        contact: {
          email: 'ops@sunrise.example',
          phone: '9876543210',
          contactPerson: 'Kumar',
        },
        bankDetails: {
          bankName: 'HDFC',
          ifsc: 'HDFC0001234',
          accountHolderName: 'Sunrise Civil Contractors Pvt Ltd',
          accountNumber: '123456789012',
        },
        labourLicence: {
          licenceNumber: 'LL-TN-2026-001',
          issuedBy: 'Labour Dept TN',
          validFrom: '2026-01-01',
          validTo: '2027-12-31',
        },
        companyId,
      },
      actorId,
    );

    expect(response.data?.contractorCode).toMatch(/^CON-\d{6}$/);
    expect(response.data?.status).toBe(ContractorStatus.PendingVerification);
    expect(response.data?.verificationStatus).toBe(
      ContractorVerificationStatus.Pending,
    );
    expect(response.data?.contractorType).toBe(ContractorType.Civil);
    expect(response.data?.workCategories).toEqual(['brickwork', 'rcc']);
    expect(response.data?.labourLicence.licenceNumber).toBe('LL-TN-2026-001');
    expect(response.data?.labourLicence.isValid).toBe(true);
    expect(response.data?.bankDetails.accountNumber).toBe('123456789012');
    expect(response.data?.bankDetails.accountNumberLast4).toBe('9012');

    const stored = await contractorModel
      .findById(response.data!.id)
      .select('+bankDetails.accountNumberEncrypted')
      .lean()
      .exec();
    expect(
      isEncryptedSensitive(stored?.bankDetails?.accountNumberEncrypted ?? ''),
    ).toBe(true);
    expect(JSON.stringify(stored)).not.toContain('123456789012');
  });

  it('rejects invalid work category / licence dates / GSTIN', async () => {
    await expect(
      service.create(
        {
          legalName: 'Bad Category',
          contractorType: ContractorType.Labour,
          workCategories: ['Not Valid!'],
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          legalName: 'Bad Licence',
          contractorType: ContractorType.Labour,
          labourLicence: {
            validFrom: '2027-01-01',
            validTo: '2026-01-01',
          },
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(
        {
          legalName: 'Bad GST',
          contractorType: ContractorType.General,
          gstin: 'INVALID',
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates, verifies, activates, and blocks contractor', async () => {
    const created = await service.create(
      {
        legalName: 'Alpha Labour',
        contractorType: ContractorType.Labour,
        pan: 'AAAAA1111A',
      },
      actorId,
    );
    const id = created.data!.id;

    const updated = await service.update(
      id,
      { tradeName: 'Alpha', rating: 3 },
      actorId,
    );
    expect(updated.data?.tradeName).toBe('Alpha');
    expect(updated.data?.rating).toBe(3);

    await expect(service.activate(id, actorId)).rejects.toThrow(
      BadRequestException,
    );

    const verified = await service.verify(
      id,
      { verified: true, notes: 'Licence ok' },
      actorId,
    );
    expect(verified.data?.verificationStatus).toBe(
      ContractorVerificationStatus.Verified,
    );
    expect(verified.data?.status).toBe(ContractorStatus.Active);

    const blocked = await service.block(
      id,
      { reason: 'Safety issues' },
      actorId,
    );
    expect(blocked.data?.status).toBe(ContractorStatus.Blocked);
    expect(blocked.data?.blockReason).toBe('Safety issues');

    await expect(service.activate(id, actorId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('assigns contractor to project and filters list by project', async () => {
    const created = await service.create(
      {
        legalName: 'Project Contractor',
        contractorType: ContractorType.Civil,
        pan: 'BBBBB2222B',
      },
      actorId,
    );
    const contractorId = created.data!.id;

    const assigned = await service.assignProject(
      contractorId,
      { projectId, notes: 'Block A civil' },
      actorId,
    );
    expect(assigned.data?.projectId).toBe(projectId);

    const projects = await service.listProjects(contractorId, {});
    expect(projects.data).toHaveLength(1);

    const filtered = await service.list({ projectId });
    expect(filtered.data).toHaveLength(1);

    await service.unassignProject(contractorId, projectId, actorId);
    const after = await service.listProjects(contractorId, {});
    expect(after.data).toHaveLength(0);
  });

  it('uploads insurance / labour licence documents and lists them', async () => {
    const created = await service.create(
      {
        legalName: 'Doc Contractor',
        contractorType: ContractorType.General,
        pan: 'CCCCC3333C',
      },
      actorId,
    );
    const contractorId = created.data!.id;

    await service.addDocument(
      contractorId,
      {
        fileName: 'licence.pdf',
        filePath: `uploads/contractors/${contractorId}/licence.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1200,
        category: ContractorDocumentCategory.LabourLicence,
      },
      actorId,
    );
    await service.addDocument(
      contractorId,
      {
        fileName: 'insurance.pdf',
        filePath: `uploads/contractors/${contractorId}/insurance.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 800,
        category: ContractorDocumentCategory.Insurance,
      },
      actorId,
    );

    const listed = await service.listDocuments(contractorId, {
      category: ContractorDocumentCategory.Insurance,
    });
    expect(listed.data).toHaveLength(1);
    expect(listed.data?.[0]?.fileName).toBe('insurance.pdf');
  });

  it('returns performance summary with measurements and docs', async () => {
    const created = await service.create(
      {
        legalName: 'Perf Contractor',
        contractorType: ContractorType.Civil,
        pan: 'DDDDD4444D',
        rating: 4.5,
      },
      actorId,
    );
    const contractorId = created.data!.id;

    await service.assignProject(contractorId, { projectId }, actorId);
    await service.addDocument(
      contractorId,
      {
        fileName: 'ins.pdf',
        filePath: `uploads/contractors/${contractorId}/ins.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 100,
        category: ContractorDocumentCategory.Insurance,
      },
      actorId,
    );

    await measurementModel.create({
      measurementNumber: 'WM-2026-000099',
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      boqItemId: new Types.ObjectId(),
      boqCode: 'RCC-001',
      location: 'Block A',
      measurementDate: new Date('2026-07-10'),
      previousQuantity: 0,
      currentQuantity: 12,
      cumulativeQuantity: 12,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(actorId),
      status: WorkMeasurementStatus.Verified,
      verifiedBy: new Types.ObjectId(actorId),
      verifiedAt: new Date('2026-07-11'),
      boqPlannedQuantity: 100,
    });

    const perf = await service.getPerformance(contractorId);
    expect(perf.data?.rating).toBe(4.5);
    expect(perf.data?.activeProjectCount).toBe(1);
    expect(perf.data?.workMeasurements.verifiedCount).toBe(1);
    expect(perf.data?.workMeasurements.totalVerifiedQuantity).toBe(12);
    expect(perf.data?.documents.insuranceCount).toBe(1);
  });

  it('rejects duplicate PAN', async () => {
    await service.create(
      {
        legalName: 'One',
        contractorType: ContractorType.General,
        pan: 'EEEEE5555E',
      },
      actorId,
    );
    await expect(
      service.create(
        {
          legalName: 'Two',
          contractorType: ContractorType.General,
          pan: 'EEEEE5555E',
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
