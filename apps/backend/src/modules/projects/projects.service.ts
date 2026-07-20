import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
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
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectFile.name) private readonly documentModel: Model<ProjectFile>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly numberingService: NumberingService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(dto: CreateProjectDto, actorId: string) {
    assertCoordinates(dto.latitude, dto.longitude);
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const expectedCompletionDate = dto.expectedCompletionDate
      ? new Date(dto.expectedCompletionDate)
      : null;
    assertValidProjectDates({ startDate, expectedCompletionDate });

    if (dto.projectManager) {
      await this.assertUserExists(dto.projectManager);
    }
    if (dto.assignedDirectors?.length) {
      await this.assertUsersExist(dto.assignedDirectors);
    }

    const companyId = await this.resolveCompanyId(dto.companyId);
    const projectCode = await this.numberingService.nextCode(NumberEntityType.PROJECT);

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
      reraDetails: this.toReraEmbed(dto.reraDetails),
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

    return createSuccessResponse(toPublicProject(project), 'Project created successfully');
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
      update.reraDetails = {
        ...this.emptyRera(),
        ...project.reraDetails,
        ...this.toReraEmbed(dto.reraDetails),
      };
    }

    const updated = await this.projectModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(toPublicProject(updated!), 'Project updated successfully');
  }

  async assignProjectManager(
    id: string,
    dto: AssignProjectManagerDto,
    actorId: string,
  ) {
    await this.assertCanAccess(actorId, id, 'update');
    await this.requireProject(id);
    await this.assertUserExists(dto.projectManagerId);

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

    return createSuccessResponse(
      toPublicProject(updated!),
      'Project manager assigned successfully',
    );
  }

  async assignDirectors(id: string, dto: AssignDirectorsDto, actorId: string) {
    await this.assertCanAccess(actorId, id, 'update');
    await this.requireProject(id);
    await this.assertUsersExist(dto.directorIds);

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

    return createSuccessResponse(
      toPublicProject(updated!),
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

    return createSuccessResponse(
      toPublicProject(updated!),
      'Project status updated successfully',
    );
  }

  async getById(id: string, actorId: string) {
    await this.assertCanAccess(actorId, id, 'read');
    const project = await this.requireProject(id);
    return createSuccessResponse(toPublicProject(project), 'Project fetched successfully');
  }

  async list(query: ListProjectsQueryDto, actorId: string) {
    const access = await this.projectAccessService.listAccessibleProjectIds(actorId);
    const filter: FilterQuery<Project> = {};

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
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
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

    return createSuccessResponse(
      this.toPublicDocument(doc),
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

  private async assertUserExists(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const user = await this.userModel.findById(userId).select('_id').lean().exec();
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
  }

  private async assertUsersExist(userIds: string[]) {
    const unique = [...new Set(userIds)];
    for (const id of unique) {
      await this.assertUserExists(id);
    }
  }

  private async resolveCompanyId(
    companyId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid company id');
      }
      const company = await this.companyModel.findById(companyId).select('_id').lean().exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company._id as Types.ObjectId;
    }

    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    return primary?._id ? (primary._id as Types.ObjectId) : null;
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
