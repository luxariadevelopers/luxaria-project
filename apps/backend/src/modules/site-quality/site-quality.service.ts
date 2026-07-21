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
import type {
  CreateSiteQualityDto,
  ListSiteQualityQueryDto,
  PunchItemDto,
  RaiseNcrDto,
  RecordRectificationDto,
  SetPunchListDto,
  UpdateSiteQualityDto,
} from './dto/site-quality.dto';
import { toPublicSiteQuality } from './site-quality.mapper';
import {
  PunchItemStatus,
  SiteQuality,
  SiteQualityStatus,
} from './schemas/site-quality.schema';

const WORKFLOW_ORDER: SiteQualityStatus[] = [
  SiteQualityStatus.Inspection,
  SiteQualityStatus.Ncr,
  SiteQualityStatus.PunchList,
  SiteQualityStatus.Rectification,
  SiteQualityStatus.ReInspection,
  SiteQualityStatus.Closed,
];

@Injectable()
export class SiteQualityService {
  constructor(
    @InjectModel(SiteQuality.name)
    private readonly model: Model<SiteQuality>,
  ) {}

  async create(dto: CreateSiteQualityDto, actorId: string) {
    const row = await this.model.create({
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      dprId: dto.dprId ? new Types.ObjectId(dto.dprId) : null,
      boqItemId: dto.boqItemId ? new Types.ObjectId(dto.boqItemId) : null,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      status: SiteQualityStatus.Inspection,
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      findings: dto.findings?.trim() ?? null,
      ncrNumber: null,
      punchItems: this.mapPunchItems(dto.punchItems),
      rectificationNotes: null,
      reinspectedAt: null,
      createdBy: new Types.ObjectId(actorId),
      closedBy: null,
      closedAt: null,
    });

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Site quality inspection created',
    );
  }

  async update(id: string, dto: UpdateSiteQualityDto) {
    const row = await this.requireRow(id);
    if (
      row.status === SiteQualityStatus.Closed ||
      row.status === SiteQualityStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Closed or cancelled quality records cannot be updated',
      );
    }

    if (dto.siteId !== undefined) {
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    }
    if (dto.dprId !== undefined) {
      row.dprId = dto.dprId ? new Types.ObjectId(dto.dprId) : null;
    }
    if (dto.boqItemId !== undefined) {
      row.boqItemId = dto.boqItemId
        ? new Types.ObjectId(dto.boqItemId)
        : null;
    }
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) {
      row.description = dto.description.trim();
    }
    if (dto.findings !== undefined) {
      row.findings = dto.findings?.trim() ?? null;
    }
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (pid) => new Types.ObjectId(pid),
      );
    }
    if (dto.punchItems !== undefined) {
      row.punchItems = this.mapPunchItems(dto.punchItems) as never;
    }
    if (dto.rectificationNotes !== undefined) {
      row.rectificationNotes = dto.rectificationNotes?.trim() ?? null;
    }

    await row.save();
    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Site quality record updated',
    );
  }

  async raiseNcr(id: string, dto: RaiseNcrDto) {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, SiteQualityStatus.Ncr);

    if (dto.findings !== undefined) {
      row.findings = dto.findings?.trim() ?? row.findings;
    }
    if (!row.ncrNumber) {
      row.ncrNumber = await this.nextNcrNumber(row.projectId);
    }
    row.status = SiteQualityStatus.Ncr;
    await row.save();

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'NCR raised',
    );
  }

  async setPunchList(id: string, dto: SetPunchListDto) {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, SiteQualityStatus.PunchList);

    row.punchItems = this.mapPunchItems(dto.punchItems) as never;
    row.status = SiteQualityStatus.PunchList;
    await row.save();

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Punch list set',
    );
  }

  async recordRectification(id: string, dto: RecordRectificationDto) {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, SiteQualityStatus.Rectification);

    row.rectificationNotes = dto.rectificationNotes.trim();
    row.status = SiteQualityStatus.Rectification;
    await row.save();

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Rectification recorded',
    );
  }

  async reinspect(id: string) {
    const row = await this.requireRow(id);
    this.assertTransition(row.status, SiteQualityStatus.ReInspection);

    row.reinspectedAt = new Date();
    row.status = SiteQualityStatus.ReInspection;
    await row.save();

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Re-inspection recorded',
    );
  }

  async close(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status !== SiteQualityStatus.ReInspection &&
      row.status !== SiteQualityStatus.Inspection
    ) {
      throw new BadRequestException(
        'Only inspection (pass) or re-inspection records can be closed',
      );
    }

    row.status = SiteQualityStatus.Closed;
    row.closedBy = new Types.ObjectId(actorId);
    row.closedAt = new Date();
    await row.save();

    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Site quality record closed',
    );
  }

  async cancel(id: string) {
    const row = await this.requireRow(id);
    if (row.status === SiteQualityStatus.Closed) {
      throw new BadRequestException('Closed records cannot be cancelled');
    }
    row.status = SiteQualityStatus.Cancelled;
    await row.save();
    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Site quality record cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicSiteQuality(row),
      'Site quality record fetched',
    );
  }

  async list(query: ListSiteQualityQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SiteQuality> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { createdAt: -1 };
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicSiteQuality(row)),
      'Site quality records fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private assertTransition(
    current: SiteQualityStatus,
    next: SiteQualityStatus,
  ) {
    if (
      current === SiteQualityStatus.Closed ||
      current === SiteQualityStatus.Cancelled
    ) {
      throw new BadRequestException(
        `Cannot move from ${current} to ${next}`,
      );
    }
    const currentIdx = WORKFLOW_ORDER.indexOf(current);
    const nextIdx = WORKFLOW_ORDER.indexOf(next);
    if (currentIdx < 0 || nextIdx < 0 || nextIdx !== currentIdx + 1) {
      throw new BadRequestException(
        `Invalid workflow transition: ${current} → ${next}`,
      );
    }
  }

  private mapPunchItems(items?: PunchItemDto[]) {
    return (items ?? []).map((item) => ({
      description: item.description.trim(),
      status: item.status ?? PunchItemStatus.Open,
      location: item.location?.trim() ?? null,
      assignedTo: item.assignedTo
        ? new Types.ObjectId(item.assignedTo)
        : null,
      dueDate: item.dueDate ? new Date(item.dueDate) : null,
      completedAt:
        item.status === PunchItemStatus.Done ? new Date() : null,
    }));
  }

  private async nextNcrNumber(projectId: Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({
        projectId,
        ncrNumber: { $type: 'string' },
      })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(4, '0');
    return `NCR-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site quality id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Site quality record not found');
    return row;
  }
}
