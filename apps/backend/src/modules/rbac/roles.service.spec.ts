import { BadRequestException, ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { RolesService } from './roles.service';
import { Role, RoleSchema, RoleStatus } from './schemas/role.schema';

describe('RolesService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let roleModel: Model<Role>;
  let userModel: Model<User>;
  let service: RolesService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    roleModel = connection.model(Role.name, RoleSchema) as Model<Role>;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    await roleModel.syncIndexes();
    await userModel.syncIndexes();
    await counterModel.syncIndexes();

    service = new RolesService(roleModel, userModel, new NumberingService(counterModel));
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await roleModel.deleteMany({}).setOptions({ withDeleted: true });
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
  });

  it('creates a custom role with permissions', async () => {
    const response = await service.create({
      name: 'Custom Ops',
      code: 'CUSTOM_OPS',
      permissions: ['project.view', 'stock.adjust'],
    });

    expect(response.success).toBe(true);
    expect(response.data?.code).toBe('CUSTOM_OPS');
    expect(response.data?.permissions).toEqual(['project.view', 'stock.adjust']);
    expect(response.data?.isSystem).toBe(false);
  });

  it('rejects unknown permissions', async () => {
    await expect(
      service.create({
        name: 'Bad',
        permissions: ['fake.action'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clones a role without copying bypass', async () => {
    const [source] = await roleModel.create([
      {
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        permissions: ['user.view'],
        bypassPermissions: true,
        isSystem: true,
        status: RoleStatus.Active,
      },
    ]);

    const response = await service.clone(String(source._id), {
      name: 'Admin Clone',
      code: 'ADMIN_CLONE',
    });

    expect(response.data?.permissions).toEqual(['user.view']);
    expect(response.data?.bypassPermissions).toBe(false);
    expect(response.data?.isSystem).toBe(false);
  });

  it('cannot deactivate a bypass Super Admin role', async () => {
    const [role] = await roleModel.create([
      {
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        permissions: [],
        bypassPermissions: true,
        isSystem: true,
        status: RoleStatus.Active,
      },
    ]);

    await expect(service.deactivate(String(role._id))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('assigns active roles to a user and rejects inactive roles', async () => {
    const [active] = await roleModel.create([
      {
        code: 'ACCOUNTANT',
        name: 'Accountant',
        permissions: ['journal.post'],
        status: RoleStatus.Active,
      },
    ]);
    const [inactive] = await roleModel.create([
      {
        code: 'AUDITOR',
        name: 'Auditor',
        permissions: ['audit.view'],
        status: RoleStatus.Inactive,
      },
    ]);
    const [user] = await userModel.create([
      {
        userCode: 'USR-000010',
        fullName: 'Assign Target',
        email: 'assign@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        roleIds: [],
      },
    ]);

    const ok = await service.assignToUser(String(user._id), {
      roleIds: [String(active._id)],
    });
    expect(ok.data?.roleIds).toEqual([String(active._id)]);

    await expect(
      service.assignToUser(String(user._id), { roleIds: [String(inactive._id)] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate role codes', async () => {
    await service.create({ name: 'One', code: 'DUP_ROLE', permissions: ['report.view'] });
    await expect(
      service.create({ name: 'Two', code: 'DUP_ROLE', permissions: ['report.view'] }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
