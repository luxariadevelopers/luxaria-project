import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { SUPER_ADMIN_ROLE_CODE } from './permissions.catalog';
import { RbacSeedService } from './rbac.seed.service';
import { ROLE_SEEDS } from './role.seed';
import { Role, RoleSchema } from './schemas/role.schema';

describe('RbacSeedService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let roleModel: Model<Role>;
  let service: RbacSeedService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    roleModel = connection.model(Role.name, RoleSchema) as Model<Role>;
    await roleModel.syncIndexes();
    service = new RbacSeedService(roleModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await roleModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  it('seeds all initial system roles including Super Admin bypass', async () => {
    const result = await service.seedRoles();

    expect(result.created).toBe(ROLE_SEEDS.length);
    const count = await roleModel.countDocuments({});
    expect(count).toBe(ROLE_SEEDS.length);

    const superAdmin = await roleModel.findOne({ code: SUPER_ADMIN_ROLE_CODE }).lean();
    expect(superAdmin?.bypassPermissions).toBe(true);
    expect(superAdmin?.isSystem).toBe(true);

    const director = await roleModel.findOne({ code: 'DIRECTOR' }).lean();
    expect(director?.bypassPermissions).toBe(false);
  });

  it('is idempotent and refreshes system role permissions', async () => {
    await service.seedRoles();
    await roleModel.updateOne(
      { code: 'READ_ONLY' },
      { $set: { permissions: ['dashboard.view'] } },
    );

    const second = await service.seedRoles();
    expect(second.created).toBe(0);
    expect(second.updated).toBe(ROLE_SEEDS.length);

    const readOnly = await roleModel.findOne({ code: 'READ_ONLY' }).lean();
    expect(readOnly?.permissions).toEqual(
      ROLE_SEEDS.find((role) => role.code === 'READ_ONLY')?.permissions,
    );
  });
});
