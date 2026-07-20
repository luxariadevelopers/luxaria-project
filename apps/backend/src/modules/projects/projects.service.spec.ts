import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import {
  ProjectAssignment,
  ProjectAssignmentSchema,
} from '../project-access/schemas/project-assignment.schema';
import {
  UnauthorizedProjectAccess,
  UnauthorizedProjectAccessSchema,
} from '../project-access/schemas/unauthorized-project-access.schema';
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { ProjectsService } from './projects.service';
import {
  ProjectFile,
  ProjectFileSchema,
} from './schemas/project-document.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from './schemas/project.schema';

describe('ProjectsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let projectModel: Model<Project>;
  let documentModel: Model<ProjectFile>;
  let userModel: Model<User>;
  let companyModel: Model<Company>;
  let service: ProjectsService;
  let actorId: string;
  let managerId: string;
  let directorId: string;
  let outsiderId: string;

  const permissionsService = {
    resolveUserAccess: jest.fn().mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    }),
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    documentModel = connection.model(
      ProjectFile.name,
      ProjectFileSchema,
    ) as Model<ProjectFile>;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    const assignmentModel = connection.model(
      ProjectAssignment.name,
      ProjectAssignmentSchema,
    ) as Model<ProjectAssignment>;
    const unauthorizedModel = connection.model(
      UnauthorizedProjectAccess.name,
      UnauthorizedProjectAccessSchema,
    ) as Model<UnauthorizedProjectAccess>;

    await Promise.all([
      projectModel.syncIndexes(),
      documentModel.syncIndexes(),
      userModel.syncIndexes(),
      companyModel.syncIndexes(),
      counterModel.syncIndexes(),
      assignmentModel.syncIndexes(),
    ]);

    const projectAccessService = new ProjectAccessService(
      assignmentModel,
      unauthorizedModel,
      userModel,
      projectModel,
      companyModel,
      permissionsService as never,
    );

    service = new ProjectsService(
      projectModel,
      documentModel,
      userModel,
      companyModel,
      new NumberingService(counterModel),
      projectAccessService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await documentModel.deleteMany({}).setOptions({ withDeleted: true });
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection
      .model(ProjectAssignment.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(UnauthorizedProjectAccess.name).deleteMany({});
    jest.clearAllMocks();
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: false,
      permissions: [],
      roleCodes: [],
      roleIds: [],
      userId: '',
    });

    await companyModel.create({
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
    });

    const users = await userModel.create([
      {
        userCode: 'USR-000001',
        fullName: 'Creator',
        email: 'creator@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
      {
        userCode: 'USR-000002',
        fullName: 'Manager',
        email: 'pm@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
      {
        userCode: 'USR-000003',
        fullName: 'Director',
        email: 'dir@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
      {
        userCode: 'USR-000004',
        fullName: 'Outsider',
        email: 'out@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
    ]);
    actorId = String(users[0]!._id);
    managerId = String(users[1]!._id);
    directorId = String(users[2]!._id);
    outsiderId = String(users[3]!._id);
  });

  const baseCreate = () => ({
    projectName: 'Luxaria Heights',
    projectType: ProjectType.Residential,
    address: {
      line1: 'OMR',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600119',
      country: 'India',
    },
    startDate: '2026-04-01',
    expectedCompletionDate: '2028-03-31',
    landArea: 50000,
    numberOfUnits: 120,
  });

  it('creates a project with generated projectCode', async () => {
    const response = await service.create(baseCreate(), actorId);
    expect(response.data?.projectCode).toMatch(/^PRJ-/);
    expect(response.data?.status).toBe(ProjectStatus.Planning);
    expect(response.data?.projectName).toBe('Luxaria Heights');
  });

  it('assigns project manager and directors and grants project access', async () => {
    const created = await service.create(
      {
        ...baseCreate(),
        projectManager: managerId,
        assignedDirectors: [directorId],
      },
      actorId,
    );

    expect(created.data?.projectManager).toBe(managerId);
    expect(created.data?.assignedDirectors).toContain(directorId);

    const managerView = await service.getById(created.data!.id, managerId);
    expect(managerView.data?.id).toBe(created.data!.id);

    await expect(service.getById(created.data!.id, outsiderId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists only accessible projects for non-global users', async () => {
    const a = await service.create({ ...baseCreate(), projectName: 'Project A' }, actorId);
    await service.create({ ...baseCreate(), projectName: 'Project B' }, managerId);

    const list = await service.list({}, actorId);
    expect(list.data?.map((p) => p.id)).toEqual([a.data!.id]);
  });

  it('updates project fields with validation', async () => {
    const created = await service.create(baseCreate(), actorId);
    const updated = await service.update(
      created.data!.id,
      {
        projectName: 'Luxaria Heights Phase 1',
        approvedBudget: 250_000_000,
        latitude: 12.9,
        longitude: 80.2,
      },
      actorId,
    );

    expect(updated.data?.projectName).toBe('Luxaria Heights Phase 1');
    expect(updated.data?.approvedBudget).toBe(250_000_000);
  });

  it('updates status through allowed transitions', async () => {
    const created = await service.create(baseCreate(), actorId);
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Approval },
      actorId,
    );
    const next = await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.PreConstruction },
      actorId,
    );
    expect(next.data?.status).toBe(ProjectStatus.PreConstruction);

    await expect(
      service.updateStatus(
        created.data!.id,
        { status: ProjectStatus.Completed },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads and lists project documents', async () => {
    const created = await service.create(baseCreate(), actorId);
    const uploaded = await service.addDocument(
      created.data!.id,
      {
        fileName: 'rera.pdf',
        filePath: 'uploads/projects/x/rera.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1200,
      },
      actorId,
    );
    expect(uploaded.data?.fileName).toBe('rera.pdf');

    const docs = await service.listDocuments(created.data!.id, actorId, {});
    expect(docs.data).toHaveLength(1);
  });

  it('rejects invalid expected completion before start', async () => {
    await expect(
      service.create(
        {
          ...baseCreate(),
          startDate: '2028-01-01',
          expectedCompletionDate: '2026-01-01',
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reassigns project manager', async () => {
    const created = await service.create(baseCreate(), actorId);
    const updated = await service.assignProjectManager(
      created.data!.id,
      { projectManagerId: managerId },
      actorId,
    );
    expect(updated.data?.projectManager).toBe(managerId);
  });
});
