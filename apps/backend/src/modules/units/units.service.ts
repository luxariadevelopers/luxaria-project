import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import type {
  ChangeUnitStatusDto,
  CreateUnitDto,
  ListUnitsQueryDto,
  UpdateUnitDto,
} from './dto/unit.dto';
import { toPublicUnit } from './units.mapper';
import {
  assertCanClaimUnit,
  assertNonNegative,
  assertStatusTransition,
  isOccupiedStatus,
  normalizeUnitLabel,
  roundArea,
  roundMoney,
} from './units.validation';
import { Unit, UnitStatus } from './schemas/unit.schema';

/** Prior statuses allowed when atomically claiming into a sale status. */
const CLAIM_FROM: Partial<Record<UnitStatus, UnitStatus[]>> = {
  [UnitStatus.Held]: [UnitStatus.Available],
  [UnitStatus.Reserved]: [UnitStatus.Available, UnitStatus.Held],
  [UnitStatus.Booked]: [
    UnitStatus.Available,
    UnitStatus.Held,
    UnitStatus.Reserved,
  ],
  [UnitStatus.AgreementExecuted]: [UnitStatus.Booked],
  [UnitStatus.Registered]: [UnitStatus.AgreementExecuted],
};

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name)
    private readonly unitModel: Model<Unit>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
  ) {}

  async create(dto: CreateUnitDto, actorId: string) {
    await this.requireProject(dto.projectId);

    const block = normalizeUnitLabel(dto.block, 'block');
    const floor = normalizeUnitLabel(dto.floor, 'floor');
    const unitNumber = normalizeUnitLabel(dto.unitNumber, 'unitNumber');

    assertNonNegative(dto.carpetArea, 'carpetArea');
    assertNonNegative(dto.builtUpArea, 'builtUpArea');
    assertNonNegative(dto.uds, 'uds');
    assertNonNegative(dto.basePrice, 'basePrice');
    assertNonNegative(dto.additionalCharges ?? 0, 'additionalCharges');
    assertNonNegative(dto.tax ?? 0, 'tax');

    const status = dto.status ?? UnitStatus.Available;
    if (status !== UnitStatus.Available && status !== UnitStatus.Blocked) {
      throw new BadRequestException(
        'New units may only be created as available or blocked',
      );
    }

    await this.assertUniqueUnitNumber(
      dto.projectId,
      block,
      unitNumber,
    );

    try {
      const row = await this.unitModel.create({
        projectId: new Types.ObjectId(dto.projectId),
        block,
        floor,
        unitNumber,
        unitType: dto.unitType,
        carpetArea: roundArea(dto.carpetArea),
        builtUpArea: roundArea(dto.builtUpArea),
        uds: roundArea(dto.uds),
        facing: dto.facing ?? null,
        parking: dto.parking?.trim() || null,
        basePrice: roundMoney(dto.basePrice),
        additionalCharges: roundMoney(dto.additionalCharges ?? 0),
        tax: roundMoney(dto.tax ?? 0),
        status,
        bookingRefId: null,
        notes: dto.notes?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(toPublicUnit(row), 'Unit created');
    } catch (error) {
      this.rethrowDuplicate(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateUnitDto, actorId: string) {
    const row = await this.requireUnit(id);

    if (isOccupiedStatus(row.status) && row.status !== UnitStatus.Held) {
      const identityChange =
        dto.block !== undefined ||
        dto.floor !== undefined ||
        dto.unitNumber !== undefined;
      if (identityChange) {
        throw new BadRequestException(
          `Cannot change block/floor/unitNumber while unit is ${row.status}`,
        );
      }
    }

    const nextBlock =
      dto.block !== undefined
        ? normalizeUnitLabel(dto.block, 'block')
        : row.block;
    const nextFloor =
      dto.floor !== undefined
        ? normalizeUnitLabel(dto.floor, 'floor')
        : row.floor;
    const nextUnitNumber =
      dto.unitNumber !== undefined
        ? normalizeUnitLabel(dto.unitNumber, 'unitNumber')
        : row.unitNumber;

    if (
      nextBlock !== row.block ||
      nextUnitNumber !== row.unitNumber
    ) {
      await this.assertUniqueUnitNumber(
        String(row.projectId),
        nextBlock,
        nextUnitNumber,
        String(row._id),
      );
    }

    if (dto.carpetArea !== undefined) {
      assertNonNegative(dto.carpetArea, 'carpetArea');
      row.carpetArea = roundArea(dto.carpetArea);
    }
    if (dto.builtUpArea !== undefined) {
      assertNonNegative(dto.builtUpArea, 'builtUpArea');
      row.builtUpArea = roundArea(dto.builtUpArea);
    }
    if (dto.uds !== undefined) {
      assertNonNegative(dto.uds, 'uds');
      row.uds = roundArea(dto.uds);
    }
    if (dto.basePrice !== undefined) {
      assertNonNegative(dto.basePrice, 'basePrice');
      row.basePrice = roundMoney(dto.basePrice);
    }
    if (dto.additionalCharges !== undefined) {
      assertNonNegative(dto.additionalCharges, 'additionalCharges');
      row.additionalCharges = roundMoney(dto.additionalCharges);
    }
    if (dto.tax !== undefined) {
      assertNonNegative(dto.tax, 'tax');
      row.tax = roundMoney(dto.tax);
    }
    if (dto.unitType !== undefined) row.unitType = dto.unitType;
    if (dto.facing !== undefined) row.facing = dto.facing;
    if (dto.parking !== undefined) {
      row.parking = dto.parking?.trim() || null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;

    row.block = nextBlock;
    row.floor = nextFloor;
    row.unitNumber = nextUnitNumber;
    row.set('updatedBy', new Types.ObjectId(actorId));

    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicate(error);
      throw error;
    }

    return createSuccessResponse(toPublicUnit(row), 'Unit updated');
  }

  /**
   * Status change with atomic claim for sale statuses (prevents double booking).
   */
  async changeStatus(id: string, dto: ChangeUnitStatusDto, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Unit not found');
    }

    const current = await this.requireUnit(id);
    const nextStatus = dto.status;
    assertStatusTransition(current.status, nextStatus);
    assertCanClaimUnit(current.status, nextStatus);

    const bookingRefId =
      dto.bookingRefId === undefined
        ? current.bookingRefId
        : dto.bookingRefId
          ? new Types.ObjectId(dto.bookingRefId)
          : null;

    const fromStatuses = CLAIM_FROM[nextStatus];
    if (fromStatuses?.length) {
      const updated = await this.unitModel
        .findOneAndUpdate(
          {
            _id: new Types.ObjectId(id),
            status: { $in: fromStatuses },
            isDeleted: false,
          },
          {
            $set: {
              status: nextStatus,
              bookingRefId,
              notes:
                dto.notes !== undefined
                  ? dto.notes?.trim() || null
                  : current.notes,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
          { new: true },
        )
        .exec();

      if (!updated) {
        const latest = await this.unitModel.findById(id).lean().exec();
        throw new ConflictException(
          `Unit ${latest?.unitNumber ?? id} cannot be set to ${nextStatus}; current status is ${latest?.status ?? 'unknown'} (double booking prevented)`,
        );
      }

      return createSuccessResponse(
        toPublicUnit(updated),
        `Unit status changed to ${nextStatus}`,
      );
    }

    current.status = nextStatus;
    current.bookingRefId = bookingRefId;
    if (dto.notes !== undefined) {
      current.notes = dto.notes?.trim() || null;
    }
    if (
      nextStatus === UnitStatus.Available ||
      nextStatus === UnitStatus.Cancelled
    ) {
      current.bookingRefId = null;
    }
    current.set('updatedBy', new Types.ObjectId(actorId));
    await current.save();

    return createSuccessResponse(
      toPublicUnit(current),
      `Unit status changed to ${nextStatus}`,
    );
  }

  async getById(id: string) {
    const row = await this.requireUnit(id);
    return createSuccessResponse(toPublicUnit(row), 'Unit retrieved');
  }

  async list(query: ListUnitsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<Unit> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.block?.trim()) {
      filter.block = normalizeUnitLabel(query.block, 'block');
    }
    if (query.floor?.trim()) {
      filter.floor = normalizeUnitLabel(query.floor, 'floor');
    }
    if (query.status) filter.status = query.status;
    if (query.unitType) filter.unitType = query.unitType;
    if (query.search?.trim()) {
      const term = query.search.trim();
      filter.$or = [
        { unitNumber: new RegExp(term, 'i') },
        { block: new RegExp(term, 'i') },
        { floor: new RegExp(term, 'i') },
      ];
    }

    const sortField = query.sortBy ?? 'unitNumber';
    const sortOrder: SortOrder = query.sortOrder === 'desc' ? -1 : 1;

    const [rows, total] = await Promise.all([
      this.unitModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.unitModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((row) => toPublicUnit(row)),
      'Units listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async softDelete(id: string, actorId: string) {
    const row = await this.requireUnit(id);
    if (isOccupiedStatus(row.status)) {
      throw new BadRequestException(
        `Cannot delete unit while status is ${row.status}`,
      );
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.softDelete(new Types.ObjectId(actorId));

    return createSuccessResponse(
      { id: String(row._id) },
      'Unit deleted',
    );
  }

  private async assertUniqueUnitNumber(
    projectId: string,
    block: string,
    unitNumber: string,
    excludeId?: string,
  ) {
    const filter: FilterQuery<Unit> = {
      projectId: new Types.ObjectId(projectId),
      block,
      unitNumber,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.unitModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        `Unit number ${unitNumber} already exists in project block ${block}`,
      );
    }
  }

  private rethrowDuplicate(error: unknown): void {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(
        'Unit number must be unique within the project and block',
      );
    }
  }

  private async requireUnit(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Unit not found');
    }
    const row = await this.unitModel.findById(id).exec();
    if (!row) throw new NotFoundException('Unit not found');
    return row;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new NotFoundException('Project not found');
    if (
      project.status === ProjectStatus.Cancelled ||
      project.status === ProjectStatus.Closed
    ) {
      throw new BadRequestException(
        `Project is ${project.status}; units cannot be managed`,
      );
    }
    return project;
  }
}
