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
import { ProjectAccessService } from '../project-access/project-access.service';
import { User } from '../users/schemas/user.schema';
import type { AssignDirectorsDto } from './dto/assign-directors.dto';
import type { AssignProjectManagerDto } from './dto/assign-project-manager.dto';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsQueryDto } from './dto/list-projects-query.dto';
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
import {
  ProjectDocumentCategory,
  ProjectFile,
} from './schemas/project-document.schema';
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
      status: dto.status ?? ProjectStatus.Planning,
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

    // Grant project access to creator and project manager
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

    if (
      dto.status === ProjectStatus.Closed ||
      dto.status === ProjectStatus.Cancelled
    ) {
      // close requires project.close permission — checked at controller when status is Closed
    }

    const update: Record<string, unknown> = {
      status: dto.status,
      updatedBy: new Types.ObjectId(actorId),
    };

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
      // Legacy null-company rows remain visible only within the actor's
      // resolved primary-company context; another company's rows never do.
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

    const doc = await this.documentModel.create({
      projectId: new Types.ObjectId(id),
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? ProjectDocumentCategory.General,
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
    // Assignees must carry an explicit company membership. Primary-company
    // fallback applies only to the authenticated actor, never to assignees.
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
      // Mutations already committed; audit outages must not false-fail the API.
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
      description: doc.description ?? null,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
