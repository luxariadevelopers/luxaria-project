import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { ApprovalsService } from '../approvals/approvals.service';
import { BoqUnit } from '../boq/schemas/boq.schema';
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
  CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
  CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
} from './contractor-agreements.constants';
import { ContractorAgreementsService } from './contractor-agreements.service';
import {
  ContractorAgreement,
  ContractorAgreementBillingCycle,
  ContractorAgreementExpiryAlert,
  ContractorAgreementExpiryAlertSchema,
  ContractorAgreementExpiryAlertType,
  ContractorAgreementSchema,
  ContractorAgreementStatus,
} from './schemas/contractor-agreement.schema';

describe('ContractorAgreementsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ContractorAgreementsService;
  let agreementModel: Model<ContractorAgreement>;
  let contractorModel: Model<Contractor>;
  let approvalsCreate: jest.Mock;
  let approvalsApprove: jest.Mock;
  let approvalsReject: jest.Mock;

  let actorId: string;
  let projectId: string;
  let contractorId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    agreementModel = connection.model(
      ContractorAgreement.name,
      ContractorAgreementSchema,
    ) as Model<ContractorAgreement>;
    const alertModel = connection.model(
      ContractorAgreementExpiryAlert.name,
      ContractorAgreementExpiryAlertSchema,
    ) as Model<ContractorAgreementExpiryAlert>;
    contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      agreementModel.syncIndexes(),
      alertModel.syncIndexes(),
      contractorModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    approvalsCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    approvalsApprove = jest.fn().mockResolvedValue({
      data: { status: ApprovalStatus.Approved },
    });
    approvalsReject = jest.fn().mockResolvedValue({
      data: { status: ApprovalStatus.Rejected },
    });

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'contractorAgreementExpiryWarningDays') return 30;
        return undefined;
      }),
    } as unknown as ConfigService<never, true>;
    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;


    service = new ContractorAgreementsService(
      agreementModel,
      alertModel,
      contractorModel,
      projectModel,
      {} as never,
      {} as never,
      new NumberingService(counterModel),
      {
        create: approvalsCreate,
        approve: approvalsApprove,
        reject: approvalsReject,
      } as unknown as ApprovalsService,
      { create: jest.fn() } as never,
      { assertPostingAllowed: jest.fn().mockResolvedValue({}) } as never,
      {
        withTransaction: async <T>(work: (session: null) => Promise<T>) =>
          work(null),
      } as never,
      configService,
      mockProjectScope
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approvalsCreate.mockClear();
    approvalsApprove.mockClear();
    approvalsReject.mockClear();
    approvalsCreate.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    approvalsApprove.mockResolvedValue({
      data: { status: ApprovalStatus.Approved },
    });

    await agreementModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ContractorAgreementExpiryAlert.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await contractorModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

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
        companyId: new Types.ObjectId(),
      },
    ]);
    projectId = String(project._id);

    const [contractor] = await contractorModel.create([
      {
        contractorCode: 'CON-000001',
        legalName: 'Sunrise Civil',
        contractorType: ContractorType.Civil,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: ['rcc'],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);
  });

  function baseDto() {
    return {
      contractorId,
      projectId,
      workScope: 'Civil works Block A',
      boqItems: [
        {
          boqCode: 'RCC-001',
          description: 'RCC columns',
          unit: BoqUnit.CubicMetre,
          agreedQuantity: 10,
          agreedRate: 450,
        },
      ],
      manpowerCommitment: 20,
      skillMix: [{ skill: 'mason', headcount: 12 }],
      startDate: '2026-08-01',
      endDate: '2026-12-31',
      billingCycle: ContractorAgreementBillingCycle.Monthly,
      advance: { amount: 50000, terms: 'Against BG' },
      recoveryPlan: { method: 'percent_per_bill', percentPerBill: 20 },
      retentionPercentage: 5,
      penalties: 'Delay LDs apply',
      safetyTerms: 'PPE mandatory',
      terminationTerms: '30 days notice',
      agreementDocument: 'docs/agreement-v1.pdf',
    };
  }

  async function createAndActivate() {
    const created = await service.create(baseDto(), actorId);
    await service.submitForApproval(created.data!.id, actorId);
    return service.approve(created.data!.id, { comment: 'OK' }, actorId);
  }

  it('creates agreement with CA number and computed agreed rates/qty', async () => {
    const created = await service.create(baseDto(), actorId);
    expect(created.data?.agreementNumber).toMatch(/^CA-/);
    expect(created.data?.version).toBe(1);
    expect(created.data?.status).toBe(ContractorAgreementStatus.Draft);
    expect(created.data?.agreedQuantity).toBe(10);
    expect(created.data?.agreedRates).toBe(4500);
    expect(created.data?.agreementDocument).toBe('docs/agreement-v1.pdf');
  });

  it('rejects create when contractor is not active', async () => {
    await contractorModel.updateOne(
      { _id: contractorId },
      { status: ContractorStatus.Blocked },
    );
    await expect(service.create(baseDto(), actorId)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('submits for approval workflow and activates on approve', async () => {
    const created = await service.create(baseDto(), actorId);
    const submitted = await service.submitForApproval(
      created.data!.id,
      actorId,
    );
    expect(submitted.data?.status).toBe(
      ContractorAgreementStatus.PendingApproval,
    );
    expect(approvalsCreate).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        module: CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
        entityType: CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
        amount: 4500,
      }),
      actorId,
    );

    const approved = await service.approve(
      created.data!.id,
      { comment: 'Approved' },
      actorId,
    );
    expect(approved.data?.status).toBe(ContractorAgreementStatus.Active);
    expect(approvalsApprove).toHaveBeenCalled();
  });

  it('versions amendments and supersedes prior active on approve', async () => {
    const active = await createAndActivate();
    const amendment = await service.amend(
      active.data!.id,
      {
        manpowerCommitment: 30,
        boqItems: [
          {
            boqCode: 'RCC-001',
            description: 'RCC columns',
            unit: BoqUnit.CubicMetre,
            agreedQuantity: 12,
            agreedRate: 500,
          },
        ],
      },
      actorId,
    );

    expect(amendment.data?.agreementNumber).toBe(active.data?.agreementNumber);
    expect(amendment.data?.version).toBe(2);
    expect(amendment.data?.status).toBe(ContractorAgreementStatus.Draft);
    expect(amendment.data?.supersedesId).toBe(active.data?.id);

    await service.submitForApproval(amendment.data!.id, actorId);
    const approved = await service.approve(
      amendment.data!.id,
      { comment: 'v2 ok' },
      actorId,
    );
    expect(approved.data?.status).toBe(ContractorAgreementStatus.Active);

    const prior = await service.getById(active.data!.id);
    expect(prior.data?.status).toBe(ContractorAgreementStatus.Superseded);

    const history = await service.listVersions(
      active.data!.agreementNumber,
      projectId,
    );
    expect(history.data).toHaveLength(2);
  });

  it('creates expiry alerts and marks expired agreements', async () => {
    const active = await createAndActivate();
    await agreementModel.updateOne(
      { _id: active.data!.id },
      { endDate: new Date('2026-07-10') },
    );

    const result = await service.evaluateExpiryAlerts(
      new Date('2026-07-20T00:00:00.000Z'),
    );
    expect(result.data?.created).toBeGreaterThanOrEqual(1);
    expect(result.data?.expiredMarked).toBe(1);
    expect(
      result.data?.alerts.some(
        (a) => a.alertType === ContractorAgreementExpiryAlertType.Expired,
      ),
    ).toBe(true);

    const refreshed = await service.getById(active.data!.id);
    expect(refreshed.data?.status).toBe(ContractorAgreementStatus.Expired);

    const alertId = result.data!.alerts[0]!.id;
    const ack = await service.acknowledgeExpiryAlert(alertId, actorId);
    expect(ack.data?.acknowledged).toBe(true);
  });

  it('alerts before expiry within warning window', async () => {
    const active = await createAndActivate();
    await agreementModel.updateOne(
      { _id: active.data!.id },
      { endDate: new Date('2026-08-05') },
    );

    const result = await service.evaluateExpiryAlerts(
      new Date('2026-07-20T00:00:00.000Z'),
    );
    expect(
      result.data?.alerts.some(
        (a) => a.alertType === ContractorAgreementExpiryAlertType.ExpiringSoon,
      ),
    ).toBe(true);
  });
});
