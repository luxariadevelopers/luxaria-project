import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { DatabaseService } from '../../database/services/database.service';
import { convertToBaseUnit } from '../material-master/materials.validation';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import type {
  GetStockBalanceQueryDto,
  ListStockLedgerQueryDto,
  PostStockLedgerEntryDto,
  ReverseStockLedgerEntryDto,
} from './dto/stock-ledger.dto';
import {
  MaterialStockBalance,
} from './schemas/material-stock-balance.schema';
import {
  toPublicStockBalance,
  toPublicStockLedgerEntry,
} from './stock-ledger.mapper';
import {
  assertNonNegativeBalance,
  assertQuantities,
  normalizeLocation,
  roundQty,
  signedBaseDelta,
} from './stock-ledger.validation';

export type PostStockLedgerInput = {
  projectId: string;
  materialId: string;
  transactionType: StockTransactionType;
  quantityIn?: number;
  quantityOut?: number;
  unit: PostStockLedgerEntryDto['unit'];
  referenceType: string;
  referenceId?: string | null;
  transactionDate: Date | string;
  location?: string | null;
  batch?: string | null;
  notes?: string | null;
  allowNegative?: boolean;
  actorId: string;
  session?: ClientSession;
  /** When posting a reversal row */
  reversalOfId?: string | null;
};

