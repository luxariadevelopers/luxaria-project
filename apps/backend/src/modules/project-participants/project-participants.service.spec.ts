import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import {
  Director,
  DirectorSchema,
  DirectorStatus,
} from '../directors/schemas/director.schema';
import {
  Investor,
  InvestorSchema,
  InvestorStatus,
  InvestorType,
  InvestorKycStatus,
} from '../investors/schemas/investor.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { ProjectParticipantsService } from './project-participants.service';
import {
  ProjectParticipantConfig,
  ProjectParticipantConfigSchema,
} from './schemas/project-participant-config.schema';
import {
  ProjectParticipantFile,
  ProjectParticipantFileSchema,
} from './schemas/project-participant-document.schema';
import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
  ProjectParticipantSchema,
} from './schemas/project-participant.schema';

describe('ProjectParticipantsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let participantModel: Model<ProjectParticipant>;
  let service: ProjectParticipantsService;
  let projectId: string;
  let directorA: string;
  let directorB: string;
  let investorId: string;
  const actorA = new Types.ObjectId().toHexString();
  const actorB = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    participantModel = connection.model(
      ProjectParticipant.name,
      ProjectParticipantSchema,
    ) as Model<ProjectParticipant>;
    const configModel = connection.model(
      ProjectParticipantConfig.name,
      ProjectParticipantConfigSchema,
    ) as Model<ProjectParticipantConfig>;
    const documentModel = connection.model(
      ProjectParticipantFile.name,
      ProjectParticipantFileSchema,
    ) as Model<ProjectParticipantFile>;
    const projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    const directorModel = connection.model(
      Director.name,
      DirectorSchema,
    ) as Model<Director>;
    const investorModel = connection.model(
      Investor.name,
      InvestorSchema,
    ) as Model<Investor>;
    const companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;

    await Promise.all([
      participantModel.syncIndexes(),
      configModel.syncIndexes(),
      documentModel.syncIndexes(),
      projectModel.syncIndexes(),
      directorModel.syncIndexes(),
      investorModel.syncIndexes(),
      companyModel.syncIndexes(),
    ]);

    service = new ProjectParticipantsService(
      participantModel,
      configModel,
      documentModel,
      projectModel,
      directorModel,
      investorModel,
      companyModel,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await participantModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ProjectParticipantConfig.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(ProjectParticipantFile.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Project.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Director.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Investor.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Company.name).deleteMany({}).setOptions({ withDeleted: true });

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

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-2026-0001',
        projectName: 'Skyline Residences',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India',
        },
        status: ProjectStatus.Planning,
        companyId: company._id,
      },
    ]);
    projectId = String(project._id);

    const dirs = await connection.model(Director.name).create([
      {
        companyId: company._id,
        directorCode: 'DIR-0001',
        fullName: 'Director A',
        din: '10000001',
        status: DirectorStatus.Active,
      },
      {
        companyId: company._id,
        directorCode: 'DIR-0002',
        fullName: 'Director B',
        din: '10000002',
        status: DirectorStatus.Active,
      },
    ]);
    directorA = String(dirs[0]!._id);
    directorB = String(dirs[1]!._id);

    const [investor] = await connection.model(Investor.name).create([
      {
        companyId: company._id,
        investorCode: 'INV-0001',
        investorType: InvestorType.Individual,
        legalName: 'Outside Investor',
        pan: 'AAAAA1111A',
        kycStatus: InvestorKycStatus.Verified,
        status: InvestorStatus.Active,
      },
    ]);
    investorId = String(investor._id);
  });

  async function createApproved(
    type: ParticipantType,
    participantId: string,
    profit: number,
    extras: {
      instrumentType?: InstrumentType;
      interestRate?: number | null;
      commitmentAmount?: number;
    } = {},
  ) {
    const created = await service.create(
      projectId,
      {
        participantType: type,
        participantId,
        commitmentAmount: extras.commitmentAmount ?? 1_000_000,
        approvedProfitSharePercentage: profit,
        lossSharePercentage: profit,
        instrumentType: extras.instrumentType ?? InstrumentType.ProjectInvestment,
        interestRate: extras.interestRate,
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);
    return service.approve(projectId, created.data!.id, actorB);
  }

  it('keeps project profit share independent and finalises only at 100%', async () => {
    await createApproved(ParticipantType.Director, directorA, 40);
    await createApproved(ParticipantType.Director, directorB, 35);
    await createApproved(
      ParticipantType.OutsideInvestor,
      investorId,
      25,
      { instrumentType: InstrumentType.EquityContribution },
    );

    const active = await service.listActive(projectId);
    expect(active.data?.totalProfitSharePercentage).toBe(100);
    expect(active.data?.isBalanced).toBe(true);
    expect(active.data?.note).toMatch(/not company shareholding/i);

    await expect(service.finalize(projectId, actorA)).resolves.toMatchObject({
      data: { isFinalised: true, totalProfitSharePercentage: 100 },
    });
  });

  it('rejects finalise when active profit shares do not total 100%', async () => {
    await createApproved(ParticipantType.Director, directorA, 60);
    await expect(service.finalize(projectId, actorA)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('versions profit-share changes without overwriting prior rows', async () => {
    const v1 = await createApproved(ParticipantType.Director, directorA, 50);
    await createApproved(ParticipantType.Director, directorB, 50);
    await service.finalize(projectId, actorA);

    // Must unfinalise to create brand-new participants; versions of approved still allowed
    const version = await service.createVersion(
      projectId,
      v1.data!.id,
      {
        commitmentAmount: 1_500_000,
        approvedProfitSharePercentage: 60,
        lossSharePercentage: 60,
        notes: 'Revised project profit share',
      },
      actorA,
    );
    expect(version.data?.version).toBe(2);
    expect(version.data?.status).toBe(ParticipantApprovalStatus.Draft);

    await service.submit(projectId, version.data!.id, actorA);
    await service.approve(projectId, version.data!.id, actorB);

    // After approve of 60%, total becomes 110% with B still at 50 → unfinalised
    const config = await service.getConfiguration(projectId);
    expect(config.data?.isFinalised).toBe(false);

    const history = await participantModel
      .find({
        projectId: new Types.ObjectId(projectId),
        participantKey: `director:${directorA}`,
      })
      .sort({ version: 1 })
      .lean();

    expect(history).toHaveLength(2);
    expect(history[0]?.approvedProfitSharePercentage).toBe(50);
    expect(history[0]?.effectiveTo).not.toBeNull();
    expect(history[1]?.approvedProfitSharePercentage).toBe(60);
    expect(history[1]?.effectiveTo).toBeNull();
    expect(history[1]?.status).toBe(ParticipantApprovalStatus.Approved);
  });

  it('blocks self-approval and supports reject', async () => {
    const created = await service.create(
      projectId,
      {
        participantType: ParticipantType.Director,
        participantId: directorA,
        commitmentAmount: 500_000,
        approvedProfitSharePercentage: 100,
        lossSharePercentage: 100,
        instrumentType: InstrumentType.DirectorLoan,
        interestRate: 10,
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);

    await expect(
      service.approve(projectId, created.data!.id, actorA),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const rejected = await service.reject(
      projectId,
      created.data!.id,
      { rejectionReason: 'Interest rate too high for this project' },
      actorB,
    );
    expect(rejected.data?.status).toBe(ParticipantApprovalStatus.Rejected);
    expect(rejected.data?.effectiveTo).not.toBeNull();
  });

  it('requires interestRate for director loans', async () => {
    await expect(
      service.create(
        projectId,
        {
          participantType: ParticipantType.Director,
          participantId: directorA,
          commitmentAmount: 100_000,
          approvedProfitSharePercentage: 100,
          lossSharePercentage: 100,
          instrumentType: InstrumentType.DirectorLoan,
        },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks draft create while configuration is finalised', async () => {
    await createApproved(ParticipantType.Director, directorA, 100);
    await service.finalize(projectId, actorA);

    await expect(
      service.create(
        projectId,
        {
          participantType: ParticipantType.OutsideInvestor,
          participantId: investorId,
          commitmentAmount: 100_000,
          approvedProfitSharePercentage: 0,
          lossSharePercentage: 0,
          instrumentType: InstrumentType.ProjectInvestment,
        },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
