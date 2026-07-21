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
import { convertToBaseUnit } from '../material-master/materials.validation';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import { normalizeLocation } from '../stock-ledger/stock-ledger.validation';
import type {
  CreateStockReservationDto,
  ListStockReservationsQueryDto,
  ReleaseStockReservationDto,
} from './dto/stock-reservation.dto';
import {
  StockReservation,
  StockReservationStatus,
} from './schemas/stock-reservation.schema';

@Injectable()
export class StockReservationsService {
  constructor(
    @InjectModel(StockReservation.name)
    private readonly reservationModel: Model<StockReservation>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async create(dto: CreateStockReservationDto, actorId: string) {
    const material = await this.requireActiveMaterial(dto.materialId);
    const location = normalizeLocation(dto.location);
    const baseUnitQuantity = convertToBaseUnit(
      dto.quantity,
      dto.unit,
      material.baseUnit,
      material.conversionFactors ?? [],
    );

    const onHand = await this.stockLedgerService.getQuantityInBaseUnit({
      materialId: dto.materialId,
      projectId: dto.projectId,
      location,
    });
    const reserved = await this.getActiveReservedBaseQty({
      projectId: dto.projectId,
      materialId: dto.materialId,
      location,
    });
    const available = onHand - reserved;
    if (baseUnitQuantity > available + 1e-9) {
      throw new BadRequestException(
        `Insufficient available stock to reserve (available ${available}, requested ${baseUnitQuantity})`,
      );
    }

    const reservationNumber = await this.numberingService.nextCode(
      NumberEntityType.STOCK_RESERVATION,
      {
        asOf: new Date(),
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.reservationModel.create({
      reservationNumber,
      projectId: new Types.ObjectId(dto.projectId),
      materialId: material._id,
      location,
      unit: dto.unit,
      quantity: dto.quantity,
      baseUnitQuantity,
      releasedBaseQuantity: 0,
      sourceType: dto.sourceType,
      sourceId: dto.sourceId ?? null,
      status: StockReservationStatus.Active,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      notes: dto.notes ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toPublic(row),
      'Stock reservation created',
    );
  }

  async release(
    id: string,
    actorId: string,
    dto: ReleaseStockReservationDto = {},
  ) {
    const row = await this.requireReservation(id);
    if (row.status !== StockReservationStatus.Active) {
      throw new BadRequestException('Only active reservations can be released');
    }

    const remaining = row.baseUnitQuantity - row.releasedBaseQuantity;
    let releaseBase = remaining;
    if (dto.quantity !== undefined) {
      const material = await this.requireActiveMaterial(String(row.materialId));
      releaseBase = convertToBaseUnit(
        dto.quantity,
        row.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );
    }
    if (releaseBase > remaining + 1e-9) {
      throw new BadRequestException('Release quantity exceeds remaining hold');
    }

    row.releasedBaseQuantity += releaseBase;
    if (row.releasedBaseQuantity + 1e-9 >= row.baseUnitQuantity) {
      row.status = StockReservationStatus.Released;
      row.releasedBy = new Types.ObjectId(actorId);
      row.releasedAt = new Date();
    }
    await row.save();

    return createSuccessResponse(
      this.toPublic(row),
      'Stock reservation released',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireReservation(id);
    if (row.status !== StockReservationStatus.Active) {
      throw new BadRequestException('Only active reservations can be cancelled');
    }
    row.status = StockReservationStatus.Cancelled;
    row.releasedBy = new Types.ObjectId(actorId);
    row.releasedAt = new Date();
    row.releasedBaseQuantity = row.baseUnitQuantity;
    await row.save();
    return createSuccessResponse(
      this.toPublic(row),
      'Stock reservation cancelled',
    );
  }

  /** Mark active reservation as consumed after material issue confirm (DPR approve). */
  async markConsumed(id: string, actorId: string) {
    const row = await this.requireReservation(id);
    if (row.status === StockReservationStatus.Consumed) {
      return createSuccessResponse(this.toPublic(row), 'Already consumed');
    }
    if (row.status !== StockReservationStatus.Active) {
      throw new BadRequestException(
        'Only active reservations can be marked consumed',
      );
    }
    row.status = StockReservationStatus.Consumed;
    row.releasedBaseQuantity = row.baseUnitQuantity;
    row.releasedBy = new Types.ObjectId(actorId);
    row.releasedAt = new Date();
    await row.save();
    return createSuccessResponse(
      this.toPublic(row),
      'Stock reservation marked consumed',
    );
  }

  async listActiveBySource(sourceType: string, sourceId: string) {
    const rows = await this.reservationModel
      .find({
        sourceType,
        sourceId,
        status: StockReservationStatus.Active,
      })
      .exec();
    return rows;
  }

  async getById(id: string) {
    const row = await this.requireReservation(id);
    return createSuccessResponse(
      this.toPublic(row),
      'Stock reservation fetched',
    );
  }

  async list(query: ListStockReservationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<StockReservation> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.materialId) {
      filter.materialId = new Types.ObjectId(query.materialId);
    }
    if (query.status) filter.status = query.status;
    if (query.sourceType) filter.sourceType = query.sourceType;

    const sort: Record<string, SortOrder> = { createdAt: -1 };
    const [items, total] = await Promise.all([
      this.reservationModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reservationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => this.toPublic(row)),
      'Stock reservations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getAvailable(input: {
    projectId: string;
    materialId: string;
    location?: string | null;
  }) {
    const location = normalizeLocation(input.location);
    const onHand = await this.stockLedgerService.getQuantityInBaseUnit({
      materialId: input.materialId,
      projectId: input.projectId,
      location,
    });
    const reserved = await this.getActiveReservedBaseQty({
      projectId: input.projectId,
      materialId: input.materialId,
      location,
    });
    return createSuccessResponse(
      {
        projectId: input.projectId,
        materialId: input.materialId,
        location,
        onHandBaseQty: onHand,
        reservedBaseQty: reserved,
        availableBaseQty: Math.max(0, onHand - reserved),
      },
      'Available stock fetched',
    );
  }

  private async getActiveReservedBaseQty(input: {
    projectId: string;
    materialId: string;
    location: string;
  }): Promise<number> {
    const rows = await this.reservationModel
      .find({
        projectId: new Types.ObjectId(input.projectId),
        materialId: new Types.ObjectId(input.materialId),
        location: input.location,
        status: StockReservationStatus.Active,
      })
      .lean()
      .exec();
    return rows.reduce(
      (sum, r) => sum + (r.baseUnitQuantity - (r.releasedBaseQuantity ?? 0)),
      0,
    );
  }

  private async requireActiveMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material id');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material || material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material not found or inactive');
    }
    return material;
  }

  private async requireReservation(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid reservation id');
    }
    const row = await this.reservationModel.findById(id).exec();
    if (!row) throw new NotFoundException('Stock reservation not found');
    return row;
  }

  private toPublic(row: StockReservation & { _id?: Types.ObjectId; createdAt?: Date; updatedAt?: Date }) {
    return {
      id: String(row._id),
      reservationNumber: row.reservationNumber,
      projectId: String(row.projectId),
      materialId: String(row.materialId),
      location: row.location,
      unit: row.unit,
      quantity: row.quantity,
      baseUnitQuantity: row.baseUnitQuantity,
      releasedBaseQuantity: row.releasedBaseQuantity,
      remainingBaseQuantity:
        row.baseUnitQuantity - row.releasedBaseQuantity,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      status: row.status,
      expiresAt: row.expiresAt,
      notes: row.notes,
      createdBy: String(row.createdBy),
      releasedBy: row.releasedBy ? String(row.releasedBy) : null,
      releasedAt: row.releasedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
