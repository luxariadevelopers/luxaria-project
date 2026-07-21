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
import { Unit, UnitStatus } from '../units/schemas/unit.schema';
import { toPublicUnitHandover } from './unit-handovers.mapper';
import type {
  AddSnagDto,
  CloseSnagDto,
  CreateUnitHandoverDto,
  ListUnitHandoverQueryDto,
  ScheduleUnitHandoverDto,
  UpdateUnitHandoverDto,
} from './dto/unit-handover.dto';
import {
  SnagStatus,
  UnitHandover,
  UnitHandoverStatus,
} from './schemas/unit-handover.schema';

function unitStatusHasHandedOver(): boolean {
  return 'HandedOver' in UnitStatus;
}

@Injectable()
export class UnitHandoversService {
  constructor(
    @InjectModel(UnitHandover.name)
    private readonly model: Model<UnitHandover>,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<Unit>,
  ) {}

  async create(dto: CreateUnitHandoverDto, actorId: string) {
    const handoverNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      handoverNumber,
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: new Types.ObjectId(dto.unitId),
      status: UnitHandoverStatus.Draft,
      scheduledAt: null,
      completedAt: null,
      snagList: [],
      keysHandedOver: false,
      meterReadings: (dto.meterReadings ?? []).map((m) => ({
        utility: m.utility.trim(),
        reading: m.reading,
        unit: m.unit?.trim() ?? null,
      })),
      warrantyDocuments: (dto.warrantyDocuments ?? []).map((w) => ({
        title: w.title.trim(),
        filePath: w.filePath.trim(),
      })),
      maintenanceNotes: dto.maintenanceNotes?.trim() ?? null,
      assetRegister: (dto.assetRegister ?? []).map((a) => ({
        name: a.name.trim(),
        serial: a.serial?.trim() ?? null,
        condition: a.condition?.trim() ?? null,
      })),
      customerAcknowledged: false,
      acknowledgedAt: null,
      acknowledgedByName: null,
      photos: (dto.photos ?? []).map((p) => ({
        filePath: p.filePath.trim(),
        caption: p.caption?.trim() ?? null,
        takenAt: p.takenAt ? new Date(p.takenAt) : null,
      })),
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Unit handover created',
    );
  }

  async update(id: string, dto: UpdateUnitHandoverDto, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status === UnitHandoverStatus.Completed ||
      row.status === UnitHandoverStatus.Cancelled
    ) {
      throw new BadRequestException('Completed or cancelled handovers cannot be updated');
    }

    if (dto.meterReadings !== undefined) {
      row.meterReadings = dto.meterReadings.map((m) => ({
        utility: m.utility.trim(),
        reading: m.reading,
        unit: m.unit?.trim() ?? null,
      }));
    }
    if (dto.warrantyDocuments !== undefined) {
      row.warrantyDocuments = dto.warrantyDocuments.map((w) => ({
        title: w.title.trim(),
        filePath: w.filePath.trim(),
      }));
    }
    if (dto.maintenanceNotes !== undefined) {
      row.maintenanceNotes = dto.maintenanceNotes?.trim() ?? null;
    }
    if (dto.assetRegister !== undefined) {
      row.assetRegister = dto.assetRegister.map((a) => ({
        name: a.name.trim(),
        serial: a.serial?.trim() ?? null,
        condition: a.condition?.trim() ?? null,
      }));
    }
    if (dto.photos !== undefined) {
      row.photos = dto.photos.map((p) => ({
        filePath: p.filePath.trim(),
        caption: p.caption?.trim() ?? null,
        takenAt: p.takenAt ? new Date(p.takenAt) : null,
      }));
    }
    if (dto.keysHandedOver !== undefined) {
      row.keysHandedOver = dto.keysHandedOver;
    }
    if (dto.customerAcknowledged !== undefined) {
      row.customerAcknowledged = dto.customerAcknowledged;
    }
    if (dto.acknowledgedAt !== undefined) {
      row.acknowledgedAt = dto.acknowledgedAt
        ? new Date(dto.acknowledgedAt)
        : null;
    }
    if (dto.acknowledgedByName !== undefined) {
      row.acknowledgedByName = dto.acknowledgedByName?.trim() ?? null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Unit handover updated',
    );
  }

  async schedule(id: string, dto: ScheduleUnitHandoverDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitHandoverStatus.Draft) {
      throw new BadRequestException('Only draft handovers can be scheduled');
    }
    row.status = UnitHandoverStatus.Scheduled;
    row.scheduledAt = new Date(dto.scheduledAt);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Handover scheduled',
    );
  }

  async start(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitHandoverStatus.Scheduled) {
      throw new BadRequestException('Only scheduled handovers can be started');
    }
    row.status = UnitHandoverStatus.InProgress;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Handover started',
    );
  }

  async complete(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== UnitHandoverStatus.InProgress) {
      throw new BadRequestException(
        'Only in-progress handovers can be completed',
      );
    }
    if (!row.keysHandedOver) {
      throw new BadRequestException(
        'keysHandedOver must be true before completing',
      );
    }
    if (!row.customerAcknowledged) {
      throw new BadRequestException(
        'customerAcknowledged must be true before completing',
      );
    }

    row.status = UnitHandoverStatus.Completed;
    row.completedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    await this.tryUpdateUnitOnComplete(row);

    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Handover completed',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status === UnitHandoverStatus.Completed ||
      row.status === UnitHandoverStatus.Cancelled
    ) {
      throw new BadRequestException('Handover is already completed or cancelled');
    }
    row.status = UnitHandoverStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Handover cancelled',
    );
  }

  async addSnag(id: string, dto: AddSnagDto, actorId: string) {
    const row = await this.requireRow(id);
    if (
      row.status === UnitHandoverStatus.Completed ||
      row.status === UnitHandoverStatus.Cancelled
    ) {
      throw new BadRequestException('Cannot add snags to a closed handover');
    }

    row.snagList.push({
      description: dto.description.trim(),
      status: SnagStatus.Open,
      closedAt: null,
      notes: dto.notes?.trim() ?? null,
    });

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicUnitHandover(row), 'Snag added');
  }

  async closeSnag(
    id: string,
    snagId: string,
    dto: CloseSnagDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    const snag = row.snagList.find((item) => String(item._id) === snagId);
    if (!snag) throw new NotFoundException('Snag not found');
    if (snag.status === SnagStatus.Closed) {
      throw new BadRequestException('Snag is already closed');
    }

    snag.status = SnagStatus.Closed;
    snag.closedAt = new Date();
    if (dto.notes !== undefined) snag.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicUnitHandover(row), 'Snag closed');
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicUnitHandover(row),
      'Unit handover fetched',
    );
  }

  async list(query: ListUnitHandoverQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<UnitHandover> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

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
      items.map((row) => toPublicUnitHandover(row)),
      'Unit handovers fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async tryUpdateUnitOnComplete(row: UnitHandover) {
    const unit = await this.unitModel.findById(row.unitId).exec();
    if (!unit) return;

    if (unitStatusHasHandedOver()) {
      unit.status = (UnitStatus as Record<string, UnitStatus>).HandedOver;
      await unit.save();
      return;
    }

    const stamp = row.completedAt?.toISOString() ?? new Date().toISOString();
    const note = `[Handover ${row.handoverNumber} completed ${stamp}]`;
    unit.notes = unit.notes ? `${unit.notes}\n${note}` : note;
    await unit.save();
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `HO-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid handover id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Unit handover not found');
    return row;
  }
}
