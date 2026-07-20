/**
 * R-003 / R-003B IDOR matrix — Project A vs B + Company A vs B.
 * Exercises the canonical access service (not guard-only).
 */
import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Company,
  CompanySchema,
  CompanyStatus,
} from '../src/modules/company/schemas/company.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../src/modules/projects/schemas/project.schema';
import { User, UserSchema, UserStatus } from '../src/modules/users/schemas/user.schema';
import { ProjectAccessService } from '../src/modules/project-access/project-access.service';
import {
  ProjectAccessStatus,
  ProjectAssignment,
  ProjectAssignmentSchema,
} from '../src/modules/project-access/schemas/project-assignment.schema';
import {
  UnauthorizedProjectAccess,
  UnauthorizedProjectAccessSchema,
} from '../src/modules/project-access/schemas/unauthorized-project-access.schema';

const address = {
  line1: '1 Test St',
  line2: null,
  city: 'Chennai',
  state: 'TN',
  pincode: '600001',
  country: 'IN',
};

describe('R-003 IDOR matrix (Project A vs B / Company A vs B)', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ProjectAccessService;
  let assignmentModel: Model<ProjectAssignment>;
  let userModel: Model<User>;
  let projectModel: Model<Project>;
  let companyModel: Model<Company>;

  let projectA: string;
  let projectB: string;
  let projectC: string;
  let companyAId: string;
  let staffA: string;
  let staffB: string;
  let staffOnlyA: string;
  let directorGlobal: string;
  let companyBUser: string;

  const permissionsService = {
    resolveUserAccess: jest.fn(),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    assignmentModel = connection.model(
      ProjectAssignment.name,
      ProjectAssignmentSchema,
    ) as Model<ProjectAssignment>;
    const unauthorizedModel = connection.model(
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

    const users = await userModel.create([
      {
        userCode: 'STAFF-A',
        fullName: 'Staff A',
        email: 'staff-a@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyA!._id,
        roleIds: [],
        assignedProjects: [],
      },
      {
        userCode: 'STAFF-B',
        fullName: 'Staff B',
        email: 'staff-b@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyA!._id,
        roleIds: [],
        assignedProjects: [],
      },
      {
        userCode: 'STAFF-ONLY-A',
        fullName: 'Staff Only A',
        email: 'staff-only-a@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyA!._id,
        roleIds: [],
        assignedProjects: [],
      },
      {
        userCode: 'DIR-GLOBAL',
        fullName: 'Director Global',
        email: 'dir-global@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyA!._id,
        roleIds: [],
        assignedProjects: [],
      },
      {
        userCode: 'STAFF-CO-B',
        fullName: 'Company B Staff',
        email: 'staff-cob@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: companyB!._id,
        roleIds: [],
        assignedProjects: [],
      },
    ]);
    staffA = String(users[0]!._id);
    staffB = String(users[1]!._id);
    staffOnlyA = String(users[2]!._id);
    directorGlobal = String(users[3]!._id);
    companyBUser = String(users[4]!._id);

    const now = new Date(Date.now() - 60_000);
    await assignmentModel.create([
      {
        userId: users[0]!._id,
        projectId: new Types.ObjectId(projectA),
        globalAccess: false,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
      },
      {
        userId: users[1]!._id,
        projectId: new Types.ObjectId(projectB),
        globalAccess: false,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
      },
      {
        userId: users[2]!._id,
        projectId: new Types.ObjectId(projectA),
        globalAccess: false,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
      },
      {
        userId: users[3]!._id,
        projectId: null,
        globalAccess: true,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
      },
      {
        userId: users[4]!._id,
        projectId: new Types.ObjectId(projectC),
        globalAccess: false,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
      },
    ]);
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    });
  });

  it('1. authorised same-project access → allowed', async () => {
    await expect(
      service.assertCanAccessProject({
        actor: staffA,
        projectId: projectA,
        action: 'read',
        resourceType: 'purchase-order',
      }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it('2. same company, foreign project → denied', async () => {
    await expect(
      service.assertCanAccessProject({
        actor: staffOnlyA,
        projectId: projectB,
        action: 'read',
        resourceType: 'journal',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('3. staff B cannot read project A resources', async () => {
    await expect(
      service.assertCanAccessProject(staffB, projectA, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('3b. different company → denied', async () => {
    await expect(
      service.assertCanAccessProject({
        actor: staffA,
        projectId: projectC,
        action: 'read',
        companyId: companyAId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('3c. company B user cannot access company A project', async () => {
    await expect(
      service.assertCanAccessProject(companyBUser, projectA, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('6. foreign resource project id → denied', async () => {
    await expect(
      service.assertCanAccessProject({
        actor: staffA,
        projectId: projectB,
        action: 'update',
        resourceType: 'booking',
        resourceId: new Types.ObjectId().toHexString(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('7. permission bypass alone (no assignment) → denied', async () => {
    const orphan = await userModel.create({
      userCode: 'ORPHAN',
      fullName: 'No Projects',
      email: 'orphan@luxaria.dev',
      passwordHash: 'hash',
      status: UserStatus.Active,
      companyId: new Types.ObjectId(companyAId),
      roleIds: [],
      assignedProjects: [],
    });
    await expect(
      service.assertCanAccessProject(String(orphan._id), projectA, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('9. company-wide elevated globalAccess → allowed for A and B within company', async () => {
    await expect(
      service.assertCanAccessProject(directorGlobal, projectA, 'approve'),
    ).resolves.toMatchObject({ allowed: true, globalAccess: true });
    await expect(
      service.assertCanAccessProject(directorGlobal, projectB, 'approve'),
    ).resolves.toMatchObject({ allowed: true, globalAccess: true });
  });

  it('9b. company-wide actor accessing Company B → denied', async () => {
    await expect(
      service.assertCanAccessProject(directorGlobal, projectC, 'approve'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('inactive assignment → denied', async () => {
    await assignmentModel.updateMany(
      { userId: new Types.ObjectId(staffA) },
      { status: ProjectAccessStatus.Inactive },
    );
    await expect(
      service.assertCanAccessProject(staffA, projectA, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await assignmentModel.updateMany(
      { userId: new Types.ObjectId(staffA) },
      { status: ProjectAccessStatus.Active },
    );
  });

  it('buildAuthorisedProjectFilter scopes list queries to assigned projects', async () => {
    const filter = await service.buildAuthorisedProjectFilter(staffOnlyA);
    expect(filter).toEqual({
      projectId: { $in: [new Types.ObjectId(projectA)] },
    });
    const globalFilter =
      await service.buildAuthorisedProjectFilter(directorGlobal);
    expect(globalFilter).toEqual({});
  });

  it('denial message does not leak assignment reason details', async () => {
    expect.assertions(2);
    try {
      await service.assertCanAccessProject(staffB, projectA, 'read');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).message).toBe('Access denied');
    }
  });
});
