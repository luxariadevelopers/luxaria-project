import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { BoqItem, BoqItemSchema, BoqUnit } from '../boq/schemas/boq.schema';
import {
  Material,
  MaterialSchema,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { MaterialConsumptionStandardService } from './material-consumption-standard.service';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardSchema,
  MaterialConsumptionStandardStatus,
} from './schemas/material-consumption-standard.schema';

describe('MaterialConsumptionStandardService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: MaterialConsumptionStandardService;
  let standardModel: Model<MaterialConsumptionStandard>;
  let materialModel: Model<Material>;
  let projectModel: Model<Project>;
  let boqItemModel: Model<BoqItem>;

  let actorId: string;
  let approverId: string;
  let projectId: string;
  let materialId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    standardModel = connection.model(
      MaterialConsumptionStandard.name,
      MaterialConsumptionStandardSchema,
    ) as Model<MaterialConsumptionStandard>;
    materialModel = connection.model(
      Material.name,
      MaterialSchema,
    ) as Model<Material>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    boqItemModel = connection.model(
      BoqItem.name,
      BoqItemSchema,
    ) as Model<BoqItem>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      standardModel.syncIndexes(),
      materialModel.syncIndexes(),
      projectModel.syncIndexes(),
      boqItemModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new MaterialConsumptionStandardService(
      standardModel,
      materialModel,
      projectModel,
      boqItemModel,
      new NumberingService(counterModel),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    approverId = new Types.ObjectId().toHexString();

    await standardModel.deleteMany({}).setOptions({ withDeleted: true });
    await materialModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await boqItemModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await projectModel.create([
      {
        projectCode: 'PRJ-MCS-001',
        projectName: 'MCS Test Tower',
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
      },
    ]);
    projectId = String(project._id);

    const [material] = await materialModel.create([
      {
        materialCode: 'BRICK-01',
        name: 'Brick',
        category: 'masonry',
        baseUnit: MaterialUnit.Number,
        ledgerAccountId: new Types.ObjectId(),
        status: MaterialStatus.Active,
      },
    ]);
    materialId = String(material._id);
  });

  async function createBrickStandard(overrides: Record<string, unknown> = {}) {
    return service.create(
      {
        workType: 'Brick masonry',
        outputUnit: BoqUnit.SquareFoot,
        materialId,
        quantityPerUnit: 8,
        wastagePercentage: 5,
        effectiveDate: '2026-07-01',
        ...overrides,
      },
      actorId,
    );
  }

  async function activate(id: string) {
    await service.submit(id, actorId);
    return service.approve(
      id,
      { approvalReference: 'APR-MCS-001' },
      approverId,
    );
  }

  it('creates draft standard with MCS number and effective qty', async () => {
    const created = await createBrickStandard();
    expect(created.data!.status).toBe(MaterialConsumptionStandardStatus.Draft);
    expect(created.data!.standardNumber).toMatch(/^MCS-/);
    expect(created.data!.version).toBe(1);
    expect(created.data!.quantityPerUnit).toBe(8);
    expect(created.data!.wastagePercentage).toBe(5);
    expect(created.data!.effectiveQuantityPerUnit).toBe(8.4);
    expect(created.data!.workType).toBe('Brick masonry');
    expect(created.data!.outputUnit).toBe(BoqUnit.SquareFoot);
    expect(created.data!.isProjectOverride).toBe(false);
  });

  it('requires approval before becoming active', async () => {
    const created = await createBrickStandard();
    await expect(
      service.approve(
        created.data!.id,
        { approvalReference: 'APR-1' },
        approverId,
      ),
    ).rejects.toThrow(BadRequestException);

    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data!.status).toBe(
      MaterialConsumptionStandardStatus.PendingApproval,
    );

    const approved = await service.approve(
      created.data!.id,
      { approvalReference: 'APR-MCS-001' },
      approverId,
    );
    expect(approved.data!.status).toBe(
      MaterialConsumptionStandardStatus.Active,
    );
    expect(approved.data!.approvalReference).toBe('APR-MCS-001');
    expect(approved.data!.approvedBy).toBe(approverId);
  });

  it('versions standards and supersedes prior active', async () => {
    const v1 = await createBrickStandard();
    await activate(v1.data!.id);

    const v2Draft = await service.createVersion(v1.data!.id, actorId);
    expect(v2Draft.data!.version).toBe(2);
    expect(v2Draft.data!.status).toBe(MaterialConsumptionStandardStatus.Draft);
    expect(v2Draft.data!.basedOnStandardId).toBe(v1.data!.id);

    const updated = await service.update(
      v2Draft.data!.id,
      { quantityPerUnit: 9, wastagePercentage: 4 },
      actorId,
    );
    expect(updated.data!.quantityPerUnit).toBe(9);

    await activate(v2Draft.data!.id);

    const old = await service.getById(v1.data!.id);
    expect(old.data!.status).toBe(
      MaterialConsumptionStandardStatus.Superseded,
    );
    const current = await service.getById(v2Draft.data!.id);
    expect(current.data!.status).toBe(MaterialConsumptionStandardStatus.Active);
  });

  it('supports project-specific override over global standard', async () => {
    const global = await createBrickStandard();
    await activate(global.data!.id);

    const projectOverride = await createBrickStandard({
      projectId,
      quantityPerUnit: 10,
      wastagePercentage: 3,
    });
    expect(projectOverride.data!.isProjectOverride).toBe(true);
    expect(projectOverride.data!.overridesStandardId).toBe(global.data!.id);
    await activate(projectOverride.data!.id);

    const resolved = await service.resolve({
      projectId,
      workType: 'Brick masonry',
      materialId,
      outputUnit: BoqUnit.SquareFoot,
      asOf: '2026-07-20',
    });
    expect(resolved.data!.id).toBe(projectOverride.data!.id);
    expect(resolved.data!.quantityPerUnit).toBe(10);
    expect(
      (resolved.data as { resolvedFrom?: string }).resolvedFrom,
    ).toBe('project');

    const globalResolved = await service.resolve({
      workType: 'Brick masonry',
      materialId,
      outputUnit: BoqUnit.SquareFoot,
    });
    expect(globalResolved.data!.id).toBe(global.data!.id);
  });

  it('rejects create without boqItemId or workType', async () => {
    await expect(
      service.create(
        {
          outputUnit: BoqUnit.SquareFoot,
          materialId,
          quantityPerUnit: 8,
          wastagePercentage: 5,
          effectiveDate: '2026-07-01',
        },
        actorId,
      ),
    ).rejects.toThrow(/boqItemId or workType/);
  });
});
