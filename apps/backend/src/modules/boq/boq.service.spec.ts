import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { BoqExcelService } from './boq-excel.service';
import { BoqService } from './boq.service';
import {
  BoqBlock,
  BoqBlockSchema,
  BoqFloor,
  BoqFloorSchema,
  BoqItem,
  BoqItemSchema,
  BoqItemStatus,
  BoqUnit,
  BoqVersion,
  BoqVersionSchema,
  BoqVersionStatus,
  BoqVersionType,
  BoqWorkCategory,
  BoqWorkCategorySchema,
} from './schemas/boq.schema';

describe('BoqService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: BoqService;
  let excelService: BoqExcelService;
  let projectModel: Model<Project>;
  let blockModel: Model<BoqBlock>;
  let floorModel: Model<BoqFloor>;
  let categoryModel: Model<BoqWorkCategory>;
  let itemModel: Model<BoqItem>;
  let versionModel: Model<BoqVersion>;

  let actorId: string;
  let projectId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    blockModel = connection.model(BoqBlock.name, BoqBlockSchema) as Model<BoqBlock>;
    floorModel = connection.model(BoqFloor.name, BoqFloorSchema) as Model<BoqFloor>;
    categoryModel = connection.model(
      BoqWorkCategory.name,
      BoqWorkCategorySchema,
    ) as Model<BoqWorkCategory>;
    itemModel = connection.model(BoqItem.name, BoqItemSchema) as Model<BoqItem>;
    versionModel = connection.model(
      BoqVersion.name,
      BoqVersionSchema,
    ) as Model<BoqVersion>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      projectModel.syncIndexes(),
      blockModel.syncIndexes(),
      floorModel.syncIndexes(),
      categoryModel.syncIndexes(),
      itemModel.syncIndexes(),
      versionModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    excelService = new BoqExcelService();
    service = new BoqService(
      blockModel,
      floorModel,
      categoryModel,
      itemModel,
      versionModel,
      projectModel,
      new NumberingService(counterModel),
      excelService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await blockModel.deleteMany({}).setOptions({ withDeleted: true });
    await floorModel.deleteMany({}).setOptions({ withDeleted: true });
    await categoryModel.deleteMany({}).setOptions({ withDeleted: true });
    await itemModel.deleteMany({}).setOptions({ withDeleted: true });
    await versionModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await projectModel.create([
      {
        projectCode: 'PRJ-BOQ-001',
        projectName: 'BOQ Test Tower',
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
  });

  async function seedHierarchy() {
    const block = await service.createBlock(
      projectId,
      { blockCode: 'BLK-A', name: 'Block A' },
      actorId,
    );
    const floor = await service.createFloor(
      block.data!.id,
      { floorCode: 'FL-GF', name: 'Ground Floor', level: 0 },
      actorId,
    );
    const category = await service.createWorkCategory(
      floor.data!.id,
      { categoryCode: 'WC-CIVIL', name: 'Civil Works' },
      actorId,
    );
    return {
      blockId: block.data!.id,
      floorId: floor.data!.id,
      workCategoryId: category.data!.id,
    };
  }

  it('creates hierarchy and BOQ item manually with computed totals', async () => {
    const { workCategoryId } = await seedHierarchy();
    const item = await service.createItem(
      projectId,
      {
        workCategoryId,
        description: 'RCC columns M25',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 10,
        materialCost: 4000,
        labourCost: 1000,
        subcontractCost: 500,
        otherCost: 500,
        materialCoefficients: [
          {
            materialCode: 'MAT-CEM',
            coefficient: 7.5,
            unit: BoqUnit.Bag,
          },
        ],
      },
      actorId,
    );

    expect(item.data!.boqCode).toMatch(/^BOQ-/);
    expect(item.data!.plannedRate).toBe(6000);
    expect(item.data!.plannedValue).toBe(60000);
    expect(item.data!.materialCoefficients).toHaveLength(1);
    expect(item.data!.status).toBe(BoqItemStatus.Draft);

    const tree = await service.getHierarchy(projectId);
    expect(tree.data).toHaveLength(1);
    expect(tree.data![0].floors[0].workCategories[0].items).toHaveLength(1);
  });

  it('rejects invalid totals when rate does not match cost sum', async () => {
    const { workCategoryId } = await seedHierarchy();
    await expect(
      service.createItem(
        projectId,
        {
          workCategoryId,
          description: 'Bad totals',
          unit: BoqUnit.SquareMetre,
          plannedQuantity: 5,
          materialCost: 100,
          labourCost: 0,
          plannedRate: 200,
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates project totals', async () => {
    const { workCategoryId } = await seedHierarchy();
    await service.createItem(
      projectId,
      {
        workCategoryId,
        boqCode: 'BOQ-MANUAL-1',
        description: 'Plastering',
        unit: BoqUnit.SquareMetre,
        plannedQuantity: 100,
        materialCost: 50,
        labourCost: 30,
        subcontractCost: 10,
        otherCost: 10,
      },
      actorId,
    );

    const result = await service.validateTotals(projectId);
    expect(result.data!.valid).toBe(true);
    expect(result.data!.totals.plannedValue).toBe(10000);
    expect(result.data!.invalidCount).toBe(0);
  });

  it('imports from Excel and exports back', async () => {
    const template = await excelService.buildTemplateBuffer();
    const imported = await service.importFromExcel(
      projectId,
      template,
      actorId,
    );

    expect(imported.data!.importedCount).toBe(1);
    expect(imported.data!.errorCount).toBe(0);
    expect(imported.data!.items[0].plannedRate).toBe(6700);

    const blocks = await service.listBlocks(projectId);
    expect(blocks.data).toHaveLength(1);

    const exported = await service.exportToExcel(projectId);
    expect(exported.filename).toContain(projectId);
    expect(exported.buffer.length).toBeGreaterThan(100);

    const reparsed = await excelService.parseImportBuffer(exported.buffer);
    expect(reparsed).toHaveLength(1);
    expect(reparsed[0].description).toContain('RCC');
  });

  it('enforces version control: immutability, single active, variation approval, compare', async () => {
    const { workCategoryId } = await seedHierarchy();

    const original = await service.createVersion(
      projectId,
      {
        versionType: BoqVersionType.Original,
        effectiveDate: '2026-08-01',
        reason: 'Baseline BOQ',
      },
      actorId,
    );
    expect(original.data!.versionNumber).toBe(1);
    expect(original.data!.status).toBe(BoqVersionStatus.Draft);

    await service.createItem(
      projectId,
      {
        versionId: original.data!.id,
        workCategoryId,
        boqCode: 'BOQ-COL-01',
        description: 'RCC columns',
        unit: BoqUnit.CubicMetre,
        plannedQuantity: 10,
        materialCost: 4000,
        labourCost: 1000,
        subcontractCost: 500,
        otherCost: 500,
      },
      actorId,
    );

    const activated = await service.activateVersion(
      original.data!.id,
      {},
      actorId,
    );
    expect(activated.data!.status).toBe(BoqVersionStatus.Active);

    await expect(
      service.createItem(
        projectId,
        {
          versionId: original.data!.id,
          workCategoryId,
          description: 'Should fail',
          unit: BoqUnit.Number,
          plannedQuantity: 1,
          materialCost: 10,
        },
        actorId,
      ),
    ).rejects.toThrow(/immutable/);

    const variation = await service.createVersion(
      projectId,
      {
        versionType: BoqVersionType.Variation,
        effectiveDate: '2026-09-01',
        reason: 'Extra columns at lobby',
        basedOnVersionId: original.data!.id,
        timeImpact: 7,
      },
      actorId,
    );
    expect(variation.data!.versionNumber).toBe(2);
    expect(variation.data!.status).toBe(BoqVersionStatus.Draft);

    const items = await service.listItems(projectId, {
      versionId: variation.data!.id,
    });
    expect(items.data).toHaveLength(1);

    // Increase quantity on variation draft
    const itemId = items.data![0].id;
    await service.updateItem(
      itemId,
      { plannedQuantity: 12 },
      actorId,
    );

    await expect(
      service.activateVersion(variation.data!.id, {}, actorId),
    ).rejects.toThrow(/require approval/);

    await service.submitVersion(variation.data!.id, actorId);
    const approved = await service.approveVersion(
      variation.data!.id,
      { approvalReference: 'APR-BOQ-001' },
      actorId,
    );
    expect(approved.data!.status).toBe(BoqVersionStatus.Active);
    expect(approved.data!.approvalReference).toBe('APR-BOQ-001');

    const prev = await service.getVersion(original.data!.id);
    expect(prev.data!.status).toBe(BoqVersionStatus.Superseded);

    const activeList = await service.listVersions(projectId);
    const activeCount = activeList.data!.filter(
      (v) => v.status === BoqVersionStatus.Active,
    ).length;
    expect(activeCount).toBe(1);

    const comparison = await service.compareVersions(
      projectId,
      original.data!.id,
      variation.data!.id,
    );
    expect(comparison.data!.summary.changedCount).toBe(1);
    expect(comparison.data!.summary.costImpact).toBe(12000);
    expect(comparison.data!.changed[0].boqCode).toBe('BOQ-COL-01');
  });
});
