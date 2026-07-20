import { BadRequestException, ConflictException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { LabourCategoriesService } from './labour-categories.service';
import { STANDARD_LABOUR_CATEGORIES } from './labour-categories.seed';
import {
  LabourCategory,
  LabourCategoryRate,
  LabourCategoryRateSchema,
  LabourCategorySchema,
  LabourCategoryStatus,
  LabourSkillLevel,
} from './schemas/labour-category.schema';

describe('LabourCategoriesService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: LabourCategoriesService;
  let categoryModel: Model<LabourCategory>;
  let rateModel: Model<LabourCategoryRate>;

  let actorId: string;
  let projectId: string;
  let contractorId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    categoryModel = connection.model(
      LabourCategory.name,
      LabourCategorySchema,
    ) as Model<LabourCategory>;
    rateModel = connection.model(
      LabourCategoryRate.name,
      LabourCategoryRateSchema,
    ) as Model<LabourCategoryRate>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      categoryModel.syncIndexes(),
      rateModel.syncIndexes(),
      projectModel.syncIndexes(),
      contractorModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new LabourCategoriesService(
      categoryModel,
      rateModel,
      projectModel,
      contractorModel,
      new NumberingService(counterModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    await categoryModel.deleteMany({}).setOptions({ withDeleted: true });
    await rateModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Contractor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-0001',
        projectName: 'Marina Residences',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectId = String(project._id);

    const [contractor] = await connection.model(Contractor.name).create([
      {
        contractorCode: 'CON-000001',
        legalName: 'Sunrise Civil',
        contractorType: ContractorType.Labour,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);
  });

  it('seeds standard labour categories idempotently', async () => {
    const first = await service.seedStandard(actorId);
    expect(first.data?.created).toBe(STANDARD_LABOUR_CATEGORIES.length);
    expect(first.data?.skipped).toBe(0);

    const second = await service.seedStandard(actorId);
    expect(second.data?.created).toBe(0);
    expect(second.data?.skipped).toBe(STANDARD_LABOUR_CATEGORIES.length);

    const listed = await service.list({ limit: 50 });
    const names = listed.data?.map((c) => c.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining([
        'Mason',
        'Helper',
        'Carpenter',
        'Bar Bender',
        'Electrician',
        'Plumber',
        'Painter',
        'Welder',
        'Supervisor',
        'Machine Operator',
      ]),
    );
  });

  it('creates category with LBC code and company default rates', async () => {
    const created = await service.create(
      {
        name: 'Mason',
        skillLevel: LabourSkillLevel.Skilled,
        defaultDailyRate: 900,
        overtimeRate: 1350,
      },
      actorId,
    );

    expect(created.data?.categoryCode).toMatch(/^LBC-\d{6}$/);
    expect(created.data?.status).toBe(LabourCategoryStatus.Active);
    expect(created.data?.defaultDailyRate).toBe(900);
    expect(created.data?.overtimeRate).toBe(1350);
  });

  it('rejects duplicate names and negative rates', async () => {
    await service.create(
      {
        name: 'Helper',
        skillLevel: LabourSkillLevel.Unskilled,
        defaultDailyRate: 500,
        overtimeRate: 750,
      },
      actorId,
    );

    await expect(
      service.create(
        {
          name: 'helper',
          skillLevel: LabourSkillLevel.Unskilled,
          defaultDailyRate: 510,
          overtimeRate: 760,
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);

    await expect(
      service.create(
        {
          name: 'Welder',
          skillLevel: LabourSkillLevel.HighlySkilled,
          defaultDailyRate: -1,
          overtimeRate: 100,
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('activates and deactivates categories', async () => {
    const created = await service.create(
      {
        name: 'Painter',
        skillLevel: LabourSkillLevel.SemiSkilled,
        defaultDailyRate: 800,
        overtimeRate: 1200,
      },
      actorId,
    );

    const deactivated = await service.deactivate(created.data!.id, actorId);
    expect(deactivated.data?.status).toBe(LabourCategoryStatus.Inactive);

    const activated = await service.activate(created.data!.id, actorId);
    expect(activated.data?.status).toBe(LabourCategoryStatus.Active);
  });

  it('supports project-specific and contractor-specific rates with resolve priority', async () => {
    const created = await service.create(
      {
        name: 'Mason',
        skillLevel: LabourSkillLevel.Skilled,
        defaultDailyRate: 900,
        overtimeRate: 1350,
      },
      actorId,
    );
    const categoryId = created.data!.id;

    await service.createRate(
      categoryId,
      {
        projectId,
        dailyRate: 1000,
        overtimeRate: 1500,
        effectiveDate: '2026-07-01',
      },
      actorId,
    );
    await service.createRate(
      categoryId,
      {
        contractorId,
        dailyRate: 1100,
        overtimeRate: 1650,
        effectiveDate: '2026-07-01',
      },
      actorId,
    );
    await service.createRate(
      categoryId,
      {
        projectId,
        contractorId,
        dailyRate: 1200,
        overtimeRate: 1800,
        effectiveDate: '2026-07-01',
      },
      actorId,
    );

    const company = await service.resolveRate({
      labourCategoryId: categoryId,
      asOf: '2026-07-20',
    });
    expect(company.data?.source).toBe('company');
    expect(company.data?.dailyRate).toBe(900);

    const projectOnly = await service.resolveRate({
      labourCategoryId: categoryId,
      projectId,
      asOf: '2026-07-20',
    });
    expect(projectOnly.data?.source).toBe('project');
    expect(projectOnly.data?.dailyRate).toBe(1000);

    const contractorOnly = await service.resolveRate({
      labourCategoryId: categoryId,
      contractorId,
      asOf: '2026-07-20',
    });
    expect(contractorOnly.data?.source).toBe('contractor');
    expect(contractorOnly.data?.dailyRate).toBe(1100);

    const both = await service.resolveRate({
      labourCategoryId: categoryId,
      projectId,
      contractorId,
      asOf: '2026-07-20',
    });
    expect(both.data?.source).toBe('project_contractor');
    expect(both.data?.dailyRate).toBe(1200);
    expect(both.data?.overtimeRate).toBe(1800);
  });

  it('uses effectiveDate when resolving rates', async () => {
    const created = await service.create(
      {
        name: 'Carpenter',
        skillLevel: LabourSkillLevel.Skilled,
        defaultDailyRate: 950,
        overtimeRate: 1425,
      },
      actorId,
    );

    await service.createRate(
      created.data!.id,
      {
        projectId,
        dailyRate: 1000,
        overtimeRate: 1500,
        effectiveDate: '2026-08-01',
      },
      actorId,
    );

    const before = await service.resolveRate({
      labourCategoryId: created.data!.id,
      projectId,
      asOf: '2026-07-15',
    });
    expect(before.data?.source).toBe('company');
    expect(before.data?.dailyRate).toBe(950);

    const after = await service.resolveRate({
      labourCategoryId: created.data!.id,
      projectId,
      asOf: '2026-08-15',
    });
    expect(after.data?.source).toBe('project');
    expect(after.data?.dailyRate).toBe(1000);
  });

  it('rejects company-only rate override rows', async () => {
    const created = await service.create(
      {
        name: 'Plumber',
        skillLevel: LabourSkillLevel.Skilled,
        defaultDailyRate: 1000,
        overtimeRate: 1500,
      },
      actorId,
    );

    await expect(
      service.createRate(
        created.data!.id,
        {
          dailyRate: 1050,
          overtimeRate: 1575,
          effectiveDate: '2026-07-01',
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
