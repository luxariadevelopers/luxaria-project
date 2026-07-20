import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { PermissionsService } from './permissions.service';
import { Role, RoleSchema, RoleStatus } from './schemas/role.schema';

describe('PermissionsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let userModel: Model<User>;
  let roleModel: Model<Role>;
  let service: PermissionsService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    roleModel = connection.model(Role.name, RoleSchema) as Model<Role>;
    await userModel.syncIndexes();
    await roleModel.syncIndexes();
    service = new PermissionsService(userModel, roleModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await roleModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  it('denies by default when user has no roles', async () => {
    const [user] = await userModel.create([
      {
        userCode: 'USR-000001',
        fullName: 'No Roles',
        email: 'noroles@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [],
      },
    ]);

    await expect(
      service.hasAllPermissions(user._id, ['project.view']),
    ).resolves.toBe(false);
  });

  it('allows when role grants the required permission', async () => {
    const [role] = await roleModel.create([
      {
        code: 'SITE_ENGINEER',
        name: 'Site Engineer',
        permissions: ['project.view', 'dpr.create'],
        status: RoleStatus.Active,
      },
    ]);
    const [user] = await userModel.create([
      {
        userCode: 'USR-000002',
        fullName: 'Engineer',
        email: 'eng@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [role._id],
      },
    ]);

    await expect(
      service.hasAllPermissions(user._id, ['project.view', 'dpr.create']),
    ).resolves.toBe(true);
    await expect(
      service.hasAllPermissions(user._id, ['expense.approve']),
    ).resolves.toBe(false);
  });

  it('Super Admin bypasses permission checks without matching codes', async () => {
    const [role] = await roleModel.create([
      {
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        permissions: [],
        bypassPermissions: true,
        status: RoleStatus.Active,
      },
    ]);
    const [user] = await userModel.create([
      {
        userCode: 'USR-000003',
        fullName: 'Admin',
        email: 'admin@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [role._id],
      },
    ]);

    await expect(
      service.hasAllPermissions(user._id, ['payment.release', 'journal.post']),
    ).resolves.toBe(true);
  });

  it('does not hard-code director access — Director without permission is denied', async () => {
    const [role] = await roleModel.create([
      {
        code: 'DIRECTOR',
        name: 'Director',
        permissions: ['project.view'],
        bypassPermissions: false,
        status: RoleStatus.Active,
      },
    ]);
    const [user] = await userModel.create([
      {
        userCode: 'USR-000004',
        fullName: 'Director User',
        email: 'director@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [role._id],
      },
    ]);

    await expect(
      service.hasAllPermissions(user._id, ['payment.release']),
    ).resolves.toBe(false);
  });

  it('ignores inactive roles when resolving access', async () => {
    const [role] = await roleModel.create([
      {
        code: 'READ_ONLY',
        name: 'Read Only',
        permissions: ['report.view'],
        status: RoleStatus.Inactive,
      },
    ]);
    const [user] = await userModel.create([
      {
        userCode: 'USR-000005',
        fullName: 'Inactive Role User',
        email: 'ro@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [role._id],
      },
    ]);

    const access = await service.resolveUserAccess(user._id);
    expect(access.permissions).toEqual([]);
    expect(access.bypassPermissions).toBe(false);
  });
});
