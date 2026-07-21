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
  CreateSiteSafetyDto,
  InvestigateSiteSafetyDto,
  ListSiteSafetyQueryDto,
  PpeChecklistItemDto,
  SafetyAttendeeDto,
  UpdateSiteSafetyDto,
} from './dto/site-safety.dto';
import { toPublicSiteSafety } from './site-safety.mapper';
import {
  SiteSafety,
  SiteSafetySeverity,
  SiteSafetyStatus,
  SiteSafetyType,
} from './schemas/site-safety.schema';

@Injectable()
export class SiteSafetyService {
  constructor(
    @InjectModel(SiteSafety.name)
    private readonly model: Model<SiteSafety>,
  ) {}

  async create(dto: CreateSiteSafetyDto, actorId: string) {
    this.validateTypePayload(dto.type, dto.ppeChecklist, dto.attendees);

    const row = await this.model.create({
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      dprId: dto.dprId ? new Types.ObjectId(dto.dprId) : null,
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? '',
      severity: dto.severity ?? SiteSafetySeverity.Medium,
      status: SiteSafetyStatus.Open,
      ppeChecklist:
        dto.type === SiteSafetyType.Ppe
          ? this.mapPpeChecklist(dto.ppeChecklist)
          : null,
      attendees: this.mapAttendees(dto.attendees),
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      investigationNotes: null,
      createdBy: new Types.ObjectId(actorId),
      closedBy: null,
      closedAt: null,
    });

    return createSuccessResponse(
      toPublicSiteSafety(row),
      'Site safety record created',
    );
  }

  async update(id: string, dto: UpdateSiteSafetyDto) {
    const row = await this.requireRow(id);
    if (row.status === SiteSafetyStatus.Closed) {
      throw new BadRequestException('Closed safety records cannot be updated');
    }

    if (dto.siteId !== undefined) {
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    }
    if (dto.dprId !== undefined) {
      row.dprId = dto.dprId ? new Types.ObjectId(dto.dprId) : null;
    }
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.description !== undefined) {
      row.description = dto.description.trim();
    }
    if (dto.severity !== undefined) row.severity = dto.severity;
    if (dto.ppeChecklist !== undefined) {
      if (row.type !== SiteSafetyType.Ppe) {
        throw new BadRequestException(
          'ppeChecklist is only valid for PPE records',
        );
      }
      row.ppeChecklist = this.mapPpeChecklist(dto.ppeChecklist) as never;
    }
    if (dto.attendees !== undefined) {
      row.attendees = this.mapAttendees(dto.attendees) as never;
    }
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (pid) => new Types.ObjectId(pid),
      );
    }
    if (dto.investigationNotes !== undefined) {
      row.investigationNotes = dto.investigationNotes?.trim() ?? null;
    }

    await row.save();
    return createSuccessResponse(
      toPublicSiteSafety(row),
      'Site safety record updated',
    );
  }

  async investigate(id: string, dto: InvestigateSiteSafetyDto) {
    const row = await this.requireRow(id);
    if (row.status === SiteSafetyStatus.Closed) {
      throw new BadRequestException(
        'Closed safety records cannot enter investigation',
      );
    }
    if (dto.investigationNotes !== undefined) {
      row.investigationNotes = dto.investigationNotes?.trim() ?? null;
    }
    row.status = SiteSafetyStatus.Investigating;
    await row.save();

    return createSuccessResponse(
      toPublicSiteSafety(row),
      'Site safety investigation started',
    );
  }

  async close(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status === SiteSafetyStatus.Closed) {
      throw new BadRequestException('Safety record is already closed');
    }
    row.status = SiteSafetyStatus.Closed;
    row.closedBy = new Types.ObjectId(actorId);
    row.closedAt = new Date();
    await row.save();

    return createSuccessResponse(
      toPublicSiteSafety(row),
      'Site safety record closed',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicSiteSafety(row),
      'Site safety record fetched',
    );
  }

  async list(query: ListSiteSafetyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SiteSafety> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;

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
      items.map((row) => toPublicSiteSafety(row)),
      'Site safety records fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private validateTypePayload(
    type: SiteSafetyType,
    ppeChecklist?: PpeChecklistItemDto[] | null,
    attendees?: SafetyAttendeeDto[],
  ) {
    if (type === SiteSafetyType.Ppe && (!ppeChecklist || ppeChecklist.length === 0)) {
      throw new BadRequestException(
        'PPE records require at least one ppeChecklist item',
      );
    }
    if (
      type === SiteSafetyType.ToolboxTalk &&
      (!attendees || attendees.length === 0)
    ) {
      throw new BadRequestException(
        'Toolbox talk records require at least one attendee',
      );
    }
  }

  private mapPpeChecklist(items?: PpeChecklistItemDto[] | null) {
    return (items ?? []).map((item) => ({
      item: item.item.trim(),
      compliant: item.compliant ?? false,
      notes: item.notes?.trim() ?? null,
    }));
  }

  private mapAttendees(items?: SafetyAttendeeDto[]) {
    return (items ?? []).map((a) => ({
      userId: a.userId ? new Types.ObjectId(a.userId) : null,
      name: a.name.trim(),
      role: a.role?.trim() ?? null,
    }));
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid site safety id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Site safety record not found');
    return row;
  }
}
