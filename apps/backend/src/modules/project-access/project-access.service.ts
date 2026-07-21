import {
  BadRequestException,
  ConflictException,
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
import { Company } from '../company/schemas/company.schema';
import { Project } from '../projects/schemas/project.schema';
import { PermissionsService } from '../rbac/permissions.service';
import { User } from '../users/schemas/user.schema';
import type { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import type { ListProjectAssignmentsQueryDto } from './dto/list-project-assignments-query.dto';
import type { UpdateProjectAssignmentDto } from './dto/update-project-assignment.dto';
import { toPublicAssignment } from './project-access.mapper';
import {
  ProjectAccessStatus,
  ProjectAssignment,
  ProjectTeamRole,
} from './schemas/project-assignment.schema';
import type { ProjectAccessOperation } from './schemas/unauthorized-project-access.schema';
import { UnauthorizedProjectAccess } from './schemas/unauthorized-project-access.schema';

export type ProjectAccessDecision = {
  allowed: boolean;
  reason: string;
  globalAccess: boolean;
  bypassPermissions: boolean;
};

export type AuditAccessContext = {
  path?: string | null;
  method?: string | null;
  requestId?: string | null;
  ip?: string | null;
};

/** Canonical access decision input (R-003). */
export type AssertCanAccessProjectInput = {
  actor: { id: string } | string;
  projectId: string;
  action?: ProjectAccessOperation | string;
  resourceType?: string | null;
  resourceId?: string | null;
  /** Optional expected company for cross-check against Project.companyId. */
  companyId?: string | null;
  audit?: AuditAccessContext;
};

@Injectable()
export class ProjectAccessService {
  private readonly logger = new Logger(ProjectAccessService.name);

  constructor(
    @InjectModel(ProjectAssignment.name)
    private readonly assignmentModel: Model<ProjectAssignment>,
    @InjectModel(UnauthorizedProjectAccess.name)
    private readonly unauthorizedModel: Model<UnauthorizedProjectAccess>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly permissionsService: PermissionsService,
  ) {}

  /**
   * Effective assignment: active status, within start/end window.
   * End date before now is treated as expired (deny), even if status not yet flipped.
   */
  isAssignmentEffective(
    assignment: {
      status: ProjectAccessStatus;
      accessStartDate: Date;
      accessEndDate?: Date | null;
    },
    at: Date = new Date(),
  ): boolean {
    if (assignment.status !== ProjectAccessStatus.Active) {
      return false;
    }
    if (assignment.accessStartDate.getTime() > at.getTime()) {
      return false;
    }
    if (
      assignment.accessEndDate &&
      assignment.accessEndDate.getTime() < at.getTime()
    ) {
      return false;
    }
    return true;
  }

  async resolveAccess(
    userId: string,
    projectId: string,
    at: Date = new Date(),
  ): Promise<ProjectAccessDecision> {
    if (!Types.ObjectId.isValid(userId)) {
      return {
        allowed: false,
        reason: 'Invalid user id',
        globalAccess: false,
        bypassPermissions: false,
      };
    }
    if (!Types.ObjectId.isValid(projectId)) {
      return {
        allowed: false,
        reason: 'Invalid project id',
        globalAccess: false,
        bypassPermissions: false,
      };
    }

    const rbac = await this.permissionsService.resolveUserAccess(userId);
    if (rbac.bypassPermissions) {
      return {
        allowed: true,
        reason: 'Super Admin permission bypass',
        globalAccess: true,
        bypassPermissions: true,
      };
    }

    const assignments = await this.assignmentModel
      .find({
        userId: new Types.ObjectId(userId),
        status: ProjectAccessStatus.Active,
      })
      .lean()
      .exec();

    for (const assignment of assignments) {
      if (!this.isAssignmentEffective(assignment, at)) {
        continue;
      }
      if (assignment.globalAccess) {
        return {
          allowed: true,
          reason: 'Global project access assignment',
          globalAccess: true,
          bypassPermissions: false,
        };
      }
      if (assignment.projectId && String(assignment.projectId) === projectId) {
        return {
          allowed: true,
          reason: 'Assigned project access',
          globalAccess: false,
          bypassPermissions: false,
        };
      }
    }

    const hadExpiredMatch = assignments.some(
      (assignment) =>
        !assignment.globalAccess &&
        assignment.projectId &&
        String(assignment.projectId) === projectId &&
        assignment.status === ProjectAccessStatus.Active &&
        assignment.accessEndDate &&
        assignment.accessEndDate.getTime() < at.getTime(),
    );

    return {
      allowed: false,
      reason: hadExpiredMatch
        ? 'Project assignment expired'
        : 'No active project assignment',
      globalAccess: false,
      bypassPermissions: false,
    };
  }

  /**
   * Canonical project-access assertion.
   * Overloads preserve legacy `(userId, projectId, operation, audit)` callers.
   */
  async assertCanAccessProject(
    input: AssertCanAccessProjectInput,
  ): Promise<ProjectAccessDecision>;
  async assertCanAccessProject(
    userId: string,
    projectId: string,
    operation?: ProjectAccessOperation | string,
    audit?: AuditAccessContext,
  ): Promise<ProjectAccessDecision>;
  async assertCanAccessProject(
    inputOrUserId: AssertCanAccessProjectInput | string,
    projectId?: string,
    operation: ProjectAccessOperation | string = 'read',
    audit?: AuditAccessContext,
  ): Promise<ProjectAccessDecision> {
    const input: AssertCanAccessProjectInput =
      typeof inputOrUserId === 'string'
        ? {
            actor: inputOrUserId,
            projectId: projectId!,
            action: operation,
            audit,
          }
        : inputOrUserId;

    const userId =
      typeof input.actor === 'string' ? input.actor : input.actor.id;
    const action = input.action ?? 'read';

    // Tenant boundary: project must belong to the actor's company.
    const companyDecision = await this.assertProjectCompanyBoundary(
      userId,
      input.projectId,
      input.companyId,
    );
    if (!companyDecision.allowed) {
      await this.recordUnauthorizedAttempt({
        userId,
        projectId: input.projectId,
        operation: action,
        reason: [
          companyDecision.reason,
          input.resourceType ? `resourceType=${input.resourceType}` : null,
          input.resourceId ? `resourceId=${input.resourceId}` : null,
        ]
          .filter(Boolean)
          .join('; '),
        ...input.audit,
      });
      throw new ForbiddenException('Access denied');
    }

    const decision = await this.resolveAccess(userId, input.projectId);

    if (!decision.allowed) {
      await this.recordUnauthorizedAttempt({
        userId,
        projectId: input.projectId,
        operation: action,
        reason: [
          decision.reason,
          input.resourceType ? `resourceType=${input.resourceType}` : null,
          input.resourceId ? `resourceId=${input.resourceId}` : null,
        ]
          .filter(Boolean)
          .join('; '),
        ...input.audit,
      });
      throw new ForbiddenException('Access denied');
    }

    return decision;
  }

  /**
   * Resolve actor company (user.companyId or primary) and ensure the project
   * belongs to that company. Super Admin bypass still cannot cross companies
   * unless the project has no companyId (legacy single-tenant rows).
   */
  async resolveActorCompanyId(userId: string): Promise<string | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    const user = await this.userModel
      .findById(userId)
      .select('companyId')
      .lean()
      .exec();
    if (user?.companyId) {
      return String(user.companyId);
    }
    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    return primary ? String(primary._id) : null;
  }

  async assertProjectCompanyBoundary(
    userId: string,
    projectId: string,
    expectedCompanyId?: string | null,
  ): Promise<ProjectAccessDecision> {
    if (!Types.ObjectId.isValid(projectId)) {
      return {
        allowed: false,
        reason: 'Invalid project id',
        globalAccess: false,
        bypassPermissions: false,
      };
    }

    const project = await this.projectModel
      .findById(projectId)
      .select('_id companyId')
      .lean()
      .exec();
    if (!project) {
      return {
        allowed: false,
        reason: 'Project not found',
        globalAccess: false,
        bypassPermissions: false,
      };
    }

    const actorCompanyId =
      expectedCompanyId ?? (await this.resolveActorCompanyId(userId));
    if (!actorCompanyId) {
      return {
        allowed: false,
        reason: 'Actor company not resolved',
        globalAccess: false,
        bypassPermissions: false,
      };
    }

    // Legacy rows with null companyId are treated as primary-company owned.
    const projectCompanyId = project.companyId
      ? String(project.companyId)
      : actorCompanyId;

    if (projectCompanyId !== actorCompanyId) {
      return {
        allowed: false,
        reason: 'Project belongs to a different company',
        globalAccess: false,
        bypassPermissions: false,
      };
    }

    return {
      allowed: true,
      reason: 'Company boundary satisfied',
      globalAccess: false,
      bypassPermissions: false,
    };
  }

  /**
   * Assert every projectId in a list (reports / multi-project exports).
   */
  async assertCanAccessProjects(
    userId: string,
    projectIds: string[],
    operation: ProjectAccessOperation | string = 'read',
    audit?: AuditAccessContext,
  ): Promise<void> {
    const unique = [...new Set(projectIds.filter(Boolean))];
    for (const projectId of unique) {
      await this.assertCanAccessProject(userId, projectId, operation, audit);
    }
  }

  /**
   * Mongo filter fragment for authorised projects.
   * Callers with globalAccess receive `{}` (no project restriction).
   * Callers with no projects receive an impossible match.
   */
  async buildAuthorisedProjectFilter(
    userId: string,
    field = 'projectId',
  ): Promise<FilterQuery<Record<string, unknown>>> {
    const access = await this.listAccessibleProjectIds(userId);
    if (access.globalAccess) {
      return {};
    }
    if (access.projectIds.length === 0) {
      return { [field]: { $in: [] } };
    }
    return {
      [field]: {
        $in: access.projectIds.map((id) => new Types.ObjectId(id)),
      },
    };
  }

  async hasGlobalAccess(userId: string, at: Date = new Date()): Promise<boolean> {
    const rbac = await this.permissionsService.resolveUserAccess(userId);
    if (rbac.bypassPermissions) {
      return true;
    }

    const global = await this.assignmentModel
      .findOne({
        userId: new Types.ObjectId(userId),
        globalAccess: true,
        status: ProjectAccessStatus.Active,
      })
      .lean()
      .exec();

    return Boolean(global && this.isAssignmentEffective(global, at));
  }

  async listAccessibleProjectIds(userId: string, at: Date = new Date()) {
    const rbac = await this.permissionsService.resolveUserAccess(userId);
    if (rbac.bypassPermissions) {
      return { globalAccess: true as const, projectIds: [] as string[] };
    }

    const assignments = await this.assignmentModel
      .find({
        userId: new Types.ObjectId(userId),
        status: ProjectAccessStatus.Active,
      })
      .lean()
      .exec();

    const projectIds = new Set<string>();
    let globalAccess = false;

    for (const assignment of assignments) {
      if (!this.isAssignmentEffective(assignment, at)) {
        continue;
      }
      if (assignment.globalAccess) {
        globalAccess = true;
        continue;
      }
      if (assignment.projectId) {
        projectIds.add(String(assignment.projectId));
      }
    }

    return { globalAccess, projectIds: [...projectIds] };
  }

  async create(dto: CreateProjectAssignmentDto, actorId?: string) {
    await this.assertUserExists(dto.userId);

    const globalAccess = Boolean(dto.globalAccess);
    if (globalAccess && dto.projectId) {
      throw new BadRequestException('globalAccess assignments must not include projectId');
    }
    if (!globalAccess && !dto.projectId) {
      throw new BadRequestException('projectId is required when globalAccess is false');
    }

    const accessStartDate = new Date(dto.accessStartDate);
    const accessEndDate = dto.accessEndDate ? new Date(dto.accessEndDate) : null;
    this.assertDateWindow(accessStartDate, accessEndDate);

    try {
      const created = await this.assignmentModel.create({
        userId: new Types.ObjectId(dto.userId),
        projectId: globalAccess ? null : new Types.ObjectId(dto.projectId!),
        globalAccess,
        accessStartDate,
        accessEndDate,
        status: ProjectAccessStatus.Active,
        notes: dto.notes?.trim() ?? null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });

      await this.syncUserAssignedProjects(dto.userId);

      return createSuccessResponse(
        toPublicAssignment(created),
        'Project assignment created successfully',
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('An equivalent project assignment already exists');
      }
      throw error;
    }
  }

  /**
   * Merge project assignments for a user (used by Users API).
   * Open-ended active access starting now.
   */
  async assignProjectsToUser(
    userId: string,
    projectIds: string[],
    actorId?: string,
  ) {
    await this.assertUserExists(userId);
    const unique = [...new Set(projectIds)];
    for (const projectId of unique) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException(`Invalid project id: ${projectId}`);
      }
    }

    const now = new Date();
    for (const projectId of unique) {
      const existing = await this.assignmentModel
        .findOne({
          userId: new Types.ObjectId(userId),
          projectId: new Types.ObjectId(projectId),
          globalAccess: false,
        })
        .exec();

      if (existing) {
        const accessStartDate =
          existing.accessStartDate.getTime() > now.getTime()
            ? now
            : existing.accessStartDate;
        const accessEndDate =
          existing.accessEndDate && existing.accessEndDate.getTime() < now.getTime()
            ? null
            : existing.accessEndDate;

        await this.assignmentModel
          .findByIdAndUpdate(existing._id, {
            status: ProjectAccessStatus.Active,
            accessStartDate,
            accessEndDate,
            updatedBy: actorId ? new Types.ObjectId(actorId) : null,
          })
          .exec();
        continue;
      }

      await this.assignmentModel.create({
        userId: new Types.ObjectId(userId),
        projectId: new Types.ObjectId(projectId),
        globalAccess: false,
        accessStartDate: now,
        accessEndDate: null,
        status: ProjectAccessStatus.Active,
        notes: null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
    }

    await this.syncUserAssignedProjects(userId);
  }

  async removeProjectsFromUser(userId: string, projectIds: string[], actorId?: string) {
    await this.assertUserExists(userId);
    const ids = projectIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    await this.assignmentModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          projectId: { $in: ids },
          globalAccess: false,
        },
        {
          status: ProjectAccessStatus.Inactive,
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
      )
      .exec();

    await this.syncUserAssignedProjects(userId);
  }

  async update(id: string, dto: UpdateProjectAssignmentDto, actorId?: string) {
    const assignment = await this.requireAssignment(id);

    const accessStartDate =
      dto.accessStartDate !== undefined
        ? new Date(dto.accessStartDate)
        : assignment.accessStartDate;
    const accessEndDate =
      dto.accessEndDate !== undefined
        ? dto.accessEndDate
          ? new Date(dto.accessEndDate)
          : null
        : assignment.accessEndDate;
    this.assertDateWindow(accessStartDate, accessEndDate);

    const updated = await this.assignmentModel
      .findByIdAndUpdate(
        id,
        {
          accessStartDate,
          accessEndDate,
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes?.trim() ?? null } : {}),
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();

    await this.syncUserAssignedProjects(String(assignment.userId));
    return createSuccessResponse(
      toPublicAssignment(updated!),
      'Project assignment updated successfully',
    );
  }

  async activate(id: string, actorId?: string) {
    return this.update(id, { status: ProjectAccessStatus.Active }, actorId);
  }

  async deactivate(id: string, actorId?: string) {
    return this.update(id, { status: ProjectAccessStatus.Inactive }, actorId);
  }

  async getById(id: string) {
    const assignment = await this.requireAssignment(id);
    return createSuccessResponse(
      toPublicAssignment(assignment),
      'Project assignment fetched successfully',
    );
  }

  async list(query: ListProjectAssignmentsQueryDto) {
    const filter: FilterQuery<ProjectAssignment> = {};
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.assignmentModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.assignmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicAssignment(item)),
      'Project assignments fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listUnauthorizedAttempts(query: {
    page?: number;
    limit?: number;
    userId?: string;
    projectId?: string;
  }) {
    const filter: FilterQuery<UnauthorizedProjectAccess> = {};
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.unauthorizedModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.unauthorizedModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => ({
        id: String(item._id),
        userId: String(item.userId),
        projectId: item.projectId ? String(item.projectId) : null,
        operation: item.operation,
        reason: item.reason,
        path: item.path,
        method: item.method,
        requestId: item.requestId,
        ip: item.ip,
        createdAt: item.createdAt,
      })),
      'Unauthorized project access attempts fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async recordUnauthorizedAttempt(input: {
    userId: string;
    projectId?: string | null;
    operation: ProjectAccessOperation | string;
    reason: string;
    path?: string | null;
    method?: string | null;
    requestId?: string | null;
    ip?: string | null;
  }): Promise<void> {
    try {
      await this.unauthorizedModel.create({
        userId: new Types.ObjectId(input.userId),
        projectId:
          input.projectId && Types.ObjectId.isValid(input.projectId)
            ? new Types.ObjectId(input.projectId)
            : null,
        operation: input.operation,
        reason: input.reason,
        path: input.path ?? null,
        method: input.method ?? null,
        requestId: input.requestId ?? null,
        ip: input.ip ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to audit unauthorized project access: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Upsert a project-scoped assignment with optional teamRole (Phase 2 PLM team API).
   */
  async upsertTeamAssignment(input: {
    userId: string;
    projectId: string;
    teamRole: ProjectTeamRole;
    accessStartDate: Date;
    accessEndDate?: Date | null;
    actorId?: string;
  }) {
    await this.assertUserExists(input.userId);
    if (!Types.ObjectId.isValid(input.projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    this.assertDateWindow(
      input.accessStartDate,
      input.accessEndDate ?? null,
    );

    const existing = await this.assignmentModel
      .findOne({
        userId: new Types.ObjectId(input.userId),
        projectId: new Types.ObjectId(input.projectId),
        globalAccess: false,
      })
      .exec();

    if (existing) {
      const updated = await this.assignmentModel
        .findByIdAndUpdate(
          existing._id,
          {
            status: ProjectAccessStatus.Active,
            teamRole: input.teamRole,
            accessStartDate: input.accessStartDate,
            accessEndDate: input.accessEndDate ?? null,
            updatedBy: input.actorId
              ? new Types.ObjectId(input.actorId)
              : null,
          },
          { new: true },
        )
        .exec();
      await this.syncUserAssignedProjects(input.userId);
      return updated!;
    }

    const created = await this.assignmentModel.create({
      userId: new Types.ObjectId(input.userId),
      projectId: new Types.ObjectId(input.projectId),
      globalAccess: false,
      accessStartDate: input.accessStartDate,
      accessEndDate: input.accessEndDate ?? null,
      status: ProjectAccessStatus.Active,
      teamRole: input.teamRole,
      notes: null,
      createdBy: input.actorId ? new Types.ObjectId(input.actorId) : null,
    });
    await this.syncUserAssignedProjects(input.userId);
    return created;
  }

  async listTeamAssignments(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    return this.assignmentModel
      .find({
        projectId: new Types.ObjectId(projectId),
        globalAccess: false,
        status: ProjectAccessStatus.Active,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async revokeTeamAssignment(assignmentId: string, actorId?: string) {
    const assignment = await this.requireAssignment(assignmentId);
    if (assignment.globalAccess || !assignment.projectId) {
      throw new BadRequestException(
        'Only project-scoped team assignments can be revoked via team API',
      );
    }
    const updated = await this.assignmentModel
      .findByIdAndUpdate(
        assignmentId,
        {
          status: ProjectAccessStatus.Inactive,
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();
    await this.syncUserAssignedProjects(String(assignment.userId));
    return updated!;
  }

  /**
   * Keep User.assignedProjects in sync with effective non-global project assignments.
   * Global access is evaluated from assignment records, not this array.
   */
  async syncUserAssignedProjects(userId: string): Promise<void> {
    const { projectIds } = await this.listAccessibleProjectIds(userId);
    await this.userModel
      .findByIdAndUpdate(userId, {
        assignedProjects: projectIds.map((id) => new Types.ObjectId(id)),
      })
      .exec();
  }

  private assertDateWindow(start: Date, end: Date | null) {
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid accessStartDate');
    }
    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid accessEndDate');
    }
    if (end && end.getTime() < start.getTime()) {
      throw new BadRequestException('accessEndDate must be on or after accessStartDate');
    }
  }

  private async assertUserExists(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    const user = await this.userModel.findById(userId).select('_id').lean().exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async requireAssignment(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid assignment id');
    }
    const assignment = await this.assignmentModel.findById(id).exec();
    if (!assignment) {
      throw new NotFoundException('Project assignment not found');
    }
    return assignment;
  }
}
