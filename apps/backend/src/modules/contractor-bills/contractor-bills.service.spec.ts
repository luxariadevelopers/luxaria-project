import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { BoqUnit } from '../boq/schemas/boq.schema';
import {
  ContractorAgreement,
  ContractorAgreementBillingCycle,
  ContractorAgreementSchema,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
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
import { ContractorBillsService } from './contractor-bills.service';
import {
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from './schemas/contractor-bill.schema';

describe('ContractorBillsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ContractorBillsService;
  let billModel: Model<ContractorBill>;
  let agreementModel: Model<ContractorAgreement>;
  let measurementModel: Model<WorkMeasurement>;

  let actorId: string;
  let engineerId: string;
  let projectId: string;
  let contractorId: string;
  let agreementId: string;
  let boqItemId: string;
  let measurementId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    billModel = connection.model(
      ContractorBill.name,
      ContractorBillSchema,
    ) as Model<ContractorBill>;
    agreementModel = connection.model(
      ContractorAgreement.name,
      ContractorAgreementSchema,
    ) as Model<ContractorAgreement>;
    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      billModel.syncIndexes(),
      agreementModel.syncIndexes(),
      measurementModel.syncIndexes(),
      projectModel.syncIndexes(),
      contractorModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new ContractorBillsService(
      billModel,
      agreementModel,
      measurementModel,
      projectModel,
      contractorModel,
      new NumberingService(counterModel),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    engineerId = new Types.ObjectId().toHexString();
    boqItemId = new Types.ObjectId().toHexString();

    await billModel.deleteMany({}).setOptions({ withDeleted: true });
    await agreementModel.deleteMany({}).setOptions({ withDeleted: true });
    await measurementModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Contractor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-CB-001',
        projectName: 'RA Bill Tower',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectId = String(project._id);

    const [contractor] = await connection.model(Contractor.name).create([
      {
        contractorCode: 'CON-000301',
        legalName: 'RA Civil Works',
        contractorType: ContractorType.Civil,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);

    const [agreement] = await agreementModel.create([
      {
        agreementNumber: 'CA-2026-000301',
        version: 1,
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(projectId),
        workScope: 'Civil works',
        boqItems: [
          {
            boqItemId: new Types.ObjectId(boqItemId),
            boqCode: 'RCC-001',
            description: 'RCC columns',
            unit: BoqUnit.CubicMetre,
            agreedQuantity: 100,
            agreedRate: 1000,
            agreedValue: 100000,
          },
        ],
        agreedRatesTotal: 100000,
        agreedQuantity: 100,
        manpowerCommitment: 20,
        skillMix: [],
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        billingCycle: ContractorAgreementBillingCycle.Monthly,
        advance: { amount: 50000, terms: 'Against BG' },
        recoveryPlan: { method: 'percent_per_bill', percentPerBill: 20 },
        retentionPercentage: 5,
        status: ContractorAgreementStatus.Active,
      },
    ]);
    agreementId = String(agreement._id);

    const [measurement] = await measurementModel.create([
      {
        measurementNumber: 'WM-2026-000301',
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        boqItemId: new Types.ObjectId(boqItemId),
        boqCode: 'RCC-001',
        location: 'Block A',
        measurementDate: new Date('2026-07-15T00:00:00.000Z'),
        previousQuantity: 0,
        currentQuantity: 10,
        cumulativeQuantity: 10,
        unit: BoqUnit.CubicMetre,
        measuredBy: new Types.ObjectId(actorId),
        verifiedBy: new Types.ObjectId(engineerId),
        verifiedAt: new Date(),
        status: WorkMeasurementStatus.Verified,
        submittedBy: new Types.ObjectId(actorId),
        submittedAt: new Date(),
        boqPlannedQuantity: 100,
      },
    ]);
    measurementId = String(measurement._id);
  });

  it('creates RA bill with computed values and CB number', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        tds: 200,
        penalty: 100,
        otherDeductions: 50,
        materialRecovery: 150,
        invoiceDocument: 'doc-invoice-1',
      },
      actorId,
    );

    expect(created.data!.billNumber).toMatch(/^CB-/);
    expect(created.data!.raNumber).toBe(1);
    expect(created.data!.status).toBe(ContractorBillStatus.Draft);
    expect(created.data!.currentCertifiedValue).toBe(10000); // 10 × 1000
    expect(created.data!.previousCertifiedValue).toBe(0);
    expect(created.data!.cumulativeValue).toBe(10000);
    expect(created.data!.retention).toBe(500); // 5%
    expect(created.data!.advanceRecovery).toBe(2000); // 20% of 10000
    expect(created.data!.materialRecovery).toBe(150);
    expect(created.data!.tds).toBe(200);
    expect(created.data!.penalty).toBe(100);
    expect(created.data!.otherDeductions).toBe(50);
    expect(created.data!.netPayable).toBe(7000);
    expect(created.data!.measurements).toHaveLength(1);
  });

  it('runs full claim → paid workflow', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-invoice-1',
      },
      actorId,
    );
    const id = created.data!.id;

    const claimed = await service.submitClaim(id, actorId);
    expect(claimed.data!.status).toBe(ContractorBillStatus.Claimed);

    await expect(service.engineerVerify(id, {}, actorId)).rejects.toThrow(
      ForbiddenException,
    );

    const engineer = await service.engineerVerify(id, {}, engineerId);
    expect(engineer.data!.status).toBe(ContractorBillStatus.EngineerVerified);

    const certified = await service.pmCertify(id, {}, actorId);
    expect(certified.data!.status).toBe(ContractorBillStatus.PmCertified);

    const finance = await service.financeVerify(id, {}, actorId);
    expect(finance.data!.status).toBe(ContractorBillStatus.FinanceVerified);

    const director = await service.directorApprove(id, {}, actorId);
    expect(director.data!.status).toBe(ContractorBillStatus.DirectorApproved);

    const posted = await service.post(id, actorId);
    expect(posted.data!.status).toBe(ContractorBillStatus.Posted);

    const settled = await service.applyPaymentAllocation(
      id,
      posted.data!.netPayable,
      actorId,
    );
    expect(settled.status).toBe(ContractorBillStatus.Paid);
    expect(settled.paidAmount).toBe(posted.data!.netPayable);
  });

  it('prevents double-billing the same measurement', async () => {
    await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-1',
      },
      actorId,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          agreementId,
          billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
          measurementIds: [measurementId],
          invoiceDocument: 'doc-2',
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects claim without invoice document', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
      },
      actorId,
    );

    await expect(service.submitClaim(created.data!.id, actorId)).rejects.toThrow(
      /invoiceDocument/,
    );
  });
});
