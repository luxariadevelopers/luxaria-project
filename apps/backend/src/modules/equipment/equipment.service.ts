import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Project } from '../projects/schemas/project.schema';
import type {
  CreateEquipmentAllocationDto,
  CreateEquipmentBreakdownLogDto,
  CreateEquipmentDto,
  CreateEquipmentFuelLogDto,
  CreateEquipmentMaintenanceLogDto,
  CreateEquipmentUtilizationDto,
  ListEquipmentQueryDto,
  ListEquipmentUtilizationQueryDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import {
  EquipmentUtilization,
} from './schemas/equipment-utilization.schema';
import {
  Equipment,
  EquipmentStatus,
} from './schemas/equipment.schema';

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    @InjectModel(Equipment.name)
    private readonly equipmentModel: Model<Equipment>,
    @InjectModel(EquipmentUtilization.name)
    private readonly utilizationModel: Model<EquipmentUtilization>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async create(dto: CreateEquipmentDto, actorId: string) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.equipmentModel
      .findOne({
        projectId: new Types.ObjectId(dto.projectId),
        code,
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Equipment code ${code} already exists on this project`,
      );
    }

    const row = await this.equipmentModel.create({
      projectId: new Types.ObjectId(dto.projectId),
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : null,
      code,
      name: dto.name.trim(),
      type: dto.type?.trim() ?? null,
      category: dto.category?.trim() ?? null,
      ownership: dto.ownership,
      status: dto.status ?? EquipmentStatus.Available,
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      notes: dto.notes?.trim() ?? null,
      allocations: [],
      fuelLogs: [],
      maintenanceLogs: [],
      breakdownLogs: [],
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(this.toPublic(row), 'Equipment created');
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const row = await this.requireEquipment(id);

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase();
      const clash = await this.equipmentModel
        .findOne({
          projectId: row.projectId,
          code,
          _id: { $ne: row._id },
        })
        .exec();
      if (clash) {
        throw new ConflictException(
          `Equipment code ${code} already exists on this project`,
        );
      }
      row.code = code;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.type !== undefined) row.type = dto.type?.trim() ?? null;
    if (dto.category !== undefined) row.category = dto.category?.trim() ?? null;
    if (dto.ownership !== undefined) row.ownership = dto.ownership;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.siteId !== undefined) {
      row.siteId = dto.siteId ? new Types.ObjectId(dto.siteId) : null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;
    if (dto.companyId !== undefined) {
      row.companyId = dto.companyId
        ? new Types.ObjectId(dto.companyId)
        : null;
    }

    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Equipment updated');
  }

  async getById(id: string) {
    const row = await this.requireEquipment(id);
    return createSuccessResponse(this.toPublic(row), 'Equipment fetched');
  }

  async list(query: ListEquipmentQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Equipment> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) filter.status = query.status;
    if (query.ownership) filter.ownership = query.ownership;
    if (query.siteId) filter.siteId = new Types.ObjectId(query.siteId);
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { code: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      ];
    }

    const sort: Record<string, SortOrder> = { code: 1 };
    const [items, total] = await Promise.all([
      this.equipmentModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.equipmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => this.toPublic(row)),
      'Equipment list fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async remove(id: string, actorId: string) {
    const row = await this.requireEquipment(id);
    if (row.status === EquipmentStatus.Allocated) {
      throw new BadRequestException(
        'Cannot delete allocated equipment — retire or free it first',
      );
    }
    await row.softDelete(new Types.ObjectId(actorId));
    return createSuccessResponse({ id }, 'Equipment deleted');
  }

  async addAllocation(
    id: string,
    dto: CreateEquipmentAllocationDto,
    actorId: string,
  ) {
    const row = await this.requireEquipment(id);
    if (row.status === EquipmentStatus.Retired) {
      throw new BadRequestException('Retired equipment cannot be allocated');
    }

    const entry = {
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      fromDate: new Date(dto.fromDate),
      toDate: dto.toDate ? new Date(dto.toDate) : null,
      notes: dto.notes?.trim() ?? null,
      recordedBy: new Types.ObjectId(actorId),
      recordedAt: new Date(),
    };
    row.allocations.push(entry as never);
    row.siteId = entry.siteId;
    row.status = EquipmentStatus.Allocated;
    await row.save();

    return createSuccessResponse(this.toPublic(row), 'Allocation recorded');
  }

  async addFuelLog(
    id: string,
    dto: CreateEquipmentFuelLogDto,
    actorId: string,
  ) {
    const row = await this.requireEquipment(id);
    row.fuelLogs.push({
      date: new Date(dto.date),
      quantity: dto.quantity,
      cost: dto.cost ?? null,
      notes: dto.notes?.trim() ?? null,
      recordedBy: new Types.ObjectId(actorId),
      recordedAt: new Date(),
    } as never);
    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Fuel log recorded');
  }

  async addMaintenanceLog(
    id: string,
    dto: CreateEquipmentMaintenanceLogDto,
    actorId: string,
  ) {
    const row = await this.requireEquipment(id);
    row.maintenanceLogs.push({
      date: new Date(dto.date),
      description: dto.description.trim(),
      cost: dto.cost ?? null,
      vendor: dto.vendor?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      recordedBy: new Types.ObjectId(actorId),
      recordedAt: new Date(),
    } as never);
    if (row.status !== EquipmentStatus.Retired) {
      row.status = EquipmentStatus.Maintenance;
    }
    await row.save();
    return createSuccessResponse(
      this.toPublic(row),
      'Maintenance log recorded',
    );
  }

  async addBreakdownLog(
    id: string,
    dto: CreateEquipmentBreakdownLogDto,
    actorId: string,
  ) {
    const row = await this.requireEquipment(id);
    row.breakdownLogs.push({
      date: new Date(dto.date),
      description: dto.description.trim(),
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null,
      resolution: dto.resolution?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
      recordedBy: new Types.ObjectId(actorId),
      recordedAt: new Date(),
    } as never);
    if (row.status !== EquipmentStatus.Retired) {
      row.status = dto.resolvedAt
        ? EquipmentStatus.Available
        : EquipmentStatus.Breakdown;
    }
    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Breakdown log recorded');
  }

  /**
   * Soft check: if project.settings.equipmentEnabled is false, reject creation.
   * Does not hard-disable the module globally — only gates utilization writes.
   */
  async createUtilization(dto: CreateEquipmentUtilizationDto, actorId: string) {
    await this.assertEquipmentEnabled(dto.projectId);

    const equipment = await this.requireEquipment(dto.equipmentId);
    if (String(equipment.projectId) !== dto.projectId) {
      throw new BadRequestException(
        'Equipment does not belong to the given project',
      );
    }
    if (equipment.status === EquipmentStatus.Retired) {
      throw new BadRequestException(
        'Cannot record utilization for retired equipment',
      );
    }

    const row = await this.utilizationModel.create({
      equipmentId: new Types.ObjectId(dto.equipmentId),
      projectId: new Types.ObjectId(dto.projectId),
      siteId: dto.siteId ? new Types.ObjectId(dto.siteId) : null,
      dprId: dto.dprId ? new Types.ObjectId(dto.dprId) : null,
      date: new Date(dto.date),
      hoursWorked: dto.hoursWorked,
      hoursIdle: dto.hoursIdle,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toUtilizationPublic(row),
      'Utilization recorded',
    );
  }

  async listUtilization(query: ListEquipmentUtilizationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<EquipmentUtilization> = {};

    if (query.dprId) filter.dprId = new Types.ObjectId(query.dprId);
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.equipmentId) {
      filter.equipmentId = new Types.ObjectId(query.equipmentId);
    }

    const sort: Record<string, SortOrder> = { date: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.utilizationModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.utilizationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => this.toUtilizationPublic(row)),
      'Utilization list fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /** Exposed for unit tests / soft feature-flag check. */
  async assertEquipmentEnabled(projectId: string): Promise<void> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const enabled =
      (project as { settings?: { equipmentEnabled?: boolean } }).settings
        ?.equipmentEnabled ?? false;
    if (!enabled) {
      this.logger.warn(
        `Utilization blocked: equipmentEnabled=false for project ${projectId}`,
      );
      throw new BadRequestException(
        'Equipment is not enabled for this project (settings.equipmentEnabled)',
      );
    }
  }

  private async requireEquipment(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid equipment id');
    }
    const row = await this.equipmentModel.findById(id).exec();
    if (!row) throw new NotFoundException('Equipment not found');
    return row;
  }

  private toPublic(
    row: Equipment & {
      _id?: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    return {
      id: String(row._id),
      projectId: String(row.projectId),
      companyId: row.companyId ? String(row.companyId) : null,
      code: row.code,
      name: row.name,
      type: row.type ?? null,
      category: row.category ?? null,
      ownership: row.ownership,
      status: row.status,
      siteId: row.siteId ? String(row.siteId) : null,
      notes: row.notes ?? null,
      allocations: (row.allocations ?? []).map((a) => ({
        id: String(a._id),
        projectId: String(a.projectId),
        siteId: a.siteId ? String(a.siteId) : null,
        fromDate: a.fromDate,
        toDate: a.toDate,
        notes: a.notes ?? null,
        recordedBy: a.recordedBy ? String(a.recordedBy) : null,
        recordedAt: a.recordedAt,
      })),
      fuelLogs: (row.fuelLogs ?? []).map((f) => ({
        id: String(f._id),
        date: f.date,
        quantity: f.quantity,
        cost: f.cost ?? null,
        notes: f.notes ?? null,
        recordedBy: f.recordedBy ? String(f.recordedBy) : null,
        recordedAt: f.recordedAt,
      })),
      maintenanceLogs: (row.maintenanceLogs ?? []).map((m) => ({
        id: String(m._id),
        date: m.date,
        description: m.description,
        cost: m.cost ?? null,
        vendor: m.vendor ?? null,
        notes: m.notes ?? null,
        recordedBy: m.recordedBy ? String(m.recordedBy) : null,
        recordedAt: m.recordedAt,
      })),
      breakdownLogs: (row.breakdownLogs ?? []).map((b) => ({
        id: String(b._id),
        date: b.date,
        description: b.description,
        resolvedAt: b.resolvedAt,
        resolution: b.resolution ?? null,
        notes: b.notes ?? null,
        recordedBy: b.recordedBy ? String(b.recordedBy) : null,
        recordedAt: b.recordedAt,
      })),
      createdBy: String(row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toUtilizationPublic(
    row: EquipmentUtilization & {
      _id?: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    return {
      id: String(row._id),
      equipmentId: String(row.equipmentId),
      projectId: String(row.projectId),
      siteId: row.siteId ? String(row.siteId) : null,
      dprId: row.dprId ? String(row.dprId) : null,
      date: row.date,
      hoursWorked: row.hoursWorked,
      hoursIdle: row.hoursIdle,
      notes: row.notes ?? null,
      createdBy: String(row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
