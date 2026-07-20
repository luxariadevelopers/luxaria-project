import { ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { UnitsService } from './units.service';
import {
  Unit,
  UnitSchema,
  UnitStatus,
  UnitType,
} from './schemas/unit.schema';

describe('UnitsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: UnitsService;
  let unitModel: Model<Unit>;

  let actorId: string;
  let projectId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    unitModel = connection.model(Unit.name, UnitSchema) as Model<Unit>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;

    await Promise.all([unitModel.syncIndexes(), projectModel.syncIndexes()]);

    service = new UnitsService(unitModel, projectModel);
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await unitModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-UNIT-001',
        projectName: 'Marina Residences',
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
  });

  it('creates a unit with inventory fields', async () => {
    const created = await service.create(
      {
        projectId,
        block: 'A',
        floor: '12',
        unitNumber: '1201',
        unitType: UnitType.TwoBhk,
        carpetArea: 850,
        builtUpArea: 1050,
        uds: 320,
        facing: undefined,
        parking: '1 covered',
        basePrice: 7500000,
        additionalCharges: 250000,
        tax: 375000,
      },
      actorId,
    );

    expect(created.data!.block).toBe('A');
    expect(created.data!.unitNumber).toBe('1201');
    expect(created.data!.status).toBe(UnitStatus.Available);
    expect(created.data!.totalPrice).toBe(8125000);
  });

  it('enforces unique active unit number within project and block', async () => {
    await service.create(
      {
        projectId,
        block: 'A',
        floor: '1',
        unitNumber: '101',
        unitType: UnitType.OneBhk,
        carpetArea: 500,
        builtUpArea: 650,
        uds: 200,
        basePrice: 4000000,
      },
      actorId,
    );

    await expect(
      service.create(
        {
          projectId,
          block: 'A',
          floor: '2',
          unitNumber: '101',
          unitType: UnitType.OneBhk,
          carpetArea: 510,
          builtUpArea: 660,
          uds: 210,
          basePrice: 4100000,
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);

    // Same number allowed in a different block
    const otherBlock = await service.create(
      {
        projectId,
        block: 'B',
        floor: '1',
        unitNumber: '101',
        unitType: UnitType.OneBhk,
        carpetArea: 500,
        builtUpArea: 650,
        uds: 200,
        basePrice: 4000000,
      },
      actorId,
    );
    expect(otherBlock.data!.block).toBe('B');
  });

  it('prevents double booking via concurrent claim', async () => {
    const created = await service.create(
      {
        projectId,
        block: 'A',
        floor: '5',
        unitNumber: '501',
        unitType: UnitType.ThreeBhk,
        carpetArea: 1200,
        builtUpArea: 1450,
        uds: 400,
        basePrice: 9000000,
      },
      actorId,
    );
    const unitId = created.data!.id;

    const first = await service.changeStatus(
      unitId,
      { status: UnitStatus.Booked, bookingRefId: new Types.ObjectId().toHexString() },
      actorId,
    );
    expect(first.data!.status).toBe(UnitStatus.Booked);

    await expect(
      service.changeStatus(
        unitId,
        {
          status: UnitStatus.Booked,
          bookingRefId: new Types.ObjectId().toHexString(),
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.changeStatus(
        unitId,
        {
          status: UnitStatus.Reserved,
          bookingRefId: new Types.ObjectId().toHexString(),
        },
        actorId,
      ),
    ).rejects.toThrow();
  });

  it('follows Available → Held → Reserved → Booked progression', async () => {
    const created = await service.create(
      {
        projectId,
        block: 'C',
        floor: '3',
        unitNumber: '302',
        unitType: UnitType.TwoBhk,
        carpetArea: 900,
        builtUpArea: 1100,
        uds: 350,
        basePrice: 8000000,
      },
      actorId,
    );
    const unitId = created.data!.id;

    await service.changeStatus(unitId, { status: UnitStatus.Held }, actorId);
    await service.changeStatus(
      unitId,
      { status: UnitStatus.Reserved },
      actorId,
    );
    const booked = await service.changeStatus(
      unitId,
      { status: UnitStatus.Booked },
      actorId,
    );
    expect(booked.data!.status).toBe(UnitStatus.Booked);

    const executed = await service.changeStatus(
      unitId,
      { status: UnitStatus.AgreementExecuted },
      actorId,
    );
    expect(executed.data!.status).toBe(UnitStatus.AgreementExecuted);
  });
});
