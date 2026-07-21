import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { ActorContextService } from '../project-access/actor-context.service';
import { PermissionsService } from '../rbac/permissions.service';
import type {
  CreateSiteAssignmentDto,
  ListSiteAssignmentsQueryDto,
} from './dto/site-access.dto';
import { toPublicSiteAssignment } from './sites.mapper';
import { SitesService } from './sites.service';
import {
  SiteAssignment,
  SiteAssignmentStatus,
} from './schemas/site-assignment.schema';
import { Site, SiteStatus } from './schemas/site.schema';

@Injectable()
export class SiteAccessService {
  constructor(
    @InjectModel(SiteAssignment.name)
    private readonly assignmentModel: Model<SiteAssignment>,
    @InjectModel(Site.name)
    private readonly siteModel: Model<Site>,
    private readonly sitesService: SitesService,
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => ActorContextService))
    private readonly actorContextService: ActorContextService,
  ) {}

  isAssignmentEffective(
    assignment: {
      status: SiteAssignmentStatus;
      effectiveFrom: Date;
      effectiveTo?: Date | null;
    },
    at: Date = new Date(),
  ): boolean {
    if (assignment.status !== SiteAssignmentStatus.Active) {
      return false;
    }
    if (assignment.effectiveFrom.getTime() > at.getTime()) {
      return false;
    }
    if (
      assignment.effectiveTo &&
      assignment.effectiveTo.getTime() < at.getTime()
    ) {
      return false;
    }
    return true;
  }

  /**
   * Site scope policy (vertical slice):
   * - If user has ANY active site assignment for a project, checks require
   *   membership in authorisedSiteIds for that project.
   * - If user has project access but ZERO site assignments for that project,
   *   treat as project-wide (all sites) for backward compatibility.
   */
  async listAuthorisedSiteIds(
    userId: string,
    projectId?: string,
    at: Date = new Date(),
  ): Promise<{
    siteScoped: boolean;
    siteIds: string[];
  }> {
    if (!Types.ObjectId.isValid(userId)) {
      return { siteScoped: false, siteIds: [] };
    }

    const filter: FilterQuery<SiteAssignment> = {
      userId: new Types.ObjectId(userId),
      status: SiteAssignmentStatus.Active,
    };
    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        return { siteScoped: false, siteIds: [] };
      }
      filter.projectId = new Types.ObjectId(projectId);
    }

    const assignments = await this.assignmentModel.find(filter).lean().exec();
    const siteIds = new Set<string>();
    for (const assignment of assignments) {
      if (!this.isAssignmentEffective(assignment, at)) continue;
      siteIds.add(String(assignment.siteId));
    }

    return {
      siteScoped: siteIds.size > 0,
      siteIds: [...siteIds],
    };
  }

  async assertSiteAccess(
    userId: string,
    projectId: string,
    siteId: string,
  ): Promise<void> {
    const rbac = await this.permissionsService.resolveUserAccess(userId);
    if (rbac.bypassPermissions) {
      return;
    }

    const scope = await this.listAuthorisedSiteIds(userId, projectId);
    if (!scope.siteScoped) {
      // No site assignments for this project → project-wide access (compat).
      return;
    }

    if (!scope.siteIds.includes(siteId)) {
      throw new ForbiddenException('Site access denied');
    }
  }

  /**
   * When request carries a siteId and the actor is site-scoped for the
   * project, assert membership. No-op when not site-scoped.
   */
  async assertSiteAccessIfScoped(input: {
    userId: string;
    projectId: string | null | undefined;
    siteId: string | null | undefined;
  }): Promise<void> {
    if (!input.siteId || !input.projectId) {
      return;
    }
    if (
      !Types.ObjectId.isValid(input.siteId) ||
      !Types.ObjectId.isValid(input.projectId)
    ) {
      throw new BadRequestException('Invalid site or project context');
    }
    await this.assertSiteAccess(input.userId, input.projectId, input.siteId);
  }

  async createAssignment(
    dto: CreateSiteAssignmentDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const site = await this.sitesService.findById(dto.siteId);
    if (!site || String(site.companyId) !== companyId) {
      throw new NotFoundException('Site not found');
    }
    if (String(site.projectId) !== dto.projectId) {
      throw new BadRequestException('siteId does not belong to projectId');
    }
    if (site.status !== SiteStatus.Active) {
      throw new BadRequestException('Site is not active');
    }

    const effectiveFrom = dto.effectiveFrom
      ? new Date(dto.effectiveFrom)
      : new Date();
    const effectiveTo =
      dto.effectiveTo === undefined || dto.effectiveTo === null
        ? null
        : new Date(dto.effectiveTo);

    if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
      throw new BadRequestException(
        'effectiveTo must be on or after effectiveFrom',
      );
    }

    try {
      const created = await this.assignmentModel.create({
        companyId: new Types.ObjectId(companyId),
        userId: new Types.ObjectId(dto.userId),
        employeeId: dto.employeeId
          ? new Types.ObjectId(dto.employeeId)
          : null,
        projectId: new Types.ObjectId(dto.projectId),
        siteId: new Types.ObjectId(dto.siteId),
        projectAssignmentId: dto.projectAssignmentId
          ? new Types.ObjectId(dto.projectAssignmentId)
          : null,
        roleInSite: dto.roleInSite?.trim() ?? null,
        effectiveFrom,
        effectiveTo,
        status: SiteAssignmentStatus.Active,
        isDefault: Boolean(dto.isDefault),
        assignedBy: actorId ? new Types.ObjectId(actorId) : null,
        notes: dto.notes?.trim() ?? null,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });

      this.actorContextService.invalidate(dto.userId);

      return createSuccessResponse(
        toPublicSiteAssignment(created),
        'Site assignment created',
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          'An active site assignment already exists for this user/site',
        );
      }
      throw error;
    }
  }

  async revoke(id: string, companyId: string, actorId?: string) {
    const row = await this.requireAssignment(id, companyId);
    row.status = SiteAssignmentStatus.Inactive;
    row.effectiveTo = new Date();
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    this.actorContextService.invalidate(String(row.userId));
    return createSuccessResponse(
      toPublicSiteAssignment(row),
      'Site assignment revoked',
    );
  }

  async activate(id: string, companyId: string, actorId?: string) {
    const row = await this.requireAssignment(id, companyId);
    row.status = SiteAssignmentStatus.Active;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    this.actorContextService.invalidate(String(row.userId));
    return createSuccessResponse(
      toPublicSiteAssignment(row),
      'Site assignment activated',
    );
  }

  async deactivate(id: string, companyId: string, actorId?: string) {
    return this.revoke(id, companyId, actorId);
  }

  async list(query: ListSiteAssignmentsQueryDto, companyId: string) {
    this.requireCompany(companyId);
    const filter: FilterQuery<SiteAssignment> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.status) filter.status = query.status;

    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 50;

    const [items, total] = await Promise.all([
      this.assignmentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.assignmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicSiteAssignment(item)),
      'Site assignments fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Sites the authenticated actor may work in.
   * Bypass / global project access → all active sites in company (optionally filtered by project).
   * Otherwise → assigned sites only (or all project sites when not site-scoped).
   */
  async listAuthorisedSitesForActor(input: {
    userId: string;
    companyId: string;
    projectId?: string;
    globalAccess?: boolean;
    bypassPermissions?: boolean;
  }) {
    this.requireCompany(input.companyId);

    if (input.bypassPermissions || input.globalAccess) {
      const filter: FilterQuery<Site> = {
        companyId: new Types.ObjectId(input.companyId),
        status: SiteStatus.Active,
      };
      if (input.projectId) {
        filter.projectId = new Types.ObjectId(input.projectId);
      }
      const sites = await this.siteModel.find(filter).sort({ siteCode: 1 }).exec();
      return createSuccessResponse(
        sites.map((site) => ({
          id: String(site._id),
          projectId: String(site.projectId),
          siteCode: site.siteCode,
          siteName: site.siteName,
        })),
        'Authorised sites fetched',
      );
    }

    const scope = await this.listAuthorisedSiteIds(
      input.userId,
      input.projectId,
    );

    if (!scope.siteScoped && input.projectId) {
      const ids = await this.sitesService.listActiveIdsForProject(
        input.companyId,
        input.projectId,
      );
      const sites = await this.siteModel
        .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
        .sort({ siteCode: 1 })
        .exec();
      return createSuccessResponse(
        sites.map((site) => ({
          id: String(site._id),
          projectId: String(site.projectId),
          siteCode: site.siteCode,
          siteName: site.siteName,
        })),
        'Authorised sites fetched',
      );
    }

    const sites = await this.siteModel
      .find({
        _id: { $in: scope.siteIds.map((id) => new Types.ObjectId(id)) },
        status: SiteStatus.Active,
      })
      .sort({ siteCode: 1 })
      .exec();

    return createSuccessResponse(
      sites.map((site) => ({
        id: String(site._id),
        projectId: String(site.projectId),
        siteCode: site.siteCode,
        siteName: site.siteName,
      })),
      'Authorised sites fetched',
    );
  }

  private async requireAssignment(id: string, companyId: string) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Site assignment not found');
    }
    const row = await this.assignmentModel.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Site assignment not found');
    }
    return row;
  }

  private requireCompany(
    companyId: string | null | undefined,
  ): asserts companyId is string {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new ForbiddenException('Authenticated company context required');
    }
  }
}
