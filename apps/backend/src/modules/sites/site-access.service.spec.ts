import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { SiteAccessService } from './site-access.service';
import { SitesService } from './sites.service';
import {
  SiteAssignment,
  SiteAssignmentSchema,
  SiteAssignmentStatus,
} from './schemas/site-assignment.schema';
import { Site, SiteSchema, SiteStatus, SiteType } from './schemas/site.schema';

describe('SiteAccessService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let siteModel: Model<Site>;
  let assignmentModel: Model<SiteAssignment>;
  let service: SiteAccessService;

  const companyId = new Types.ObjectId();
  const projectId = new Types.ObjectId();
  const siteA1 = new Types.ObjectId();
  const siteA2 = new Types.ObjectId();
  const userId = new Types.ObjectId();

  const permissionsService = {
    resolveUserAccess: jest.fn().mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
    }),
  };
  const actorContextService = {
    invalidate: jest.fn(),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    siteModel = connection.model(Site.name, SiteSchema) as Model<Site>;
    assignmentModel = connection.model(
      SiteAssignment.name,
      SiteAssignmentSchema,
    ) as Model<SiteAssignment>;
    await siteModel.syncIndexes();
    await assignmentModel.syncIndexes();

    const sitesService = new SitesService(siteModel);
    service = new SiteAccessService(
      assignmentModel,
      siteModel,
      sitesService,
      permissionsService as never,
      actorContextService as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
    });
    await siteModel.deleteMany({}).setOptions({ withDeleted: true });
    await assignmentModel.deleteMany({}).setOptions({ withDeleted: true });

    await siteModel.create([
      {
        _id: siteA1,
        companyId,
        projectId,
        siteCode: 'A1',
        siteName: 'Site A1',
        type: SiteType.Site,
        status: SiteStatus.Active,
      },
      {
        _id: siteA2,
        companyId,
        projectId,
        siteCode: 'A2',
        siteName: 'Site A2',
        type: SiteType.Site,
        status: SiteStatus.Active,
      },
    ]);
  });

  it('allows A1 and denies A2 when site-scoped to A1', async () => {
    await assignmentModel.create({
      companyId,
      userId,
      projectId,
      siteId: siteA1,
      effectiveFrom: new Date(Date.now() - 60_000),
      status: SiteAssignmentStatus.Active,
    });

    await expect(
      service.assertSiteAccess(String(userId), String(projectId), String(siteA1)),
    ).resolves.toBeUndefined();

    await expect(
      service.assertSiteAccess(String(userId), String(projectId), String(siteA2)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats zero site assignments as project-wide (compat)', async () => {
    await expect(
      service.assertSiteAccess(String(userId), String(projectId), String(siteA2)),
    ).resolves.toBeUndefined();

    const scope = await service.listAuthorisedSiteIds(
      String(userId),
      String(projectId),
    );
    expect(scope.siteScoped).toBe(false);
  });

  it('assertSiteAccessIfScoped no-ops without siteId', async () => {
    await expect(
      service.assertSiteAccessIfScoped({
        userId: String(userId),
        projectId: String(projectId),
        siteId: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('bypass permissions skip site checks', async () => {
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: true,
      permissions: [],
    });
    await assignmentModel.create({
      companyId,
      userId,
      projectId,
      siteId: siteA1,
      effectiveFrom: new Date(Date.now() - 60_000),
      status: SiteAssignmentStatus.Active,
    });

    await expect(
      service.assertSiteAccess(String(userId), String(projectId), String(siteA2)),
    ).resolves.toBeUndefined();
  });
});
