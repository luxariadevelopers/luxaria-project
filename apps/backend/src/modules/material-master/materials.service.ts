import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import type { CreateMaterialDto } from './dto/create-material.dto';
import type { UpdateMaterialDto } from './dto/update-material.dto';
import { toPublicMaterial } from './materials.mapper';
import {
  assertMaterialCategory,
  assertStandardRate,
  assertStockLevels,
  assertUnitConversions,
  assertWastagePercentage,
} from './materials.validation';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from './schemas/material-stock-transaction.schema';
import {
  Material,
  MaterialStatus,
  MaterialUnit,
} from './schemas/material.schema';

const ALLOWED_LEDGER_CATEGORIES: AccountCategory[] = [
  AccountCategory.MaterialPurchase,
  AccountCategory.WorkInProgress,
  AccountCategory.DirectExpense,
  AccountCategory.LandCost,
];

@Injectable()
export class MaterialsService {
  constructor(
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly stockTxnModel: Model<MaterialStockTransaction>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    @Inject(forwardRef(() => StockLedgerService))
    private readonly stockLedgerService: StockLedgerService,
  ) {}

  async create(dto: CreateMaterialDto, actorId: string) {
    const category = assertMaterialCategory(dto.category);
    const conversions = assertUnitConversions({
      baseUnit: dto.baseUnit,
      alternateUnits: dto.alternateUnits,
      conversionFactors: dto.conversionFactors,
    });
    assertStockLevels({
      minimumStock: dto.minimumStock ?? 0,
      reorderLevel: dto.reorderLevel ?? 0,
      maximumStock: dto.maximumStock ?? 0,
    });
    assertWastagePercentage(dto.standardWastagePercentage);
    assertStandardRate(dto.standardRate);
    await this.assertLedgerAccount(dto.ledgerAccountId);

    const materialCode = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL,
    );

    const material = await this.materialModel.create({
      materialCode,
      name: dto.name.trim(),
      category,
      specification: dto.specification?.trim() || null,
      brand: dto.brand?.trim() || null,
      baseUnit: dto.baseUnit,
      alternateUnits: conversions.alternateUnits,
      conversionFactors: conversions.conversionFactors,
      standardRate: dto.standardRate ?? 0,
      minimumStock: dto.minimumStock ?? 0,
      reorderLevel: dto.reorderLevel ?? 0,
      maximumStock: dto.maximumStock ?? 0,
      standardWastagePercentage: dto.standardWastagePercentage ?? 0,
      ledgerAccountId: new Types.ObjectId(dto.ledgerAccountId),
      status: dto.status ?? MaterialStatus.Active,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterial(material, false),
      'Material created successfully',
    );
  }

