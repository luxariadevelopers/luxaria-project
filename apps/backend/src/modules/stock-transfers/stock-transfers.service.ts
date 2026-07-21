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
import { DatabaseService } from '../../database/services/database.service';
import { convertToBaseUnit } from '../material-master/materials.validation';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import { normalizeLocation } from '../stock-ledger/stock-ledger.validation';
import type {
  CreateStockTransferDto,
  ListStockTransfersQueryDto,
} from './dto/stock-transfer.dto';
import {
  StockTransfer,
  StockTransferStatus,
} from './schemas/stock-transfer.schema';

@Injectable()
export class StockTransfersService {
  constructor(
    @InjectModel(StockTransfer.name)
    private readonly transferModel: Model<StockTransfer>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly databaseService: DatabaseService,
  ) {}

  async create(dto: CreateStockTransferDto, actorId: string) {
    if (dto.sourceLocation && dto.destLocation) {
      if (
        normalizeLocation(dto.sourceLocation) ===
          normalizeLocation(dto.destLocation) &&
        dto.sourceProjectId === dto.destProjectId
      ) {
        throw new BadRequestException(
          'Source and destination locations must differ',
        );
      }
    }

    const items = await this.buildItems(dto);
    const transferNumber = await this.numberingService.nextCode(
      NumberEntityType.STOCK_TRANSFER,
      {
        asOf: new Date(dto.transferDate),
        projectId: dto.sourceProjectId,
        projectScoped: true,
      },
    );

    const row = await this.transferModel.create({
      transferNumber,
      scope: dto.scope,
      sourceProjectId: new Types.ObjectId(dto.sourceProjectId),
      destProjectId: new Types.ObjectId(dto.destProjectId),
      sourceWarehouseId: dto.sourceWarehouseId
        ? new Types.ObjectId(dto.sourceWarehouseId)
        : null,
      destWarehouseId: dto.destWarehouseId
        ? new Types.ObjectId(dto.destWarehouseId)
        : null,
      sourceSiteId: dto.sourceSiteId
        ? new Types.ObjectId(dto.sourceSiteId)
        : null,
      destSiteId: dto.destSiteId ? new Types.ObjectId(dto.destSiteId) : null,
      sourceLocation: normalizeLocation(dto.sourceLocation),
      destLocation: normalizeLocation(dto.destLocation),
      transferDate: new Date(dto.transferDate),
      items,
      status: StockTransferStatus.Draft,
      notes: dto.notes ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toPublic(row),
      'Stock transfer created',
    );
  }

  async submit(id: string) {
    const row = await this.requireTransfer(id);
    if (row.status !== StockTransferStatus.Draft) {
      throw new BadRequestException('Only draft transfers can be submitted');
    }
    row.status = StockTransferStatus.Submitted;
    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Stock transfer submitted');
  }

  async post(id: string, actorId: string) {
    const row = await this.requireTransfer(id);
    if (
      row.status !== StockTransferStatus.Draft &&
      row.status !== StockTransferStatus.Submitted
    ) {
      throw new BadRequestException('Transfer cannot be posted in this status');
    }

    await this.databaseService.withTransaction(async (session) => {
      for (const item of row.items) {
        const out = await this.stockLedgerService.postEntry({
          projectId: String(row.sourceProjectId),
          materialId: String(item.materialId),
          transactionType: StockTransactionType.TransferOut,
          quantityOut: item.quantity,
          unit: item.unit,
          referenceType: 'stock_transfer',
          referenceId: String(row._id),
          transactionDate: row.transferDate,
          location: row.sourceLocation,
          batch: item.batch,
          serialNumbers: item.serialNumbers,
          warehouseId: row.sourceWarehouseId
            ? String(row.sourceWarehouseId)
            : null,
          siteId: row.sourceSiteId ? String(row.sourceSiteId) : null,
          notes: `Transfer ${row.transferNumber} out`,
          actorId,
          session,
        });

        const inn = await this.stockLedgerService.postEntry({
          projectId: String(row.destProjectId),
          materialId: String(item.materialId),
          transactionType: StockTransactionType.TransferIn,
          quantityIn: item.quantity,
          unit: item.unit,
          referenceType: 'stock_transfer',
          referenceId: String(row._id),
          transactionDate: row.transferDate,
          location: row.destLocation,
          batch: item.batch,
          serialNumbers: item.serialNumbers,
          warehouseId: row.destWarehouseId
            ? String(row.destWarehouseId)
            : null,
          siteId: row.destSiteId ? String(row.destSiteId) : null,
          notes: `Transfer ${row.transferNumber} in`,
          actorId,
          session,
        });

        item.sourceLedgerId = out._id as Types.ObjectId;
        item.destLedgerId = inn._id as Types.ObjectId;
      }

      row.status = StockTransferStatus.Posted;
      row.postedBy = new Types.ObjectId(actorId);
      row.postedAt = new Date();
      await row.save({ session });
    });

    const fresh = await this.requireTransfer(id);
    return createSuccessResponse(
      this.toPublic(fresh),
      'Stock transfer posted — source and destination ledger updated',
    );
  }

  async cancel(id: string) {
    const row = await this.requireTransfer(id);
    if (row.status === StockTransferStatus.Posted) {
      throw new BadRequestException('Posted transfers cannot be cancelled');
    }
    row.status = StockTransferStatus.Cancelled;
    await row.save();
    return createSuccessResponse(this.toPublic(row), 'Stock transfer cancelled');
  }

  async getById(id: string) {
    const row = await this.requireTransfer(id);
    return createSuccessResponse(this.toPublic(row), 'Stock transfer fetched');
  }

  async list(query: ListStockTransfersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<StockTransfer> = {};
    if (query.projectId) {
      const pid = new Types.ObjectId(query.projectId);
      filter.$or = [{ sourceProjectId: pid }, { destProjectId: pid }];
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { transferDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.transferModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.transferModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => this.toPublic(row)),
      'Stock transfers fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async buildItems(dto: CreateStockTransferDto) {
    const items = [];
    for (const line of dto.items) {
      const material = await this.materialModel.findById(line.materialId).exec();
      if (!material || material.status !== MaterialStatus.Active) {
        throw new BadRequestException(
          `Material ${line.materialId} not found or inactive`,
        );
      }
      const baseUnitQuantity = convertToBaseUnit(
        line.quantity,
        line.unit,
        material.baseUnit,
        material.conversionFactors ?? [],
      );
      items.push({
        materialId: material._id,
        unit: line.unit,
        quantity: line.quantity,
        baseUnitQuantity,
        batch: line.batch?.trim() ?? null,
        serialNumbers: line.serialNumbers ?? [],
        sourceLedgerId: null,
        destLedgerId: null,
      });
    }
    return items;
  }

  private async requireTransfer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid transfer id');
    }
    const row = await this.transferModel.findById(id).exec();
    if (!row) throw new NotFoundException('Stock transfer not found');
    return row;
  }

