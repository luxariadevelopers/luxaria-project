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

    const managingDirector = await roleModel
      .findOne({ code: 'MANAGING_DIRECTOR' })
      .lean();
    expect(managingDirector?.bypassPermissions).toBe(true);
  });

  it('is idempotent and unions seed permissions with UI grants', async () => {
    await service.seedRoles();
    await roleModel.updateOne(
      { code: 'READ_ONLY' },
      { $set: { permissions: ['dashboard.view', 'petty_cash.approve'] } },
    );

    const second = await service.seedRoles();
    expect(second.created).toBe(0);
    expect(second.updated).toBe(ROLE_SEEDS.length);

    const readOnly = await roleModel.findOne({ code: 'READ_ONLY' }).lean();
    const seedPerms =
      ROLE_SEEDS.find((role) => role.code === 'READ_ONLY')?.permissions ?? [];
    expect(readOnly?.permissions).toEqual(
      [...new Set([...seedPerms, 'dashboard.view', 'petty_cash.approve'])].sort(),
    );
    expect(readOnly?.permissions).toContain('petty_cash.approve');
  });

  it('gives Managing Director full bypass like Super Admin', async () => {
    await service.seedRoles();

    const md = await roleModel.findOne({ code: 'MANAGING_DIRECTOR' }).lean();
    const superAdmin = await roleModel
      .findOne({ code: SUPER_ADMIN_ROLE_CODE })
      .lean();

    expect(md?.bypassPermissions).toBe(true);
    expect(superAdmin?.bypassPermissions).toBe(true);
    expect(md?.permissions?.length).toBe(superAdmin?.permissions?.length);
  });

  it('limits petty_cash.request to site creators on non-bypass system roles', async () => {
    await service.seedRoles();
    await roleModel.updateOne(
      { code: 'ACCOUNTANT' },
      { $addToSet: { permissions: 'petty_cash.request' } },
    );

    await service.seedRoles();

    const supervisor = await roleModel.findOne({ code: 'SITE_SUPERVISOR' }).lean();
    const engineer = await roleModel.findOne({ code: 'SITE_ENGINEER' }).lean();
    const director = await roleModel.findOne({ code: 'DIRECTOR' }).lean();
    const accountant = await roleModel.findOne({ code: 'ACCOUNTANT' }).lean();
    const financeDirector = await roleModel
      .findOne({ code: 'FINANCE_DIRECTOR' })
      .lean();

    expect(supervisor?.permissions).toContain('petty_cash.request');
    expect(engineer?.permissions).toContain('petty_cash.request');
    expect(director?.permissions).toContain('petty_cash.approve');
    expect(director?.permissions).not.toContain('petty_cash.request');
    expect(accountant?.permissions).not.toContain('petty_cash.request');
    expect(financeDirector?.permissions).toContain('petty_cash.approve');
    expect(financeDirector?.permissions).not.toContain('petty_cash.request');
  });
});
