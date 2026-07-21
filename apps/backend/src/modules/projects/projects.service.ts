import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { toAddressEmbed } from '../company/schemas/address.embed';
import { Company } from '../company/schemas/company.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ActorContextService } from '../project-access/actor-context.service';
import { ProjectAccessService } from '../project-access/project-access.service';
import { ProjectTeamRole } from '../project-access/schemas/project-assignment.schema';
import { SiteAccessService } from '../sites/site-access.service';
import { SitesService } from '../sites/sites.service';
import { User } from '../users/schemas/user.schema';
import type { AssignDirectorsDto } from './dto/assign-directors.dto';
import type { AssignProjectManagerDto } from './dto/assign-project-manager.dto';
import type { AssignProjectTeamDto } from './dto/assign-project-team.dto';
import type { CloneProjectDto } from './dto/clone-project.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import type { ProjectFinancialConfigDto } from './dto/project-financial-config.dto';
import type { ProjectSettingsDto } from './dto/project-settings.dto';
import type { ReraDetailsDto } from './dto/rera-details.dto';
import type { UpdateProjectStatusDto } from './dto/update-project-status.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';
import {
  type PublicProjectDocument,
  toPublicProject,
} from './projects.mapper';
import {
  assertCoordinates,
  assertValidReraDates,
  assertStatusTransition,
  assertValidProjectDates,
} from './projects.validation';
import { defaultProjectFinancialConfig } from './schemas/project-financial-config.embed';
import {
  ProjectDocumentCategory,
  ProjectFile,
} from './schemas/project-document.schema';
import { defaultProjectSettings } from './schemas/project-settings.embed';
import type { ReraDetailsEmbed } from './schemas/rera-details.embed';
import {
  Project,
  ProjectStage,
  ProjectStatus,
} from './schemas/project.schema';

