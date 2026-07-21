import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { SiteAccessService } from '../sites/site-access.service';
import type {
  AssignSiteIssueDto,
  CreateSiteIssueDto,
  ListSiteIssuesQueryDto,
  UpdateSiteIssueDto,
} from './dto/site-issue.dto';
import { toPublicSiteIssue } from './site-issues.mapper';
import {
  SiteIssue,
  SiteIssueSeverity,
  SiteIssueStatus,
} from './schemas/site-issue.schema';

@Injectable()
export class SiteIssuesService {
  constructor(
    @InjectModel(SiteIssue.name)
    private readonly issueModel: Model<SiteIssue>,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(dto: CreateSiteIssueDto, actorId: string) {
    await this.assertSiteAccess(actorId, dto.projectId, dto.siteId);

    const issueNumber = await this.nextIssueNumber(dto.projectId);
    const row = await this.issueModel.create({
      issueNumber,
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      dprId: dto.dprId ? new Types.ObjectId(dto.dprId) : null,
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      status: SiteIssueStatus.Open,
      assigneeUserId: null,
      severity: dto.severity ?? SiteIssueSeverity.Medium,
      resolvedAt: null,
      closedAt: null,
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicSiteIssue(row),
      'Site issue created',
    );
  }

  async update(id: string, dto: UpdateSiteIssueDto, actorId: string) {
    const row = await this.requireIssue(id);
    if (
      row.status === SiteIssueStatus.Resolved ||
      row.status === SiteIssueStatus.Closed
    ) {
      throw new BadRequestException(
        'Resolved or closed issues cannot be updated',
      );
    }

    if (dto.siteId !== undefined) {
      await this.assertSiteAccess(
        actorId,
        String(row.projectId),
        dto.siteId,
      );
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    }
    if (dto.dprId !== undefined) {
      row.dprId = dto.dprId ? new Types.ObjectId(dto.dprId) : null;
    }
    if (dto.type !== undefined) row.type = dto.type;
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    if (dto.severity !== undefined) row.severity = dto.severity;
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (docId) => new Types.ObjectId(docId),
      );
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicSiteIssue(row), 'Site issue updated');
  }

  async assign(id: string, dto: AssignSiteIssueDto, actorId: string) {
    const row = await this.requireIssue(id);
    if (
      row.status !== SiteIssueStatus.Open &&
      row.status !== SiteIssueStatus.Assigned
    ) {
      throw new BadRequestException(
        'Only open or assigned issues can be (re)assigned',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.assigneeUserId = new Types.ObjectId(dto.assigneeUserId);
    row.status = SiteIssueStatus.Assigned;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicSiteIssue(row), 'Site issue assigned');
  }

  async resolve(id: string, actorId: string) {
    const row = await this.requireIssue(id);
    if (
      row.status !== SiteIssueStatus.Open &&
      row.status !== SiteIssueStatus.Assigned
    ) {
      throw new BadRequestException(
        'Only open or assigned issues can be resolved',
      );
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = SiteIssueStatus.Resolved;
    row.resolvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicSiteIssue(row), 'Site issue resolved');
  }

  async close(id: string, actorId: string) {
    const row = await this.requireIssue(id);
    if (row.status !== SiteIssueStatus.Resolved) {
      throw new BadRequestException('Only resolved issues can be closed');
    }
    await this.assertSiteAccess(
      actorId,
      String(row.projectId),
      row.siteId ? String(row.siteId) : null,
    );

    row.status = SiteIssueStatus.Closed;
    row.closedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicSiteIssue(row), 'Site issue closed');
  }

  async getById(id: string) {
    const row = await this.requireIssue(id);
    return createSuccessResponse(toPublicSiteIssue(row), 'Site issue fetched');
  }

  async list(query: ListSiteIssuesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SiteIssue> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.severity) filter.severity = query.severity;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.issueModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.issueModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicSiteIssue(row)),
      'Site issues fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async nextIssueNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.issueModel
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `ISS-${year}-${seq}`;
  }

  private async assertSiteAccess(
    userId: string,
    projectId: string,
    siteId?: string | null,
  ) {
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId,
      projectId,
      siteId: siteId ?? null,
    });
  }

  private async requireIssue(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site issue id');
    }
    const row = await this.issueModel.findById(id).exec();
    if (!row) throw new NotFoundException('Site issue not found');
    return row;
  }
}