@Injectable()
export class StockLedgerService {
  constructor(
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(MaterialStockBalance.name)
    private readonly balanceModel: Model<MaterialStockBalance>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async post(dto: PostStockLedgerEntryDto, actorId: string) {
    if (dto.transactionType === StockTransactionType.Reversal) {
      throw new BadRequestException(
        'Use POST /stock-ledger/:id/reverse to create reversal entries',
      );
    }

    const entry = await this.postEntry({
      projectId: dto.projectId,
      materialId: dto.materialId,
      transactionType: dto.transactionType,
      quantityIn: dto.quantityIn ?? 0,
      quantityOut: dto.quantityOut ?? 0,
      unit: dto.unit,
      referenceType: dto.referenceType ?? 'manual',
      referenceId: dto.referenceId ?? null,
      transactionDate: dto.transactionDate,
      location: dto.location,
      batch: dto.batch,
      notes: dto.notes,
      allowNegative: dto.allowNegative,
      actorId,
    });

    return createSuccessResponse(
      toPublicStockLedgerEntry(entry),
      'Stock ledger entry posted',
    );
  }

  /**
   * Internal / module API — posts one immutable ledger row and updates balance.
   */
  async postEntry(input: PostStockLedgerInput) {
    const quantityIn = input.quantityIn ?? 0;
    const quantityOut = input.quantityOut ?? 0;
    assertQuantities({
      transactionType: input.transactionType,
      quantityIn,
      quantityOut,
    });

    const material = await this.requireActiveMaterial(input.materialId);
    if (!Types.ObjectId.isValid(input.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    if (!Types.ObjectId.isValid(input.actorId)) {
      throw new BadRequestException('Invalid actor id');
    }

    const inBase = convertToBaseUnit(
      quantityIn,
      input.unit,
      material.baseUnit,
      material.conversionFactors ?? [],
    );
    const outBase = convertToBaseUnit(
      quantityOut,
      input.unit,
      material.baseUnit,
      material.conversionFactors ?? [],
    );
    const baseUnitQuantity = signedBaseDelta({
      quantityInBase: inBase,
      quantityOutBase: outBase,
    });

    const transactionDate =
      input.transactionDate instanceof Date
        ? input.transactionDate
        : new Date(input.transactionDate);
    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException('Invalid transactionDate');
    }

    const location = normalizeLocation(input.location);
    const allowNegative =
      input.allowNegative === true ||
      this.configService.get('stockAllowNegative', { infer: true });

    const work = async (session: ClientSession) => {
      await this.applyBalanceDelta({
        materialId: material._id as Types.ObjectId,
        projectId: new Types.ObjectId(input.projectId),
        location,
        baseUnit: material.baseUnit,
        delta: baseUnitQuantity,
        allowNegative,
        materialLabel: material.materialCode ?? String(material._id),
        session,
      });

      const transactionNumber = await this.numberingService.nextCode(
        NumberEntityType.STOCK_LEDGER,
        {
          asOf: transactionDate,
          projectId: input.projectId,
          projectScoped: true,
        },
        session,
      );

      const [row] = await this.ledgerModel.create(
        [
          {
            transactionNumber,
            projectId: new Types.ObjectId(input.projectId),
            materialId: material._id,
            transactionType: input.transactionType,
            quantityIn: roundQty(quantityIn),
            quantityOut: roundQty(quantityOut),
            unit: input.unit,
            baseUnitQuantity,
            quantityInBaseUnit: baseUnitQuantity,
            baseUnit: material.baseUnit,
            referenceType: input.referenceType,
            referenceId: input.referenceId ?? null,
            transactionDate,
            location: location || null,
            batch: input.batch?.trim() || null,
            createdBy: new Types.ObjectId(input.actorId),
            reversalOfId: input.reversalOfId
              ? new Types.ObjectId(input.reversalOfId)
              : null,
            reversedById: null,
            notes: input.notes ?? null,
          },
        ],
        { session },
      );

      return row;
    };

    if (input.session) {
      return work(input.session);
    }
    return this.databaseService.withTransaction(work);
  }

  async reverse(
    id: string,
    actorId: string,
    dto: ReverseStockLedgerEntryDto = {},
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stock ledger id');
    }

    const entry = await this.databaseService.withTransaction(async (session) => {
      const original = await this.ledgerModel
        .findById(id)
        .session(session)
        .exec();
      if (!original) {
        throw new NotFoundException('Stock ledger entry not found');
      }
      if (original.reversedById) {
        throw new ConflictException('Stock ledger entry already reversed');
      }
      if (original.transactionType === StockTransactionType.Reversal) {
        throw new BadRequestException('Cannot reverse a reversal entry');
      }

      const existingReversal = await this.ledgerModel
        .findOne({ reversalOfId: original._id })
        .session(session)
        .exec();
      if (existingReversal) {
        throw new ConflictException('Stock ledger entry already reversed');
      }

      const reversal = await this.postEntry({
        projectId: String(original.projectId),
        materialId: String(original.materialId),
        transactionType: StockTransactionType.Reversal,
        quantityIn: original.quantityOut,
        quantityOut: original.quantityIn,
        unit: original.unit,
        referenceType: 'reversal',
        referenceId: String(original._id),
        transactionDate: dto.transactionDate
          ? new Date(dto.transactionDate)
          : new Date(),
        location: original.location,
        batch: original.batch,
        notes:
          dto.notes ??
          `Reversal of ${original.transactionNumber}`,
        actorId,
        session,
        reversalOfId: String(original._id),
      });

      const linked = await this.ledgerModel
        .findOneAndUpdate(
          { _id: original._id, reversedById: null },
          { $set: { reversedById: reversal._id } },
          { new: true, session },
        )
        .exec();
      if (!linked) {
        throw new ConflictException('Stock ledger entry already reversed');
      }

      return reversal;
    });

    return createSuccessResponse(
      toPublicStockLedgerEntry(entry),
      'Stock ledger entry reversed',
    );
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stock ledger id');
    }
    const row = await this.ledgerModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Stock ledger entry not found');
    }
    return createSuccessResponse(
      toPublicStockLedgerEntry(row),
      'Stock ledger entry fetched successfully',
    );
  }

  async list(query: ListStockLedgerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<MaterialStockTransaction> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.materialId) {
      filter.materialId = new Types.ObjectId(query.materialId);
    }
    if (query.transactionType) {
      filter.transactionType = query.transactionType;
    }
    if (query.location !== undefined) {
      filter.location = normalizeLocation(query.location) || null;
    }
    if (query.batch) {
      filter.batch = query.batch.trim();
    }
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = {
      transactionDate: -1,
      createdAt: -1,
    };

    const [items, total] = await Promise.all([
      this.ledgerModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.ledgerModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicStockLedgerEntry(row)),
      'Stock ledger entries fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getBalance(query: GetStockBalanceQueryDto) {
    const location = normalizeLocation(query.location);
    const row = await this.balanceModel
      .findOne({
        materialId: new Types.ObjectId(query.materialId),
        projectId: new Types.ObjectId(query.projectId),
        location,
      })
      .exec();

    if (!row) {
      const material = await this.requireMaterial(query.materialId);
      return createSuccessResponse(
        {
          id: null,
          materialId: query.materialId,
          projectId: query.projectId,
          location,
          quantityInBaseUnit: 0,
          baseUnit: material.baseUnit,
          version: 0,
          updatedAt: undefined,
        },
        'Stock balance fetched successfully',
      );
    }

    return createSuccessResponse(
      toPublicStockBalance(row),
      'Stock balance fetched successfully',
    );
  }

  /** On-hand quantity in base units (0 if no balance row). */
  async getQuantityInBaseUnit(input: {
    materialId: string;
    projectId: string;
    location?: string | null;
  }): Promise<number> {
    const row = await this.balanceModel
      .findOne({
        materialId: new Types.ObjectId(input.materialId),
        projectId: new Types.ObjectId(input.projectId),
        location: normalizeLocation(input.location),
      })
      .lean()
      .exec();
    return row?.quantityInBaseUnit ?? 0;
  }

  async hasStockTransactions(materialId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(materialId)) return false;
    const count = await this.ledgerModel
      .countDocuments({ materialId: new Types.ObjectId(materialId) })
      .exec();
    return count > 0;
  }

  private async applyBalanceDelta(input: {
    materialId: Types.ObjectId;
    projectId: Types.ObjectId;
    location: string;
    baseUnit: Material['baseUnit'];
    delta: number;
    allowNegative: boolean;
    materialLabel: string;
    session: ClientSession;
  }) {
    await this.balanceModel
      .updateOne(
        {
          materialId: input.materialId,
          projectId: input.projectId,
          location: input.location,
        },
        {
          $setOnInsert: {
            materialId: input.materialId,
            projectId: input.projectId,
            location: input.location,
            quantityInBaseUnit: 0,
            baseUnit: input.baseUnit,
            version: 0,
          },
        },
        { upsert: true, session: input.session },
      )
      .exec();

    const filter: FilterQuery<MaterialStockBalance> = {
      materialId: input.materialId,
      projectId: input.projectId,
      location: input.location,
    };
    if (!input.allowNegative && input.delta < 0) {
      filter.quantityInBaseUnit = { $gte: roundQty(-input.delta) };
    }

    const updated = await this.balanceModel
      .findOneAndUpdate(
        filter,
        {
          $inc: { quantityInBaseUnit: input.delta, version: 1 },
          $set: { baseUnit: input.baseUnit },
        },
        { new: true, session: input.session },
      )
      .exec();

    if (!updated) {
      const current = await this.balanceModel
        .findOne({
          materialId: input.materialId,
          projectId: input.projectId,
          location: input.location,
        })
        .session(input.session)
        .exec();
      assertNonNegativeBalance({
        current: current?.quantityInBaseUnit ?? 0,
        delta: input.delta,
        allowNegative: input.allowNegative,
        materialLabel: input.materialLabel,
      });
      throw new BadRequestException(
        `Insufficient stock for ${input.materialLabel}`,
      );
    }

    if (!input.allowNegative && updated.quantityInBaseUnit < -1e-9) {
      throw new BadRequestException(
        `Insufficient stock for ${input.materialLabel}`,
      );
    }
  }

  private async requireActiveMaterial(id: string) {
    const material = await this.requireMaterial(id);
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material is not active');
    }
    return material;
  }

  private async requireMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material id');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    return material;
  }
}