const ALLOWED_SORT = new Set([
  'createdAt',
  'updatedAt',
  'projectName',
  'projectCode',
  'status',
  'startDate',
  'expectedCompletionDate',
]);

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectFile.name) private readonly documentModel: Model<ProjectFile>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly numberingService: NumberingService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly auditLogService: AuditLogService,
    private readonly sitesService: SitesService,
    private readonly siteAccessService: SiteAccessService,
    private readonly actorContextService: ActorContextService,
  ) {}

  async create(dto: CreateProjectDto, actorId: string) {
    assertCoordinates(dto.latitude, dto.longitude);
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const expectedCompletionDate = dto.expectedCompletionDate
      ? new Date(dto.expectedCompletionDate)
      : null;
    assertValidProjectDates({ startDate, expectedCompletionDate });

    const companyId = await this.resolveAuthenticatedCompanyId(actorId);
    this.assertRequestedCompanyMatches(dto.companyId, companyId);

    if (dto.projectManager) {
      await this.assertUserBelongsToCompany(dto.projectManager, companyId);
    }
    if (dto.assignedDirectors?.length) {
      await this.assertUsersBelongToCompany(dto.assignedDirectors, companyId);
    }

    const projectCode = await this.numberingService.nextCode(NumberEntityType.PROJECT);
    const reraDetails = this.toReraEmbed(dto.reraDetails);
    assertValidReraDates(reraDetails);

    const settings = {
      ...defaultProjectSettings(),
      ...(dto.settings ?? {}),
    };
    const financialConfig = {
      ...defaultProjectFinancialConfig(),
      ...(dto.financialConfig ?? {}),
      costCentreCodes: dto.financialConfig?.costCentreCodes ?? [],
      budgetCategories: dto.financialConfig?.budgetCategories ?? [],
    };

    const project = await this.projectModel.create({
      projectCode,
      projectName: dto.projectName.trim(),
      description: dto.description?.trim() ?? null,
      projectType: dto.projectType,
      address: toAddressEmbed(dto.address),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      siteRadiusMeters: dto.siteRadiusMeters ?? null,
      landArea: dto.landArea ?? null,
      builtUpArea: dto.builtUpArea ?? null,
      numberOfBlocks: dto.numberOfBlocks ?? null,
      numberOfUnits: dto.numberOfUnits ?? null,
      startDate,
      expectedCompletionDate,
      actualCompletionDate: null,
      status: dto.status ?? ProjectStatus.Draft,
      statusBeforeHold: null,
      clientName: dto.clientName?.trim() ?? null,
      currency: (dto.currency ?? 'INR').trim().toUpperCase() || 'INR',
      timeZone: dto.timeZone?.trim() || 'Asia/Kolkata',
      financialYearId: dto.financialYearId
        ? new Types.ObjectId(dto.financialYearId)
        : null,
      settings,
      financialConfig,
      projectManager: dto.projectManager
        ? new Types.ObjectId(dto.projectManager)
        : null,
      assignedDirectors: (dto.assignedDirectors ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      defaultBankAccount: dto.defaultBankAccount
        ? new Types.ObjectId(dto.defaultBankAccount)
        : null,
      approvedBudget: dto.approvedBudget ?? null,
      projectStage: dto.projectStage ?? ProjectStage.Concept,
      reraDetails,
      companyId,
      createdBy: new Types.ObjectId(actorId),
    });

    await this.projectAccessService.assignProjectsToUser(
      actorId,
      [String(project._id)],
      actorId,
    );
    if (dto.projectManager && dto.projectManager !== actorId) {
      await this.projectAccessService.assignProjectsToUser(
        dto.projectManager,
        [String(project._id)],
        actorId,
      );
    }
    for (const directorId of dto.assignedDirectors ?? []) {
      if (directorId !== actorId) {
        await this.projectAccessService.assignProjectsToUser(
          directorId,
          [String(project._id)],
          actorId,
        );
      }
    }

    const publicProject = toPublicProject(project);
    await this.auditProjectMutation(
      AuditAction.CREATE,
      actorId,
      String(project._id),
      null,
      publicProject,
    );

    return createSuccessResponse(publicProject, 'Project created successfully');
  }

  async update(id: string, dto: UpdateProjectDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      assertCoordinates(
        dto.latitude !== undefined ? dto.latitude : project.latitude,
        dto.longitude !== undefined ? dto.longitude : project.longitude,
      );
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : project.startDate;
    const expectedCompletionDate =
      dto.expectedCompletionDate !== undefined
        ? dto.expectedCompletionDate
          ? new Date(dto.expectedCompletionDate)
          : null
        : project.expectedCompletionDate;
    const actualCompletionDate =
      dto.actualCompletionDate !== undefined
        ? dto.actualCompletionDate
          ? new Date(dto.actualCompletionDate)
          : null
        : project.actualCompletionDate;
    assertValidProjectDates({ startDate, expectedCompletionDate, actualCompletionDate });

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actorId),
    };

    if (dto.projectName !== undefined) update.projectName = dto.projectName.trim();
    if (dto.description !== undefined) {
      update.description = dto.description?.trim() ?? null;
    }
    if (dto.projectType !== undefined) update.projectType = dto.projectType;
    if (dto.address !== undefined) update.address = toAddressEmbed(dto.address);
    if (dto.latitude !== undefined) update.latitude = dto.latitude;
    if (dto.longitude !== undefined) update.longitude = dto.longitude;
    if (dto.siteRadiusMeters !== undefined) {
      update.siteRadiusMeters = dto.siteRadiusMeters;
    }
    if (dto.landArea !== undefined) update.landArea = dto.landArea;
    if (dto.builtUpArea !== undefined) update.builtUpArea = dto.builtUpArea;
    if (dto.numberOfBlocks !== undefined) update.numberOfBlocks = dto.numberOfBlocks;
    if (dto.numberOfUnits !== undefined) update.numberOfUnits = dto.numberOfUnits;
    if (dto.startDate !== undefined) update.startDate = startDate;
    if (dto.expectedCompletionDate !== undefined) {
      update.expectedCompletionDate = expectedCompletionDate;
    }
    if (dto.actualCompletionDate !== undefined) {
      update.actualCompletionDate = actualCompletionDate;
    }
    if (dto.clientName !== undefined) {
      update.clientName = dto.clientName?.trim() ?? null;
    }
    if (dto.currency !== undefined) {
      update.currency = dto.currency.trim().toUpperCase() || 'INR';
    }
    if (dto.timeZone !== undefined) {
      update.timeZone = dto.timeZone.trim() || 'Asia/Kolkata';
    }
    if (dto.financialYearId !== undefined) {
      update.financialYearId = dto.financialYearId
        ? new Types.ObjectId(dto.financialYearId)
        : null;
    }
    if (dto.settings !== undefined) {
      update.settings = this.mergeSettings(project.settings, dto.settings);
    }
    if (dto.financialConfig !== undefined) {
      update.financialConfig = this.mergeFinancialConfig(
        project.financialConfig,
        dto.financialConfig,
      );
    }
    if (dto.defaultBankAccount !== undefined) {
      update.defaultBankAccount = dto.defaultBankAccount
        ? new Types.ObjectId(dto.defaultBankAccount)
        : null;
    }
    if (dto.approvedBudget !== undefined) update.approvedBudget = dto.approvedBudget;
    if (dto.projectStage !== undefined) update.projectStage = dto.projectStage;
    if (dto.reraDetails !== undefined) {
      const reraDetails = this.mergeReraEmbed(
        project.reraDetails,
        dto.reraDetails,
      );
      assertValidReraDates(reraDetails);
      update.reraDetails = reraDetails;
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      publicUpdated,
    );

    return createSuccessResponse(publicUpdated, 'Project updated successfully');
  }

  async updateSettings(id: string, dto: ProjectSettingsDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          settings: this.mergeSettings(project.settings, dto),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(
      toPublicProject(updated!),
      'Project settings updated successfully',
    );
  }

  async updateFinancialConfig(
    id: string,
    dto: ProjectFinancialConfigDto,
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          financialConfig: this.mergeFinancialConfig(
            project.financialConfig,
            dto,
          ),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();
    return createSuccessResponse(
      toPublicProject(updated!),
      'Project financial config updated successfully',
    );
  }

  async assignProjectManager(
    id: string,
    dto: AssignProjectManagerDto,
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    await this.assertUserBelongsToCompany(
      dto.projectManagerId,
      await this.resolveProjectCompanyId(project, actorId),
    );

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          projectManager: new Types.ObjectId(dto.projectManagerId),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    await this.projectAccessService.assignProjectsToUser(
      dto.projectManagerId,
      [id],
      actorId,
    );
    const previousManagerId = project.projectManager
      ? String(project.projectManager)
      : null;
    const creatorId = this.projectCreatorId(project);
    if (
      previousManagerId &&
      previousManagerId !== dto.projectManagerId &&
      previousManagerId !== creatorId &&
      !project.assignedDirectors.some(
        (directorId) => String(directorId) === previousManagerId,
      )
    ) {
      await this.projectAccessService.removeProjectsFromUser(
        previousManagerId,
        [id],
        actorId,
      );
    }

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      publicUpdated,
    );

    return createSuccessResponse(
      publicUpdated,
      'Project manager assigned successfully',
    );
  }

  async assignDirectors(id: string, dto: AssignDirectorsDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    await this.assertUsersBelongToCompany(
      dto.directorIds,
      await this.resolveProjectCompanyId(project, actorId),
    );

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          assignedDirectors: dto.directorIds.map((dirId) => new Types.ObjectId(dirId)),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    for (const directorId of dto.directorIds) {
      await this.projectAccessService.assignProjectsToUser(directorId, [id], actorId);
    }
    const nextDirectorIds = new Set(dto.directorIds);
    const creatorId = this.projectCreatorId(project);
    const managerId = project.projectManager
      ? String(project.projectManager)
      : null;
    for (const previousDirectorId of project.assignedDirectors.map(String)) {
      if (
        !nextDirectorIds.has(previousDirectorId) &&
        previousDirectorId !== creatorId &&
        previousDirectorId !== managerId
      ) {
        await this.projectAccessService.removeProjectsFromUser(
          previousDirectorId,
          [id],
          actorId,
        );
      }
    }

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      publicUpdated,
    );

    return createSuccessResponse(
      publicUpdated,
      'Directors assigned successfully',
    );
  }

  async updateStatus(id: string, dto: UpdateProjectStatusDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    assertStatusTransition(project.status, dto.status);

    const update: Record<string, unknown> = {
      status: dto.status,
      updatedBy: new Types.ObjectId(actorId),
    };

    if (
      dto.status === ProjectStatus.OnHold &&
      project.status !== ProjectStatus.OnHold
    ) {
      update.statusBeforeHold = project.status;
    }

    if (
      project.status === ProjectStatus.OnHold &&
      dto.status !== ProjectStatus.OnHold
    ) {
      update.statusBeforeHold = null;
    }

    if (dto.status === ProjectStatus.Completed || dto.status === ProjectStatus.Closed) {
      update.actualCompletionDate = dto.actualCompletionDate
        ? new Date(dto.actualCompletionDate)
        : project.actualCompletionDate ?? new Date();
      assertValidProjectDates({
        startDate: project.startDate,
        expectedCompletionDate: project.expectedCompletionDate,
        actualCompletionDate: update.actualCompletionDate as Date,
      });
    }

    if (dto.status === ProjectStatus.Closed) {
      update.projectStage = ProjectStage.Closed;
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    const publicUpdated = toPublicProject(updated!);
    const statusChangeNote = dto.note?.trim() || null;
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      statusChangeNote
        ? { ...publicUpdated, statusChangeNote }
        : publicUpdated,
    );

    return createSuccessResponse(
      publicUpdated,
      'Project status updated successfully',
    );
  }

  async suspend(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    if (project.status === ProjectStatus.OnHold) {
      throw new BadRequestException('Project is already on hold');
    }
    assertStatusTransition(project.status, ProjectStatus.OnHold);

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          status: ProjectStatus.OnHold,
          statusBeforeHold: project.status,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      { ...publicUpdated, operation: 'suspend' },
    );
    return createSuccessResponse(publicUpdated, 'Project suspended successfully');
  }

  async resume(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    if (project.status !== ProjectStatus.OnHold) {
      throw new BadRequestException('Project is not on hold');
    }
    const target = project.statusBeforeHold ?? ProjectStatus.Active;
    assertStatusTransition(ProjectStatus.OnHold, target);

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          status: target,
          statusBeforeHold: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      { ...publicUpdated, operation: 'resume' },
    );
    return createSuccessResponse(publicUpdated, 'Project resumed successfully');
  }

  /** Uses `project.close` permission at controller. */
  async close(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);

    if (project.status === ProjectStatus.Closed) {
      return createSuccessResponse(
        toPublicProject(project),
        'Project is already closed',
      );
    }
    if (project.status !== ProjectStatus.Completed) {
      throw new BadRequestException(
        'Project must be Completed before close (use status workflow to complete first)',
      );
    }
    assertStatusTransition(project.status, ProjectStatus.Closed);

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          status: ProjectStatus.Closed,
          projectStage: ProjectStage.Closed,
          actualCompletionDate: project.actualCompletionDate ?? new Date(),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      { ...publicUpdated, operation: 'close' },
    );
    return createSuccessResponse(publicUpdated, 'Project closed successfully');
  }

  /** Archive reuses `project.close` permission (no separate project.archive code). */
  async archive(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    assertStatusTransition(project.status, ProjectStatus.Archived);

    const updated = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          status: ProjectStatus.Archived,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    const publicUpdated = toPublicProject(updated!);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      toPublicProject(project),
      { ...publicUpdated, operation: 'archive' },
    );
    return createSuccessResponse(publicUpdated, 'Project archived successfully');
  }

  async restore(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);

    if (project.status === ProjectStatus.Archived) {
      assertStatusTransition(ProjectStatus.Archived, ProjectStatus.Closed);
      const updated = await this.projectModel
        .findByIdAndUpdate(
          id,
          {
            status: ProjectStatus.Closed,
            updatedBy: new Types.ObjectId(actorId),
          },
          { new: true },
        )
        .exec();
      const publicUpdated = toPublicProject(updated!);
      await this.auditProjectMutation(
        AuditAction.UPDATE,
        actorId,
        id,
        toPublicProject(project),
        { ...publicUpdated, operation: 'restore_from_archive' },
      );
      return createSuccessResponse(
        publicUpdated,
        'Project restored from archive successfully',
      );
    }

    throw new BadRequestException(
      'Only Archived projects can be restored via this endpoint (use restore-deleted for soft-deleted rows)',
    );
  }

  /** Clone reuses `project.create` permission (no separate project.clone code). */
  async clone(id: string, dto: CloneProjectDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'read');
    const source = await this.requireProject(id);
    const companyId = await this.resolveProjectCompanyId(source, actorId);

    const projectCode = await this.numberingService.nextCode(
      NumberEntityType.PROJECT,
    );
    const copySettings = dto.copySettings !== false;
    const copyFinancialConfig = dto.copyFinancialConfig !== false;

    const cloned = await this.projectModel.create({
      projectCode,
      projectName: dto.projectName.trim(),
      description: source.description,
      projectType: source.projectType,
      address: source.address,
      latitude: source.latitude,
      longitude: source.longitude,
      siteRadiusMeters: source.siteRadiusMeters,
      landArea: source.landArea,
      builtUpArea: source.builtUpArea,
      numberOfBlocks: source.numberOfBlocks,
      numberOfUnits: source.numberOfUnits,
      startDate: source.startDate,
      expectedCompletionDate: source.expectedCompletionDate,
      actualCompletionDate: null,
      status: ProjectStatus.Draft,
      statusBeforeHold: null,
      clientName: source.clientName,
      currency: source.currency ?? 'INR',
      timeZone: source.timeZone ?? 'Asia/Kolkata',
      financialYearId: source.financialYearId,
      settings: copySettings
        ? (source.settings ?? defaultProjectSettings())
        : defaultProjectSettings(),
      financialConfig: copyFinancialConfig
        ? (source.financialConfig ?? defaultProjectFinancialConfig())
        : defaultProjectFinancialConfig(),
      projectManager: null,
      assignedDirectors: [],
      defaultBankAccount: source.defaultBankAccount,
      approvedBudget: source.approvedBudget,
      projectStage: ProjectStage.Concept,
      reraDetails: source.reraDetails,
      companyId,
      createdBy: new Types.ObjectId(actorId),
    });

    await this.projectAccessService.assignProjectsToUser(
      actorId,
      [String(cloned._id)],
      actorId,
    );

    if (dto.copyStructure) {
      await this.sitesService.cloneStructureToProject({
        sourceProjectId: id,
        targetProjectId: String(cloned._id),
        companyId: String(companyId),
        actorId,
      });
    }

    const publicProject = toPublicProject(cloned);
    await this.auditProjectMutation(
      AuditAction.CREATE,
      actorId,
      String(cloned._id),
      null,
      { ...publicProject, operation: 'clone', clonedFrom: id },
    );

    return createSuccessResponse(publicProject, 'Project cloned successfully');
  }

  async softDelete(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    const project = await this.requireProject(id);
    await project.softDelete(new Types.ObjectId(actorId));
    await this.auditProjectMutation(
      AuditAction.DELETE,
      actorId,
      id,
      toPublicProject(project),
      { operation: 'soft_delete', id },
    );
    return createSuccessResponse(
      { id, deleted: true },
      'Project soft-deleted successfully',
    );
  }

  async restoreDeleted(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel
      .findById(id)
      .setOptions({ onlyDeleted: true })
      .exec();
    if (!project) {
      throw new NotFoundException('Deleted project not found');
    }
    await this.assertCanAccess(actorId, id, 'update');
    await project.restore();
    project.set('updatedBy', new Types.ObjectId(actorId));
    await project.save();

    const publicProject = toPublicProject(project);
    await this.auditProjectMutation(
      AuditAction.UPDATE,
      actorId,
      id,
      null,
      { ...publicProject, operation: 'restore_deleted' },
    );
    return createSuccessResponse(
      publicProject,
      'Soft-deleted project restored successfully',
    );
  }

  async listTeam(projectId: string, actorId: string) {
    await this.assertCanAccess(actorId, projectId, 'read');
    await this.requireProject(projectId);

    const assignments =
      await this.projectAccessService.listTeamAssignments(projectId);
    const userIds = [...new Set(assignments.map((a) => String(a.userId)))];
    const users = await this.userModel
      .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
      .select('_id fullName email userCode status')
      .lean()
      .exec();
    const userMap = new Map(
      users.map((u) => [
        String(u._id),
        {
          id: String(u._id),
          fullName: u.fullName,
          email: u.email,
          userCode: u.userCode,
          status: u.status,
        },
      ]),
    );

    const data = assignments.map((assignment) => ({
      id: String(assignment._id),
      projectId,
      userId: String(assignment.userId),
      teamRole: assignment.teamRole ?? null,
      accessStartDate: assignment.accessStartDate,
      accessEndDate: assignment.accessEndDate ?? null,
      status: assignment.status,
      user: userMap.get(String(assignment.userId)) ?? null,
    }));

    return createSuccessResponse(data, 'Project team fetched successfully');
  }

  async assignTeam(
    projectId: string,
    dto: AssignProjectTeamDto,
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, projectId, 'update');
    const project = await this.requireProject(projectId);
    const companyId = await this.resolveProjectCompanyId(project, actorId);
    await this.assertUserBelongsToCompany(dto.userId, companyId);

    const accessStartDate = new Date(dto.accessStartDate);
    const accessEndDate = dto.accessEndDate ? new Date(dto.accessEndDate) : null;

    const assignment = await this.projectAccessService.upsertTeamAssignment({
      userId: dto.userId,
      projectId,
      teamRole: dto.teamRole,
      accessStartDate,
      accessEndDate,
      actorId,
    });

    if (dto.teamRole === ProjectTeamRole.ProjectManager) {
      await this.projectModel
        .findByIdAndUpdate(projectId, {
          projectManager: new Types.ObjectId(dto.userId),
          updatedBy: new Types.ObjectId(actorId),
        })
        .exec();
    }

    if (dto.teamRole === ProjectTeamRole.Director) {
      const already = project.assignedDirectors.some(
        (id) => String(id) === dto.userId,
      );
      if (!already) {
        await this.projectModel
          .findByIdAndUpdate(projectId, {
            $addToSet: { assignedDirectors: new Types.ObjectId(dto.userId) },
            updatedBy: new Types.ObjectId(actorId),
          })
          .exec();
      }
    }

    let siteAssignment = null;
    if (dto.siteId) {
      const siteRes = await this.siteAccessService.createAssignment(
        {
          userId: dto.userId,
          projectId,
          siteId: dto.siteId,
          projectAssignmentId: String(assignment._id),
          roleInSite: dto.teamRole,
          effectiveFrom: dto.accessStartDate,
          effectiveTo: dto.accessEndDate ?? null,
        },
        String(companyId),
        actorId,
      );
      siteAssignment = siteRes.data;
    }

    this.actorContextService.invalidate(dto.userId);

    return createSuccessResponse(
      {
        assignment: {
          id: String(assignment._id),
          userId: String(assignment.userId),
          projectId,
          teamRole: assignment.teamRole ?? null,
          accessStartDate: assignment.accessStartDate,
          accessEndDate: assignment.accessEndDate ?? null,
          status: assignment.status,
        },
        siteAssignment,
      },
      'Team member assigned successfully',
    );
  }

  async revokeTeam(
    projectId: string,
    assignmentId: string,
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, projectId, 'update');
    await this.requireProject(projectId);

    const assignment =
      await this.projectAccessService.revokeTeamAssignment(
        assignmentId,
        actorId,
      );
    if (String(assignment.projectId) !== projectId) {
      throw new BadRequestException(
        'Assignment does not belong to this project',
      );
    }

    this.actorContextService.invalidate(String(assignment.userId));

    return createSuccessResponse(
      {
        id: String(assignment._id),
        status: assignment.status,
      },
      'Team assignment revoked successfully',
    );
  }

  async getById(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'read');
    const project = await this.requireProject(id);
    return createSuccessResponse(toPublicProject(project), 'Project fetched successfully');
  }

  async list(query: ListProjectsQueryDto, actorId: string) {
    const companyId = await this.resolveAuthenticatedCompanyId(actorId);
    this.assertRequestedCompanyMatches(query.companyId, companyId);
    const access = await this.projectAccessService.listAccessibleProjectIds(actorId);
    const filter: FilterQuery<Project> = {
      companyId: { $in: [companyId, null] },
    };

    if (!access.globalAccess) {
      if (access.projectIds.length === 0) {
        return createSuccessResponse(
          [],
          'Projects fetched successfully',
          buildPaginationMeta(query.page ?? 1, query.limit ?? 20, 0),
        );
      }
      filter._id = {
        $in: access.projectIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (query.status) filter.status = query.status;
    if (query.projectType) filter.projectType = query.projectType;
    if (query.projectStage) filter.projectStage = query.projectStage;
    if (query.projectManagerId) {
      filter.projectManager = new Types.ObjectId(query.projectManagerId);
    }
    if (query.directorId) {
      filter.assignedDirectors = new Types.ObjectId(query.directorId);
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { projectCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = ALLOWED_SORT.has(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicProject(item)),
      'Projects fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async addDocument(
    id: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: ProjectDocumentCategory;
      description?: string | null;
    },
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, id, 'update');
    await this.requireProject(id);

    const category = input.category ?? ProjectDocumentCategory.General;
    const prior = await this.documentModel
      .findOne({
        projectId: new Types.ObjectId(id),
        category,
        fileName: input.fileName,
      })
      .sort({ version: -1 })
      .lean()
      .exec();
    const version = prior?.version ? Number(prior.version) + 1 : 1;

    const doc = await this.documentModel.create({
      projectId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category,
      version,
      description: input.description?.trim() ?? null,
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    const publicDocument = this.toPublicDocument(doc);
    await this.auditProjectMutation(AuditAction.UPDATE, actorId, id, null, {
      operation: 'document_uploaded',
      documentId: publicDocument.id,
      fileName: publicDocument.fileName,
      mimeType: publicDocument.mimeType,
      sizeBytes: publicDocument.sizeBytes,
      category: publicDocument.category,
      version: publicDocument.version,
    });

    return createSuccessResponse(
      publicDocument,
      'Project document uploaded successfully',
    );
  }

  async listDocuments(
    id: string,
    actorId: string,
    query: { page?: number; limit?: number; category?: ProjectDocumentCategory },
  ) {
    await this.assertCanAccess(actorId, id, 'read');
    await this.requireProject(id);

    const filter: FilterQuery<ProjectFile> = { projectId: new Types.ObjectId(id) };
    if (query.category) filter.category = query.category;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicDocument(item)),
      'Project documents fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private mergeSettings(
    current: Project['settings'] | null | undefined,
    dto: ProjectSettingsDto,
  ) {
    const base = current ?? defaultProjectSettings();
    return {
      dprEnabled: dto.dprEnabled ?? base.dprEnabled,
      labourEnabled: dto.labourEnabled ?? base.labourEnabled,
      inventoryEnabled: dto.inventoryEnabled ?? base.inventoryEnabled,
      inventoryCostingMethod:
        dto.inventoryCostingMethod ??
        base.inventoryCostingMethod ??
        'weighted_average',
      equipmentEnabled: dto.equipmentEnabled ?? base.equipmentEnabled,
      procurementEnabled: dto.procurementEnabled ?? base.procurementEnabled,
      pettyCashEnabled: dto.pettyCashEnabled ?? base.pettyCashEnabled,
      boqEnabled: dto.boqEnabled ?? base.boqEnabled,
      billingEnabled: dto.billingEnabled ?? base.billingEnabled,
      customerBookingEnabled:
        dto.customerBookingEnabled ?? base.customerBookingEnabled,
    };
  }

  private mergeFinancialConfig(
    current: Project['financialConfig'] | null | undefined,
    dto: ProjectFinancialConfigDto,
  ) {
    const base = current ?? defaultProjectFinancialConfig();
    return {
      costCentreCodes: dto.costCentreCodes ?? base.costCentreCodes ?? [],
      profitCentreCode:
        dto.profitCentreCode !== undefined
          ? dto.profitCentreCode?.trim() ?? null
          : base.profitCentreCode,
      defaultGstPercent:
        dto.defaultGstPercent !== undefined
          ? dto.defaultGstPercent
          : base.defaultGstPercent,
      defaultCurrency:
        dto.defaultCurrency !== undefined
          ? dto.defaultCurrency?.trim() ?? null
          : base.defaultCurrency,
      taxNotes:
        dto.taxNotes !== undefined
          ? dto.taxNotes?.trim() ?? null
          : base.taxNotes,
      budgetCategories: dto.budgetCategories ?? base.budgetCategories ?? [],
    };
  }

  private async assertCanAccess(
    userId: string,
    projectId: string,
    operation: 'read' | 'update' | 'create' | 'approve',
  ) {
    try {
      await this.projectAccessService.assertCanAccessProject(
        userId,
        projectId,
        operation,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw error;
    }
  }

  private async requireProject(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async findUserCompany(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const user = await this.userModel
      .findById(userId)
      .select('_id companyId')
      .lean()
      .exec();
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
    return user;
  }

  private projectCreatorId(project: Project): string | null {
    const createdBy = (
      project as Project & { createdBy?: Types.ObjectId | null }
    ).createdBy;
    return createdBy ? String(createdBy) : null;
  }

  private async assertUserBelongsToCompany(
    userId: string,
    companyId: Types.ObjectId,
  ) {
    const user = await this.findUserCompany(userId);
    if (!user.companyId) {
      throw new ForbiddenException(
        'Project assignees must belong to the authenticated company',
      );
    }
    if (String(user.companyId) !== String(companyId)) {
      throw new ForbiddenException(
        'Project assignees must belong to the authenticated company',
      );
    }
  }

  private async assertUsersBelongToCompany(
    userIds: string[],
    companyId: Types.ObjectId,
  ) {
    const unique = [...new Set(userIds)];
    for (const id of unique) {
      await this.assertUserBelongsToCompany(id, companyId);
    }
  }

  private async resolveAuthenticatedCompanyId(
    actorId: string,
  ): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(actorId)) {
      throw new ForbiddenException('Authenticated company could not be resolved');
    }

    const actor = await this.userModel
      .findById(actorId)
      .select('_id companyId')
      .lean()
      .exec();
    if (!actor) {
      throw new ForbiddenException('Authenticated company could not be resolved');
    }

    const companyId = actor.companyId
      ? new Types.ObjectId(String(actor.companyId))
      : await this.resolvePrimaryCompanyId();
    const company = await this.companyModel
      .findById(companyId)
      .select('_id')
      .lean()
      .exec();
    if (!company) {
      throw new ForbiddenException('Authenticated company could not be resolved');
    }

    return new Types.ObjectId(String(company._id));
  }

  private async resolvePrimaryCompanyId(): Promise<Types.ObjectId> {
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    if (!primary?._id) {
      throw new ForbiddenException('Authenticated company could not be resolved');
    }
    return new Types.ObjectId(String(primary._id));
  }

  private assertRequestedCompanyMatches(
    requestedCompanyId: string | null | undefined,
    actorCompanyId: Types.ObjectId,
  ): void {
    if (requestedCompanyId == null) {
      return;
    }
    if (!Types.ObjectId.isValid(requestedCompanyId)) {
      throw new BadRequestException('Invalid company id');
    }
    if (!new Types.ObjectId(requestedCompanyId).equals(actorCompanyId)) {
      throw new ForbiddenException(
        'Projects can only be created for the authenticated company',
      );
    }
  }

  private async resolveProjectCompanyId(
    project: Project,
    actorId: string,
  ): Promise<Types.ObjectId> {
    return project.companyId
      ? new Types.ObjectId(String(project.companyId))
      : this.resolveAuthenticatedCompanyId(actorId);
  }

  private async auditProjectMutation(
    action: AuditAction,
    actorId: string,
    projectId: string,
    beforeData: unknown,
    afterData: unknown,
  ): Promise<void> {
    try {
      await this.auditLogService.record({
        userId: actorId,
        action,
        module: 'project',
        entityType: 'project',
        entityId: projectId,
        projectId,
        beforeData,
        afterData,
      });
    } catch (error) {
      this.logger.error(
        `Failed to audit project ${projectId} (${action})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toReraEmbed(dto?: ReraDetailsDto | null): ReraDetailsEmbed {
    if (!dto) {
      return this.emptyRera();
    }
    return {
      reraNumber: dto.reraNumber?.trim().toUpperCase() ?? null,
      registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      authority: dto.authority?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
    };
  }

  private mergeReraEmbed(
    current: ReraDetailsEmbed | null | undefined,
    dto: ReraDetailsDto,
  ): ReraDetailsEmbed {
    const existing = current ?? this.emptyRera();
    return {
      reraNumber:
        dto.reraNumber !== undefined
          ? dto.reraNumber?.trim().toUpperCase() ?? null
          : existing.reraNumber,
      registrationDate:
        dto.registrationDate !== undefined
          ? dto.registrationDate
            ? new Date(dto.registrationDate)
            : null
          : existing.registrationDate,
      validUntil:
        dto.validUntil !== undefined
          ? dto.validUntil
            ? new Date(dto.validUntil)
            : null
          : existing.validUntil,
      authority:
        dto.authority !== undefined
          ? dto.authority?.trim() ?? null
          : existing.authority,
      notes:
        dto.notes !== undefined
          ? dto.notes?.trim() ?? null
          : existing.notes,
    };
  }

  private emptyRera(): ReraDetailsEmbed {
    return {
      reraNumber: null,
      registrationDate: null,
      validUntil: null,
      authority: null,
      notes: null,
    };
  }

  private toPublicDocument(doc: {
    _id: Types.ObjectId;
    projectId: Types.ObjectId;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    sizeBytes: number;
    category: ProjectDocumentCategory;
    version?: number;
    description?: string | null;
    uploadedBy?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicProjectDocument {
    return {
      id: String(doc._id),
      projectId: String(doc.projectId),
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType ?? null,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      version: doc.version ?? 1,
      description: doc.description ?? null,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
