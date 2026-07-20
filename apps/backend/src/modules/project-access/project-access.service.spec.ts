import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { ProjectAccessService } from './project-access.service';
import {
  ProjectAssignment,
  ProjectAssignmentSchema,
} from './schemas/project-assignment.schema';
import {
  UnauthorizedProjectAccess,
  UnauthorizedProjectAccessSchema,
} from './schemas/unauthorized-project-access.schema';

describe('ProjectAccessService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let assignmentModel: Model<ProjectAssignment>;
  let unauthorizedModel: Model<UnauthorizedProjectAccess>;
  let userModel: Model<User>;
  let service: ProjectAccessService;
  let userId: string;
  const projectA = new Types.ObjectId().toHexString();
  const projectB = new Types.ObjectId().toHexString();

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
    await assignmentModel.syncIndexes();
    await unauthorizedModel.syncIndexes();
    await userModel.syncIndexes();

    service = new ProjectAccessService(
      assignmentModel,
      unauthorizedModel,
      userModel,
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
    jest.clearAllMocks();
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    });

    const [user] = await userModel.create([
      {
        userCode: 'USR-PA-001',
        fullName: 'Site Engineer',
        email: 'site@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        assignedProjects: [],
      },
    ]);
    userId = String(user._id);
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
      service.assertCanAccessProject(userId, projectB, 'update'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const audits = await unauthorizedModel.find({}).lean().exec();
    expect(audits).toHaveLength(1);
    expect(String(audits[0]?.projectId)).toBe(projectB);
    expect(audits[0]?.operation).toBe('update');
    expect(audits[0]?.reason).toMatch(/No active project assignment/);
  });

  it('allows global access assignment (e.g. Director via configuration)', async () => {
    await service.create({
      userId,
      globalAccess: true,
      accessStartDate: '2026-01-01',
      notes: 'Director all-project access',
    });

    const forA = await service.resolveAccess(userId, projectA);
    const forB = await service.resolveAccess(userId, projectB);
    expect(forA.allowed).toBe(true);
    expect(forA.globalAccess).toBe(true);
    expect(forB.allowed).toBe(true);
  });

  it('denies expired assignment even if status is still active', async () => {
    await service.create({
      userId,
      projectId: projectA,
      accessStartDate: '2025-01-01',
      accessEndDate: '2025-12-31',
    });

    const decision = await service.resolveAccess(
      userId,
      projectA,
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe('Project assignment expired');

    await expect(
      service.assertCanAccessProject(userId, projectA, 'approve'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Super Admin bypasses project assignment checks', async () => {
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: true,
      permissions: [],
      roleCodes: ['SUPER_ADMIN'],
      roleIds: [],
      userId,
    });

    const decision = await service.resolveAccess(userId, projectB);
    expect(decision.allowed).toBe(true);
    expect(decision.bypassPermissions).toBe(true);
  });

  it('validates create / read / update / approve operations when assigned', async () => {
    await service.assignProjectsToUser(userId, [projectA]);

    for (const operation of ['create', 'read', 'update', 'approve'] as const) {
      await expect(
        service.assertCanAccessProject(userId, projectA, operation),
      ).resolves.toMatchObject({ allowed: true });
    }
  });
});
