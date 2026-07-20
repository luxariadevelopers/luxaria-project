import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DirectorsSeedService } from './directors.seed.service';
import { DirectorsService } from './directors.service';
import {
  DEFAULT_FACE_VALUE,
  PERCENTAGE_PER_DIRECTOR,
  SHARES_PER_DIRECTOR,
} from './directors.seed';
import { ShareholdingService } from './shareholding.service';
import {
  CompanyShareholding,
  CompanyShareholdingSchema,
} from './schemas/company-shareholding.schema';
import {
  DirectorFile,
  DirectorFileSchema,
} from './schemas/director-document.schema';
import { Director, DirectorSchema } from './schemas/director.schema';
import {
  ShareholdingChangeRequest,
  ShareholdingChangeRequestSchema,
  ShareholdingChangeStatus,
} from './schemas/shareholding-change-request.schema';

describe('ShareholdingService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let directorModel: Model<Director>;
  let shareholdingModel: Model<CompanyShareholding>;
  let changeRequestModel: Model<ShareholdingChangeRequest>;
  let companyModel: Model<Company>;
  let shareholdingService: ShareholdingService;
  let seedService: DirectorsSeedService;
  let companyId: string;
  const actorA = new Types.ObjectId().toHexString();
  const actorB = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    directorModel = connection.model(Director.name, DirectorSchema) as Model<Director>;
    shareholdingModel = connection.model(
      CompanyShareholding.name,
      CompanyShareholdingSchema,
    ) as Model<CompanyShareholding>;
    changeRequestModel = connection.model(
      ShareholdingChangeRequest.name,
      ShareholdingChangeRequestSchema,
    ) as Model<ShareholdingChangeRequest>;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    const documentModel = connection.model(
      DirectorFile.name,
      DirectorFileSchema,
    ) as Model<DirectorFile>;
    const userModel = connection.model(User.name, UserSchema) as Model<User>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;

    await Promise.all([
      directorModel.syncIndexes(),
      shareholdingModel.syncIndexes(),
      changeRequestModel.syncIndexes(),
      companyModel.syncIndexes(),
      documentModel.syncIndexes(),
      userModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const directorsService = new DirectorsService(
      directorModel,
      documentModel,
      userModel,
      companyModel,
      numbering,
    );
    shareholdingService = new ShareholdingService(
      shareholdingModel,
      changeRequestModel,
      directorModel,
      documentModel,
      companyModel,
      directorsService,
    );
    seedService = new DirectorsSeedService(
      directorModel,
      shareholdingModel,
      companyModel,
      numbering,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await directorModel.deleteMany({}).setOptions({ withDeleted: true });
    await shareholdingModel.deleteMany({}).setOptions({ withDeleted: true });
    await changeRequestModel.deleteMany({}).setOptions({ withDeleted: true });
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(DirectorFile.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(User.name).deleteMany({}).setOptions({ withDeleted: true });

    const [company] = await companyModel.create([
      {
        companyCode: 'CMP-0001',
        legalName: 'Luxaria Developers Pvt. Ltd.',
        tradeName: 'Luxaria',
        registeredAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        corporateAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        authorisedShareCapital: 10_000_000,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: true,
      },
    ]);
    companyId = String(company._id);

    await seedService.seedPlaceholderDirectors();
  });

  it('seeds four directors with 25% company shareholding each totaling 100%', async () => {
    const directors = await directorModel.find({ isPlaceholder: true }).lean();
    expect(directors).toHaveLength(4);

    const active = await shareholdingService.listActive(companyId);
    expect(active.data?.holdings).toHaveLength(4);
    expect(active.data?.totalPercentage).toBe(100);
    expect(active.data?.isBalanced).toBe(true);
    expect(active.data?.note).toMatch(/not project investment/i);

    for (const holding of active.data!.holdings) {
      expect(holding.percentage).toBe(PERCENTAGE_PER_DIRECTOR);
      expect(holding.numberOfShares).toBe(SHARES_PER_DIRECTOR);
      expect(holding.faceValue).toBe(DEFAULT_FACE_VALUE);
      expect(holding.version).toBe(1);
      expect(holding.effectiveTo).toBeNull();
    }
  });

  it('versions shareholding on approved change without overwriting prior rows', async () => {
    const directors = await directorModel.find({ isPlaceholder: true }).lean();
    const ids = directors.map((d) => String(d._id));

    const proposal = await shareholdingService.propose(
      {
        reason: 'Redistribute equity among the four directors',
        approvalReference: 'BR-SH-002',
        companyId,
        proposedHoldings: [
          {
            directorId: ids[0]!,
            numberOfShares: 400000,
            faceValue: 10,
            percentage: 40,
          },
          {
            directorId: ids[1]!,
            numberOfShares: 200000,
            faceValue: 10,
            percentage: 20,
          },
          {
            directorId: ids[2]!,
            numberOfShares: 200000,
            faceValue: 10,
            percentage: 20,
          },
          {
            directorId: ids[3]!,
            numberOfShares: 200000,
            faceValue: 10,
            percentage: 20,
          },
        ],
      },
      actorA,
    );

    await expect(
      shareholdingService.approve(
        proposal.data!.id,
        { approvalNote: 'self' },
        actorA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const approved = await shareholdingService.approve(
      proposal.data!.id,
      { approvalNote: 'Board approved' },
      actorB,
    );

    expect(approved.data?.changeRequest.status).toBe(ShareholdingChangeStatus.Approved);
    expect(approved.data?.activeShareholding?.totalPercentage).toBe(100);

    const history = await shareholdingModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ version: 1 })
      .lean();

    const v1 = history.filter((row) => row.version === 1);
    const v2 = history.filter((row) => row.version === 2);
    expect(v1).toHaveLength(4);
    expect(v2).toHaveLength(4);

    for (const row of v1) {
      expect(row.percentage).toBe(25);
      expect(row.effectiveTo).not.toBeNull();
    }
    for (const row of v2) {
      expect(row.effectiveTo).toBeNull();
    }

    const firstV1 = v1.find((row) => String(row.directorId) === ids[0]);
    expect(firstV1?.numberOfShares).toBe(SHARES_PER_DIRECTOR);
  });

  it('rejects proposals that do not total 100%', async () => {
    const directors = await directorModel.find({ isPlaceholder: true }).lean();
    await expect(
      shareholdingService.propose(
        {
          reason: 'Invalid unbalanced proposal attempt',
          companyId,
          proposedHoldings: [
            {
              directorId: String(directors[0]!._id),
              numberOfShares: 100000,
              faceValue: 10,
              percentage: 10,
            },
          ],
        },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is idempotent on re-seed', async () => {
    await seedService.seedPlaceholderDirectors();
    const directors = await directorModel.countDocuments({ isPlaceholder: true });
    const active = await shareholdingModel.countDocuments({
      companyId: new Types.ObjectId(companyId),
      effectiveTo: null,
    });
    expect(directors).toBe(4);
    expect(active).toBe(4);
  });
});
