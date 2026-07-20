import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Company,
  CompanySchema,
  CompanyStatus,
} from '../company/schemas/company.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { ProjectAccessService } from './project-access.service';
import {
  ProjectAccessStatus,
  ProjectAssignment,
  ProjectAssignmentSchema,
} from './schemas/project-assignment.schema';
import {
  UnauthorizedProjectAccess,
  UnauthorizedProjectAccessSchema,
} from './schemas/unauthorized-project-access.schema';

const address = {
  line1: '1 Test St',
  line2: null,
  city: 'Chennai',
  state: 'TN',
  pincode: '600001',
  country: 'IN',
};

describe('ProjectAccessService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let assignmentModel: Model<ProjectAssignment>;
  let unauthorizedModel: Model<UnauthorizedProjectAccess>;
  let userModel: Model<User>;
  let projectModel: Model<Project>;
  let companyModel: Model<Company>;
  let service: ProjectAccessService;
  let userId: string;
  let companyAId: string;
  let companyBId: string;
  let projectA: string;
  let projectB: string;
  let projectC: string;

  const permissionsService = {
    resolveUserAccess: jest.fn().mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    }),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    assignmentModel = connection.model(
      ProjectAssignment.name,
      ProjectAssignmentSchema,
    ) as Model<ProjectAssignment>;
    unauthorizedModel = connection.model(
      UnauthorizedProjectAccess.name,
      UnauthorizedProjectAccessSchema,
    ) as Model<UnauthorizedProjectAccess>;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;

    service = new ProjectAccessService(
      assignmentModel,
      unauthorizedModel,
      userModel,
      projectModel,
      companyModel,
      permissionsService as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await assignmentModel.deleteMany({}).setOptions({ withDeleted: true });
    await unauthorizedModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });
    jest.clearAllMocks();
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    });

    const [companyA, companyB] = await companyModel.create([
      {
        companyCode: 'CMP-A',
        legalName: 'Company A',
        tradeName: 'Company A',
        registeredAddress: address,
        corporateAddress: address,
        authorisedShareCapital: 1,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: true,
      },
      {
        companyCode: 'CMP-B',
        legalName: 'Company B',
        tradeName: 'Company B',
        registeredAddress: address,
        corporateAddress: address,
        authorisedShareCapital: 1,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: false,
      },
    ]);
    companyAId = String(companyA!._id);
    companyBId = String(companyB!._id);

    const [pA, pB, pC] = await projectModel.create([
      {
        projectCode: 'PRJ-A',
        projectName: 'Project A',
        projectType: ProjectType.Residential,
        address,
        status: ProjectStatus.Construction,
        companyId: companyA!._id,
      },
      {
        projectCode: 'PRJ-B',
        projectName: 'Project B',
        projectType: ProjectType.Residential,
        address,
        status: ProjectStatus.Construction,
        companyId: companyA!._id,
      },
      {
        projectCode: 'PRJ-C',
        projectName: 'Project C',
        projectType: ProjectType.Residential,
        address,
        status: ProjectStatus.Construction,
        companyId: companyB!._id,
      },
    ]);
    projectA = String(pA!._id);
    projectB = String(pB!._id);
    projectC = String(pC!._id);

    const [user] = await userModel.create([
      {
        userCode: 'USR-PA-001',
        fullName: 'Site Engineer',
        email: 'site@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyA!._id,
        assignedProjects: [],
      },
    ]);
    userId = String(user!._id);
  });

  it('allows an assigned project', async () => {
    await service.create({
      userId,
      projectId: projectA,
      accessStartDate: '2026-01-01',
    });

    const decision = await service.resolveAccess(userId, projectA);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('Assigned project access');

    await expect(
      service.assertCanAccessProject(userId, projectA, 'read'),
    ).resolves.toMatchObject({ allowed: true });
  });

  it('denies an unassigned project and audits the attempt', async () => {
    await service.create({
      userId,
      projectId: projectA,
      accessStartDate: '2026-01-01',
    });

    await expect(
      service.assertCanAccessProject(userId, projectB, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const audits = await unauthorizedModel.find({}).lean().exec();
    expect(audits.length).toBeGreaterThan(0);
  });

  it('allows global access assignment (e.g. Director via configuration)', async () => {
    await service.create({
      userId,
      globalAccess: true,
      accessStartDate: '2026-01-01',
    });

    await expect(
      service.assertCanAccessProject(userId, projectB, 'approve'),
    ).resolves.toMatchObject({ allowed: true, globalAccess: true });
  });

  it('denies expired assignment even if status is still active', async () => {
    await assignmentModel.create({
      userId: new Types.ObjectId(userId),
      projectId: new Types.ObjectId(projectA),
      globalAccess: false,
      accessStartDate: new Date('2020-01-01'),
      accessEndDate: new Date('2020-12-31'),
      status: ProjectAccessStatus.Active,
    });

    await expect(
      service.assertCanAccessProject(userId, projectA, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Super Admin bypasses project assignment checks within company', async () => {
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: true,
      permissions: [],
      roleCodes: ['super_admin'],
      roleIds: [],
      userId,
    });

    await expect(
      service.assertCanAccessProject(userId, projectA, 'read'),
    ).resolves.toMatchObject({ allowed: true, bypassPermissions: true });
  });

  it('denies cross-company project even with assignment (tenant boundary)', async () => {
    await assignmentModel.create({
      userId: new Types.ObjectId(userId),
      projectId: new Types.ObjectId(projectC),
      globalAccess: false,
      accessStartDate: new Date('2020-01-01'),
      accessEndDate: null,
      status: ProjectAccessStatus.Active,
    });

    await expect(
      service.assertCanAccessProject({
        actor: userId,
        projectId: projectC,
        action: 'read',
        companyId: companyAId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies when actor company membership is revoked (missing company)', async () => {
    await userModel.findByIdAndUpdate(userId, {
      companyId: new Types.ObjectId(),
    });

    await service.create({
      userId,
      projectId: projectA,
      accessStartDate: '2026-01-01',
    });

    // actor company id points to non-existent company → boundary fails
    await expect(
      service.assertCanAccessProject({
        actor: userId,
        projectId: projectA,
        action: 'read',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validates create / read / update / approve operations when assigned', async () => {
    await service.create({
      userId,
      projectId: projectA,
      accessStartDate: '2026-01-01',
    });

    for (const op of ['create', 'read', 'update', 'approve'] as const) {
      await expect(
        service.assertCanAccessProject(userId, projectA, op),
      ).resolves.toMatchObject({ allowed: true });
    }
  });

  it('resolveActorCompanyId falls back to primary company', async () => {
    await userModel.findByIdAndUpdate(userId, { companyId: null });
    const resolved = await service.resolveActorCompanyId(userId);
    expect(resolved).toBe(companyAId);
  });

  it('company B project is never accessible to company A actor', async () => {
    void companyBId;
    await expect(
      service.assertProjectCompanyBoundary(userId, projectC, companyAId),
    ).resolves.toMatchObject({
      allowed: false,
      reason: 'Project belongs to a different company',
    });
  });
});
