import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { connect, disconnect } from 'mongoose';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditAction,
  AuditLog,
  AuditLogSchema,
} from '../audit-log/schemas/audit-log.schema';
import { Company, CompanySchema, CompanyStatus } from '../company/schemas/company.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import {
  ProjectAssignment,
  ProjectAssignmentSchema,
  ProjectTeamRole,
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
  let auditModel: Model<AuditLog>;
  let projectAccessService: ProjectAccessService;
  let service: ProjectsService;
  let companyId: string;
  let foreignCompanyId: string;
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
    const configuredPort = Number(process.env.MONGOMS_PORT);
    mongoServer = await MongoMemoryServer.create({
      instance:
        Number.isInteger(configuredPort) && configuredPort > 0
          ? { port: configuredPort }
          : undefined,
    });
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    documentModel = connection.model(
      ProjectFile.name,
      ProjectFileSchema,
    ) as Model<ProjectFile>;
    userModel = connection.model(User.name, UserSchema) as Model<User>;
    companyModel = connection.model(Company.name, CompanySchema) as Model<Company>;
    auditModel = connection.model(
      AuditLog.name,
      AuditLogSchema,
    ) as Model<AuditLog>;
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
      auditModel.syncIndexes(),
    ]);

    projectAccessService = new ProjectAccessService(
      assignmentModel,
      unauthorizedModel,
      userModel,
      projectModel,
      companyModel,
      permissionsService as never,
    );

    const sitesService = {
      cloneStructureToProject: jest.fn().mockResolvedValue(undefined),
      getStructure: jest.fn(),
      createStructureNode: jest.fn(),
      listWarehouses: jest.fn(),
      createWarehouse: jest.fn(),
    };
    const siteAccessService = {
      createAssignment: jest.fn().mockResolvedValue({ data: null }),
    };
    const actorContextService = {
      invalidate: jest.fn(),
    };

    service = new ProjectsService(
      projectModel,
      documentModel,
      userModel,
      companyModel,
      new NumberingService(counterModel),
      projectAccessService,
      new AuditLogService(auditModel),
      sitesService as never,
      siteAccessService as never,
      actorContextService as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await documentModel.deleteMany({}).setOptions({ withDeleted: true });
    await userModel.deleteMany({}).setOptions({ withDeleted: true });
    await companyModel.deleteMany({}).setOptions({ withDeleted: true });
    await auditModel.collection.deleteMany({});
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

    const company = await companyModel.create({
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
    companyId = String(company._id);

    const foreignCompany = await companyModel.create({
      companyCode: 'CMP-0002',
      legalName: 'Foreign Developers Pvt. Ltd.',
      tradeName: 'Foreign Developers',
      registeredAddress: {
        line1: 'Foreign Office',
        line2: null,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
      },
      corporateAddress: {
        line1: 'Foreign Office',
        line2: null,
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India',
      },
      authorisedShareCapital: 10_000_000,
      paidUpShareCapital: 0,
      financialYearStartMonth: 4,
      status: CompanyStatus.Active,
      isPrimary: false,
    });
    foreignCompanyId = String(foreignCompany._id);

    const users = await userModel.create([
      {
        userCode: 'USR-000001',
        fullName: 'Creator',
        email: 'creator@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: company._id,
      },
      {
        userCode: 'USR-000002',
        fullName: 'Manager',
        email: 'pm@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: company._id,
      },
      {
        userCode: 'USR-000003',
        fullName: 'Director',
        email: 'dir@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: company._id,
      },
      {
        userCode: 'USR-000004',
        fullName: 'Outsider',
        email: 'out@luxaria.dev',
        passwordHash: 'hash',
        status: UserStatus.Active,
        companyId: foreignCompany._id,
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

  it('creates a same-company project with generated projectCode', async () => {
    const response = await service.create(
      { ...baseCreate(), companyId },
      actorId,
    );
    expect(response.data?.projectCode).toMatch(/^PRJ-/);
    expect(response.data?.status).toBe(ProjectStatus.Draft);
    expect(response.data?.currency).toBe('INR');
    expect(response.data?.timeZone).toBe('Asia/Kolkata');
    expect(response.data?.projectName).toBe('Luxaria Heights');
    expect(response.data?.companyId).toBe(companyId);
  });

  it('derives the primary company when the actor has no explicit company', async () => {
    await userModel.findByIdAndUpdate(actorId, { companyId: null });

    const response = await service.create(baseCreate(), actorId);

    expect(response.data?.companyId).toBe(companyId);
  });

  it('rejects a supplied foreign company', async () => {
    await expect(
      service.create(
        { ...baseCreate(), companyId: foreignCompanyId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await projectModel.countDocuments()).toBe(0);
  });

  it.each([
    ['manager', (id: string) => ({ projectManager: id })],
    ['director', (id: string) => ({ assignedDirectors: [id] })],
  ])('rejects a foreign-company %s', async (_label, assigneeFields) => {
    await expect(
      service.create(
        { ...baseCreate(), ...assigneeFields(outsiderId) },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(await projectModel.countDocuments()).toBe(0);
  });

  it('assigns project manager and directors and grants project access', async () => {
    const assignmentSpy = jest.spyOn(
      projectAccessService,
      'assignProjectsToUser',
    );
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
    expect(assignmentSpy).toHaveBeenNthCalledWith(
      1,
      actorId,
      [created.data!.id],
      actorId,
    );
    expect(assignmentSpy).toHaveBeenNthCalledWith(
      2,
      managerId,
      [created.data!.id],
      actorId,
    );
    expect(assignmentSpy).toHaveBeenNthCalledWith(
      3,
      directorId,
      [created.data!.id],
      actorId,
    );

    const managerView = await service.getById(created.data!.id, managerId);
    expect(managerView.data?.id).toBe(created.data!.id);

    await expect(service.getById(created.data!.id, outsiderId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('records a safe project creation audit entry', async () => {
    const created = await service.create(baseCreate(), actorId);
    const audit = await auditModel
      .findOne({
        action: AuditAction.CREATE,
        entityId: created.data!.id,
      })
      .lean()
      .exec();

    expect(audit).toMatchObject({
      action: AuditAction.CREATE,
      module: 'project',
      entityType: 'project',
      entityId: created.data!.id,
    });
    expect(String(audit?.userId)).toBe(actorId);
    expect(String(audit?.projectId)).toBe(created.data!.id);
    expect(audit?.afterData).toMatchObject({
      id: created.data!.id,
      projectCode: created.data!.projectCode,
      projectName: created.data!.projectName,
      companyId,
    });
    expect(audit?.afterData).not.toHaveProperty('createdBy');
  });

  it('lists only accessible projects for non-global users', async () => {
    const a = await service.create({ ...baseCreate(), projectName: 'Project A' }, actorId);
    await service.create({ ...baseCreate(), projectName: 'Project B' }, managerId);

    const list = await service.list({}, actorId);
    expect(list.data?.map((p) => p.id)).toEqual([a.data!.id]);
  });

  it('keeps global project lists inside the authenticated company', async () => {
    const own = await service.create(
      { ...baseCreate(), projectName: 'Company A project' },
      actorId,
    );
    const foreign = await service.create(
      { ...baseCreate(), projectName: 'Company B project' },
      outsiderId,
    );
    permissionsService.resolveUserAccess.mockResolvedValue({
      bypassPermissions: true,
      permissions: [],
      roleCodes: ['SUPER_ADMIN'],
      roleIds: [],
      userId: actorId,
    });

    const list = await service.list({}, actorId);

    expect(list.data?.map((project) => project.id)).toContain(own.data!.id);
    expect(list.data?.map((project) => project.id)).not.toContain(
      foreign.data!.id,
    );
    await expect(
      service.list({ companyId: foreignCompanyId }, actorId),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
      { status: ProjectStatus.Planning },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Approval, note: 'Ready for approval review' },
      actorId,
    );
    const statusAudit = await auditModel
      .findOne({
        action: AuditAction.UPDATE,
        entityId: created.data!.id,
        'afterData.status': ProjectStatus.Approval,
      })
      .lean()
      .exec();
    expect(statusAudit?.afterData).toMatchObject({
      status: ProjectStatus.Approval,
      statusChangeNote: 'Ready for approval review',
    });

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

  it('suspends and resumes using statusBeforeHold', async () => {
    const created = await service.create(baseCreate(), actorId);
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Planning },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Approval },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Active },
      actorId,
    );

    const suspended = await service.suspend(created.data!.id, actorId);
    expect(suspended.data?.status).toBe(ProjectStatus.OnHold);
    expect(suspended.data?.statusBeforeHold).toBe(ProjectStatus.Active);

    const resumed = await service.resume(created.data!.id, actorId);
    expect(resumed.data?.status).toBe(ProjectStatus.Active);
    expect(resumed.data?.statusBeforeHold).toBeNull();
  });

  it('clones a project into Draft with new code', async () => {
    const created = await service.create(
      { ...baseCreate(), clientName: 'Acme' },
      actorId,
    );
    const cloned = await service.clone(
      created.data!.id,
      { projectName: 'Luxaria Heights Clone' },
      actorId,
    );
    expect(cloned.data?.status).toBe(ProjectStatus.Draft);
    expect(cloned.data?.projectName).toBe('Luxaria Heights Clone');
    expect(cloned.data?.projectCode).not.toBe(created.data!.projectCode);
    expect(cloned.data?.clientName).toBe('Acme');
  });

  it('assigns team member and creates project assignment with teamRole', async () => {
    const created = await service.create(baseCreate(), actorId);
    const team = await service.assignTeam(
      created.data!.id,
      {
        userId: managerId,
        teamRole: ProjectTeamRole.ProjectManager,
        accessStartDate: '2026-01-01',
      },
      actorId,
    );

    expect(team.data?.assignment.teamRole).toBe('project_manager');
    expect(team.data?.assignment.userId).toBe(managerId);

    const listed = await service.listTeam(created.data!.id, actorId);
    expect(listed.data?.some((row) => row.userId === managerId)).toBe(true);

    const project = await service.getById(created.data!.id, actorId);
    expect(project.data?.projectManager).toBe(managerId);
  });

  it('closes completed then archives and restores', async () => {
    const created = await service.create(baseCreate(), actorId);
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Planning },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Approval },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Active },
      actorId,
    );
    await service.updateStatus(
      created.data!.id,
      { status: ProjectStatus.Completed },
      actorId,
    );

    const closed = await service.close(created.data!.id, actorId);
    expect(closed.data?.status).toBe(ProjectStatus.Closed);

    const archived = await service.archive(created.data!.id, actorId);
    expect(archived.data?.status).toBe(ProjectStatus.Archived);

    const restored = await service.restore(created.data!.id, actorId);
    expect(restored.data?.status).toBe(ProjectStatus.Closed);
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

  it('rejects an invalid RERA window and preserves omitted RERA fields on update', async () => {
    await expect(
      service.create(
        {
          ...baseCreate(),
          reraDetails: {
            registrationDate: '2027-01-01',
            validUntil: '2026-01-01',
          },
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const created = await service.create(
      {
        ...baseCreate(),
        reraDetails: {
          reraNumber: 'TN/BUILDING/123/2026',
          registrationDate: '2026-01-01',
          validUntil: '2027-01-01',
          notes: 'Initial',
        },
      },
      actorId,
    );
    const updated = await service.update(
      created.data!.id,
      { reraDetails: { notes: 'Revised' } },
      actorId,
    );

    expect(updated.data?.reraDetails).toMatchObject({
      reraNumber: 'TN/BUILDING/123/2026',
      notes: 'Revised',
    });
    expect(updated.data?.reraDetails.registrationDate).toEqual(
      new Date('2026-01-01'),
    );
    expect(updated.data?.reraDetails.validUntil).toEqual(
      new Date('2027-01-01'),
    );
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

  it('rejects foreign-company manager and director reassignment', async () => {
    const created = await service.create(baseCreate(), actorId);

    await expect(
      service.assignProjectManager(
        created.data!.id,
        { projectManagerId: outsiderId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assignDirectors(
        created.data!.id,
        { directorIds: [outsiderId] },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects assignees with null companyId instead of primary-company fallback', async () => {
    await userModel.findByIdAndUpdate(managerId, { companyId: null });

    await expect(
      service.create(
        { ...baseCreate(), projectManager: managerId },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('revokes access when manager and director assignments are replaced', async () => {
    const created = await service.create(
      {
        ...baseCreate(),
        projectManager: managerId,
        assignedDirectors: [directorId],
      },
      actorId,
    );

    await service.assignProjectManager(
      created.data!.id,
      { projectManagerId: actorId },
      actorId,
    );
    await service.assignDirectors(
      created.data!.id,
      { directorIds: [] },
      actorId,
    );

    await expect(
      service.getById(created.data!.id, managerId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getById(created.data!.id, directorId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getById(created.data!.id, actorId),
    ).resolves.toMatchObject({ data: { id: created.data!.id } });
  });
});