  async update(id: string, dto: UpdateMaterialDto, actorId: string) {
    const material = await this.requireMaterial(id);
    const baseUnitLocked = await this.hasStockTransactions(id);

    if (dto.baseUnit !== undefined && dto.baseUnit !== material.baseUnit) {
      if (baseUnitLocked) {
        throw new BadRequestException(
          'Base unit cannot be changed after stock transactions without a migration procedure',
        );
      }
    }

    const nextBaseUnit = dto.baseUnit ?? material.baseUnit;
    const nextAlternate =
      dto.alternateUnits !== undefined
        ? dto.alternateUnits
        : material.alternateUnits;
    const nextFactors =
      dto.conversionFactors !== undefined
        ? dto.conversionFactors
        : material.conversionFactors;

    const conversions = assertUnitConversions({
      baseUnit: nextBaseUnit,
      alternateUnits: nextAlternate,
      conversionFactors: nextFactors,
    });

    const nextMin =
      dto.minimumStock !== undefined
        ? dto.minimumStock
        : material.minimumStock;
    const nextReorder =
      dto.reorderLevel !== undefined
        ? dto.reorderLevel
        : material.reorderLevel;
    const nextMax =
      dto.maximumStock !== undefined
        ? dto.maximumStock
        : material.maximumStock;

    assertStockLevels({
      minimumStock: nextMin,
      reorderLevel: nextReorder,
      maximumStock: nextMax,
    });

    if (dto.standardWastagePercentage !== undefined) {
      assertWastagePercentage(dto.standardWastagePercentage);
    }
    if (dto.standardRate !== undefined) {
      assertStandardRate(dto.standardRate);
    }
    if (dto.ledgerAccountId !== undefined) {
      await this.assertLedgerAccount(dto.ledgerAccountId);
    }

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actorId),
      alternateUnits: conversions.alternateUnits,
      conversionFactors: conversions.conversionFactors,
    };

    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.category !== undefined) {
      update.category = assertMaterialCategory(dto.category);
    }
    if (dto.specification !== undefined) {
      update.specification = dto.specification?.trim() || null;
    }
    if (dto.brand !== undefined) update.brand = dto.brand?.trim() || null;
    if (dto.baseUnit !== undefined) update.baseUnit = dto.baseUnit;
    if (dto.standardRate !== undefined) update.standardRate = dto.standardRate;
    if (dto.minimumStock !== undefined) update.minimumStock = dto.minimumStock;
    if (dto.reorderLevel !== undefined) update.reorderLevel = dto.reorderLevel;
    if (dto.maximumStock !== undefined) update.maximumStock = dto.maximumStock;
    if (dto.standardWastagePercentage !== undefined) {
      update.standardWastagePercentage = dto.standardWastagePercentage;
    }
    if (dto.ledgerAccountId !== undefined) {
      update.ledgerAccountId = new Types.ObjectId(dto.ledgerAccountId);
    }
    if (dto.status !== undefined) update.status = dto.status;

    const updated = await this.materialModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();

    return createSuccessResponse(
      toPublicMaterial(updated!, baseUnitLocked),
      'Material updated successfully',
    );
  }

  async getById(id: string) {
    const material = await this.requireMaterial(id);
    const baseUnitLocked = await this.hasStockTransactions(id);
    return createSuccessResponse(
      toPublicMaterial(material, baseUnitLocked),
      'Material fetched successfully',
    );
  }

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: MaterialStatus;
    category?: string;
    baseUnit?: MaterialUnit;
    brand?: string;
    ledgerAccountId?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const filter: FilterQuery<Material> = {};

    if (query.status) filter.status = query.status;
    if (query.category?.trim()) {
      filter.category = query.category.trim().toLowerCase();
    }
    if (query.baseUnit) filter.baseUnit = query.baseUnit;
    if (query.brand?.trim()) {
      filter.brand = { $regex: query.brand.trim(), $options: 'i' };
    }
    if (query.ledgerAccountId) {
      if (!Types.ObjectId.isValid(query.ledgerAccountId)) {
        throw new BadRequestException('Invalid ledgerAccountId');
      }
      filter.ledgerAccountId = new Types.ObjectId(query.ledgerAccountId);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { specification: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.materialModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.materialModel.countDocuments(filter).exec(),
    ]);

    const lockedIds = await this.stockTxnModel
      .distinct('materialId', {
        materialId: { $in: items.map((m) => m._id) },
      })
      .exec();
    const lockedSet = new Set(lockedIds.map((id) => String(id)));

    return createSuccessResponse(
      items.map((item) =>
        toPublicMaterial(item, lockedSet.has(String(item._id))),
      ),
      'Materials fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listUnits() {
    return createSuccessResponse(
      Object.values(MaterialUnit).map((code) => ({
        code,
        label: unitLabel(code),
      })),
      'Material units fetched successfully',
    );
  }

  /**
   * Compatibility helper — posts through the immutable stock ledger.
   * Positive quantityInBaseUnit → Purchase Receipt; negative → Material Issue.
   */
  async recordStockTransaction(input: {
    materialId: string;
    quantityInBaseUnit: number;
    referenceType: string;
    referenceId?: string | null;
    projectId: string;
    notes?: string | null;
    actorId: string;
    transactionType?: StockTransactionType;
    location?: string | null;
    batch?: string | null;
    allowNegative?: boolean;
  }) {
    if (!Number.isFinite(input.quantityInBaseUnit)) {
      throw new BadRequestException('quantityInBaseUnit must be finite');
    }
    if (!input.projectId || !Types.ObjectId.isValid(input.projectId)) {
      throw new BadRequestException('projectId is required');
    }

    const material = await this.requireMaterial(input.materialId);
    const qty = Math.abs(input.quantityInBaseUnit);
    const isIn = input.quantityInBaseUnit >= 0;
    const transactionType =
      input.transactionType ??
      (isIn
        ? StockTransactionType.PurchaseReceipt
        : StockTransactionType.MaterialIssue);

    // quantityInBaseUnit is already expressed in material.baseUnit
    const row = await this.stockLedgerService.postEntry({
      projectId: input.projectId,
      materialId: input.materialId,
      transactionType,
      quantityIn: isIn ? qty : 0,
      quantityOut: isIn ? 0 : qty,
      unit: material.baseUnit,
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      transactionDate: new Date(),
      location: input.location,
      batch: input.batch,
      notes: input.notes,
      allowNegative: input.allowNegative,
      actorId: input.actorId,
    });

    return createSuccessResponse(
      {
        id: String(row._id),
        transactionNumber: row.transactionNumber,
        materialId: String(row.materialId),
        quantityInBaseUnit: row.quantityInBaseUnit,
        baseUnitQuantity: row.baseUnitQuantity,
        baseUnit: row.baseUnit,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
      },
      'Material stock transaction recorded',
    );
  }

  async hasStockTransactions(materialId: string): Promise<boolean> {
    return this.stockLedgerService.hasStockTransactions(materialId);
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

  private async assertLedgerAccount(ledgerAccountId: string) {
    if (!Types.ObjectId.isValid(ledgerAccountId)) {
      throw new BadRequestException('Invalid ledgerAccountId');
    }
    const account = await this.accountModel.findById(ledgerAccountId).exec();
    if (!account) {
      throw new BadRequestException('Ledger account not found');
    }
    if (account.status !== AccountStatus.Active) {
      throw new BadRequestException('Ledger account is inactive');
    }
    if (!ALLOWED_LEDGER_CATEGORIES.includes(account.accountCategory)) {
      throw new BadRequestException(
        `ledgerAccountId must be one of: ${ALLOWED_LEDGER_CATEGORIES.join(', ')}`,
      );
    }
    if (account.isControlAccount && !account.allowManualPosting) {
      throw new BadRequestException(
        'Control ledger accounts cannot be linked as material ledgers',
      );
    }
  }
}

function unitLabel(unit: MaterialUnit): string {
  const labels: Record<MaterialUnit, string> = {
    [MaterialUnit.Number]: 'Number',
    [MaterialUnit.Bag]: 'Bag',
    [MaterialUnit.Kilogram]: 'Kilogram',
    [MaterialUnit.Ton]: 'Ton',
    [MaterialUnit.Litre]: 'Litre',
    [MaterialUnit.Metre]: 'Metre',
    [MaterialUnit.SquareFoot]: 'Square Foot',
    [MaterialUnit.CubicFoot]: 'Cubic Foot',
    [MaterialUnit.Load]: 'Load',
    [MaterialUnit.Box]: 'Box',
  };
  return labels[unit];
}
