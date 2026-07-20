import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, HydratedDocument, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import { JournalService } from '../journal/journal.service';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { PermissionsService } from '../rbac/permissions.service';
import { StockTransactionType } from '../material-master/schemas/material-stock-transaction.schema';
import { StockLedgerService } from '../stock-ledger/stock-ledger.service';
import type {
  ApproveStockCountDto,
  CreateStockCountDto,
  ListStockCountsQueryDto,
  StockCountItemDto,
  UpdateStockCountDto,
} from './dto/stock-count.dto';
import {
  StockCount,
  StockCountItem,
  StockCountStatus,
} from './schemas/stock-count.schema';
import { toPublicStockCount } from './stock-counts.mapper';
import {
  assertDifferenceExplained,
  assertPhysicalQuantity,
  computeDifference,
  isLargeVariance,
  normalizeLocation,
  roundQty,
} from './stock-counts.validation';

@Injectable()
export class StockCountsService {
  constructor(
    @InjectModel(StockCount.name)
    private readonly countModel: Model<StockCount>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    private readonly stockLedgerService: StockLedgerService,
    private readonly journalService: JournalService,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async create(dto: CreateStockCountDto, actorId: string) {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const countedBy = dto.countedBy ?? actorId;
    if (!Types.ObjectId.isValid(countedBy)) {
      throw new BadRequestException('Invalid countedBy');
    }

    const countDate = new Date(dto.countDate);
    if (Number.isNaN(countDate.getTime())) {
      throw new BadRequestException('Invalid countDate');
    }

    const location = normalizeLocation(dto.location);
    const items = await this.buildItems(dto.items, dto.projectId, location);

    const countNumber = await this.numberingService.nextCode(
      NumberEntityType.STOCK_COUNT,
      {
        asOf: countDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.countModel.create({
      countNumber,
      projectId: new Types.ObjectId(dto.projectId),
      countDate,
      countedBy: new Types.ObjectId(countedBy),
      location,
      items,
      status: StockCountStatus.Draft,
      requiresDirectorApproval: items.some((i) => i.isLargeVariance),
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count created as draft',
    );
  }

  async update(id: string, dto: UpdateStockCountDto, actorId: string) {
    const row = await this.requireCount(id);
    if (row.status !== StockCountStatus.Draft) {
      throw new BadRequestException('Only draft stock counts can be updated');
    }

    if (dto.countDate) {
      const countDate = new Date(dto.countDate);
      if (Number.isNaN(countDate.getTime())) {
        throw new BadRequestException('Invalid countDate');
      }
      row.countDate = countDate;
    }
    if (dto.location !== undefined) {
      row.location = normalizeLocation(dto.location);
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }
    if (dto.items) {
      row.items = await this.buildItems(
        dto.items,
        String(row.projectId),
        row.location,
      );
      row.requiresDirectorApproval = row.items.some((i) => i.isLargeVariance);
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireCount(id);
    if (row.status !== StockCountStatus.Draft) {
      throw new BadRequestException('Only draft stock counts can be submitted');
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    // Refresh system quantities at submit time
    row.items = await this.refreshSystemQuantities(row);
    for (const item of row.items) {
      assertDifferenceExplained({
        difference: item.difference,
        reason: item.reason,
      });
    }
    row.requiresDirectorApproval = row.items.some((i) => i.isLargeVariance);
    row.status = StockCountStatus.Submitted;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count submitted',
    );
  }

  async review(id: string, actorId: string) {
    const row = await this.requireCount(id);
    if (row.status !== StockCountStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted stock counts can be reviewed',
      );
    }

    row.status = StockCountStatus.Reviewed;
    row.reviewedBy = new Types.ObjectId(actorId);
    row.reviewedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count reviewed',
    );
  }

  async approve(
    id: string,
    actorId: string,
    _dto: ApproveStockCountDto = {},
  ) {
    const row = await this.requireCount(id);
    if (row.status !== StockCountStatus.Reviewed) {
      throw new BadRequestException(
        'Only reviewed stock counts can be approved',
      );
    }

    await this.assertCanApprove(row, actorId);

    row.status = StockCountStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      row.requiresDirectorApproval
        ? 'Stock count approved by director'
        : 'Stock count approved',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireCount(id);
    if (row.status !== StockCountStatus.Approved) {
      throw new BadRequestException(
        'Only approved stock counts can post adjustments',
      );
    }

    const varianceItems = row.items.filter(
      (i) => Math.abs(i.difference) >= 1e-9,
    );

    for (const item of varianceItems) {
      const abs = Math.abs(item.difference);
      const isSurplus = item.difference > 0;
      const entry = await this.stockLedgerService.postEntry({
        projectId: String(row.projectId),
        materialId: String(item.materialId),
        transactionType: StockTransactionType.Adjustment,
        quantityIn: isSurplus ? abs : 0,
        quantityOut: isSurplus ? 0 : abs,
        unit: item.baseUnit,
        referenceType: 'stock_count',
        referenceId: String(row._id),
        transactionDate: row.countDate,
        location: row.location || null,
        notes: `Stock count ${row.countNumber}: ${item.reason ?? 'adjustment'}`,
        allowNegative: false,
        actorId,
      });
      item.stockLedgerEntryId = entry._id as Types.ObjectId;
    }

    const journalId = await this.postAdjustmentJournal(row, actorId);
    if (journalId) {
      row.journalEntryId = new Types.ObjectId(journalId);
      row.journalSkippedReason = null;
    } else if (varianceItems.length > 0) {
      row.journalSkippedReason =
        'No monetary value (standard rates are zero); stock ledger adjusted only';
    } else {
      row.journalSkippedReason = 'No quantity differences to journal';
    }

    row.status = StockCountStatus.AdjustmentPosted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    row.markModified('items');
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock adjustments posted',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireCount(id);
    if (
      row.status === StockCountStatus.AdjustmentPosted ||
      row.status === StockCountStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Posted or cancelled stock counts cannot be cancelled',
      );
    }

    row.status = StockCountStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireCount(id);
    return createSuccessResponse(
      toPublicStockCount(row),
      'Stock count fetched successfully',
    );
  }

  async list(query: ListStockCountsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<StockCount> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.location !== undefined) {
      filter.location = normalizeLocation(query.location);
    }
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = { countDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.countModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.countModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicStockCount(row)),
      'Stock counts fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async buildItems(
    dtos: StockCountItemDto[],
    projectId: string,
    location: string,
  ): Promise<StockCountItem[]> {
    const threshold = this.getDirectorThresholdPercent();
    const seen = new Set<string>();
    const items: StockCountItem[] = [];

    for (const dto of dtos) {
      assertPhysicalQuantity(dto.physicalQuantity);
      if (seen.has(dto.materialId)) {
        throw new BadRequestException(
          `Duplicate materialId in count items: ${dto.materialId}`,
        );
      }
      seen.add(dto.materialId);

      const material = await this.requireActiveMaterial(dto.materialId);
      const systemQuantity = await this.stockLedgerService.getQuantityInBaseUnit(
        {
          materialId: dto.materialId,
          projectId,
          location,
        },
      );
      const physicalQuantity = roundQty(dto.physicalQuantity);
      const difference = computeDifference(physicalQuantity, systemQuantity);
      assertDifferenceExplained({
        difference,
        reason: dto.reason,
      });

      items.push({
        materialId: material._id as Types.ObjectId,
        materialCode: material.materialCode,
        materialName: material.name,
        baseUnit: material.baseUnit,
        systemQuantity: roundQty(systemQuantity),
        physicalQuantity,
        difference,
        reason: dto.reason?.trim() ?? null,
        photo: dto.photo?.trim() ?? null,
        isLargeVariance: isLargeVariance({
          systemQuantity,
          difference,
          thresholdPercent: threshold,
        }),
        stockLedgerEntryId: null,
      });
    }

    return items;
  }

  private async refreshSystemQuantities(
    row: StockCount,
  ): Promise<StockCountItem[]> {
    const threshold = this.getDirectorThresholdPercent();
    const refreshed: StockCountItem[] = [];

    for (const item of row.items) {
      const systemQuantity = await this.stockLedgerService.getQuantityInBaseUnit(
        {
          materialId: String(item.materialId),
          projectId: String(row.projectId),
          location: row.location,
        },
      );
      const difference = computeDifference(
        item.physicalQuantity,
        systemQuantity,
      );
      refreshed.push({
        materialId: item.materialId,
        materialCode: item.materialCode ?? null,
        materialName: item.materialName ?? null,
        baseUnit: item.baseUnit,
        systemQuantity: roundQty(systemQuantity),
        physicalQuantity: item.physicalQuantity,
        difference,
        reason: item.reason ?? null,
        photo: item.photo ?? null,
        isLargeVariance: isLargeVariance({
          systemQuantity,
          difference,
          thresholdPercent: threshold,
        }),
        stockLedgerEntryId: item.stockLedgerEntryId ?? null,
      });
    }

    return refreshed;
  }

  private async assertCanApprove(row: StockCount, actorId: string) {
    const access = await this.permissionsService.resolveUserAccess(actorId);
    if (access.bypassPermissions) return;

    if (row.requiresDirectorApproval) {
      if (!access.permissions.includes('stock.count.director_approve')) {
        throw new ForbiddenException(
          'Large stock variances require director approval (stock.count.director_approve)',
        );
      }
      return;
    }

    if (!access.permissions.includes('stock.adjust')) {
      throw new ForbiddenException(
        'stock.adjust permission is required to approve this stock count',
      );
    }
  }

  private async postAdjustmentJournal(
    row: HydratedDocument<StockCount>,
    actorId: string,
  ): Promise<string | null> {
    const valued = [];
    for (const item of row.items) {
      if (Math.abs(item.difference) < 1e-9) continue;
      const material = await this.requireActiveMaterial(String(item.materialId));
      const rate = material.standardRate ?? 0;
      const amount = roundQty(Math.abs(item.difference) * rate);
      if (amount <= 0) continue;
      valued.push({ item, amount, isSurplus: item.difference > 0 });
    }

    if (valued.length === 0) return null;

    const wip = await this.requireAccountByCategory(
      AccountCategory.WorkInProgress,
    );
    const expense = await this.requireAccountByCategory(
      AccountCategory.DirectExpense,
    );
    const income = await this.requireAccountByCategory(
      AccountCategory.OtherIncome,
    );

    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      projectId: string;
      description: string;
    }> = [];

    for (const { item, amount, isSurplus } of valued) {
      const label = `${item.materialCode ?? item.materialId} (${item.difference})`;
      if (isSurplus) {
        lines.push({
          accountId: String(wip._id),
          debit: amount,
          credit: 0,
          projectId: String(row.projectId),
          description: `Stock surplus ${label}`,
        });
        lines.push({
          accountId: String(income._id),
          debit: 0,
          credit: amount,
          projectId: String(row.projectId),
          description: `Stock surplus gain ${label}`,
        });
      } else {
        lines.push({
          accountId: String(expense._id),
          debit: amount,
          credit: 0,
          projectId: String(row.projectId),
          description: `Stock shortage ${label}`,
        });
        lines.push({
          accountId: String(wip._id),
          debit: 0,
          credit: amount,
          projectId: String(row.projectId),
          description: `Stock shortage write-down ${label}`,
        });
      }
    }

    const journal = await this.journalService.create(
      {
        journalDate: row.countDate.toISOString().slice(0, 10),
        projectId: String(row.projectId),
        sourceModule: 'stock_count',
        sourceEntityType: 'stock_count',
        sourceEntityId: String(row._id),
        narration: `Stock count adjustment ${row.countNumber}`,
        lines,
        post: true,
      },
      actorId,
      `stock-count-journal:${String(row._id)}`,
    );

    return journal.data?.id ?? null;
  }

  private getDirectorThresholdPercent(): number {
    const value = this.configService.get('stockCountDirectorThresholdPercent', {
      infer: true,
    });
    return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : 10;
  }

  private async requireCount(
    id: string,
  ): Promise<HydratedDocument<StockCount>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stock count id');
    }
    const row = await this.countModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Stock count not found');
    }
    return row;
  }

  private async requireActiveMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid material id');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material) {
      throw new NotFoundException('Material not found');
    }
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material is not active');
    }
    return material;
  }

  private async requireAccountByCategory(category: AccountCategory) {
    const account = await this.accountModel
      .findOne({
        accountCategory: category,
        status: AccountStatus.Active,
        isControlAccount: false,
      })
      .exec();
    if (!account) {
      throw new BadRequestException(
        `No active ledger account found for category ${category}`,
      );
    }
    return account;
  }
}
