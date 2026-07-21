import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { Site, SiteSchema, SiteType } from './schemas/site.schema';
import { SitesService } from './sites.service';

describe('SitesService structure hierarchy', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let siteModel: Model<Site>;
  let service: SitesService;
  const companyId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    siteModel = connection.model(Site.name, SiteSchema) as Model<Site>;
    await siteModel.syncIndexes();
    service = new SitesService(siteModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await siteModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  it('builds a site → phase → block tree', async () => {
    const site = await service.create(
      {
        projectId,
        siteCode: 'SITE-1',
        siteName: 'Main Site',
        type: SiteType.Site,
      },
      companyId,
    );
    const phase = await service.createStructureNode(
      projectId,
      {
        parentSiteId: site.data!.id,
        type: SiteType.Phase,
        siteCode: 'PH-1',
        siteName: 'Phase 1',
      },
      companyId,
    );
    await service.createStructureNode(
      projectId,
      {
        parentSiteId: phase.data!.id,
        type: SiteType.Block,
        siteCode: 'BLK-A',
        siteName: 'Block A',
      },
      companyId,
    );

    const tree = await service.getStructure(projectId, companyId);
    expect(tree.data).toHaveLength(1);
    expect(tree.data![0]!.children).toHaveLength(1);
    expect(tree.data![0]!.children[0]!.children).toHaveLength(1);
  });

  it('rejects parent cycles', async () => {
    const site = await service.create(
      {
        projectId,
        siteCode: 'SITE-1',
        siteName: 'Main Site',
        type: SiteType.Site,
      },
      companyId,
    );
    const phase = await service.createStructureNode(
      projectId,
      {
        parentSiteId: site.data!.id,
        type: SiteType.Phase,
        siteCode: 'PH-1',
        siteName: 'Phase 1',
      },
      companyId,
    );

    await expect(
      service.update(
        site.data!.id,
        { parentSiteId: phase.data!.id },
        companyId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects incompatible hierarchy ranks', async () => {
    const floor = await service.create(
      {
        projectId,
        siteCode: 'FL-1',
        siteName: 'Floor 1',
        type: SiteType.Floor,
      },
      companyId,
    );

    await expect(
      service.createStructureNode(
        projectId,
        {
          parentSiteId: floor.data!.id,
          type: SiteType.Site,
          siteCode: 'SITE-X',
          siteName: 'Bad nest',
        },
        companyId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