  private toPublic(
    row: StockTransfer & {
      _id?: Types.ObjectId;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) {
    return {
      id: String(row._id),
      transferNumber: row.transferNumber,
      scope: row.scope,
      sourceProjectId: String(row.sourceProjectId),
      destProjectId: String(row.destProjectId),
      sourceWarehouseId: row.sourceWarehouseId
        ? String(row.sourceWarehouseId)
        : null,
      destWarehouseId: row.destWarehouseId
        ? String(row.destWarehouseId)
        : null,
      sourceSiteId: row.sourceSiteId ? String(row.sourceSiteId) : null,
      destSiteId: row.destSiteId ? String(row.destSiteId) : null,
      sourceLocation: row.sourceLocation,
      destLocation: row.destLocation,
      transferDate: row.transferDate,
      items: (row.items ?? []).map((item) => ({
        id: String(item._id),
        materialId: String(item.materialId),
        unit: item.unit,
        quantity: item.quantity,
        baseUnitQuantity: item.baseUnitQuantity,
        batch: item.batch ?? null,
        serialNumbers: item.serialNumbers ?? [],
        sourceLedgerId: item.sourceLedgerId
          ? String(item.sourceLedgerId)
          : null,
        destLedgerId: item.destLedgerId ? String(item.destLedgerId) : null,
      })),
      status: row.status,
      notes: row.notes ?? null,
      createdBy: String(row.createdBy),
      postedBy: row.postedBy ? String(row.postedBy) : null,
      postedAt: row.postedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
