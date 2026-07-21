import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { JournalService } from '../journal/journal.service';
import {
  toPublicFixedAsset,
  toPublicFixedAssetDepreciation,
  type FixedAssetRegisterSummary,
} from './fixed-assets.mapper';
import type {
  CreateFixedAssetDto,
  DepreciateFixedAssetDto,
  DisposeFixedAssetDto,
  ListFixedAssetDepreciationsQueryDto,
  ListFixedAssetsQueryDto,
  UpdateFixedAssetDto,
} from './dto/fixed-asset.dto';
import {
  FixedAssetDepreciation,
  FixedAssetDepreciationDocument,
  FixedAssetDepreciationStatus,
} from './schemas/fixed-asset-depreciation.schema';
import {
  DepreciationMethod,
  FixedAsset,
  FixedAssetStatus,
  type FixedAssetDocument,
} from './schemas/fixed-asset.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const EDITABLE_STATUSES: FixedAssetStatus[] = [
  FixedAssetStatus.Draft,
  FixedAssetStatus.Active,
];

@Injectable()
export class FixedAssetsService {
  constructor(
    @InjectModel(FixedAsset.name)
    private readonly assetModel: Model<FixedAsset>,
    @InjectModel(FixedAssetDepreciation.name)
    private readonly depreciationModel: Model<FixedAssetDepreciation>,
    @Optional() private readonly journalService?: JournalService,
  ) {}

  async create(dto: CreateFixedAssetDto, actorId: string) {
    this.assertAssetAmounts(dto.grossBlock, dto.salvageValue ?? 0);
    const assetNumber = await this.nextAssetNumber(dto.companyId);

    const row = await this.assetModel.create({
      assetNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      name: dto.name.trim(),
      category: dto.category,
      capitalizationDate: this.parseDate(dto.capitalizationDate, 'capitalizationDate'),
      putToUseDate: this.parseDate(dto.putToUseDate, 'putToUseDate'),
      grossBlock: roundMoney(dto.grossBlock),
      salvageValue: roundMoney(dto.salvageValue ?? 0),
      usefulLifeMonths: dto.usefulLifeMonths,
      depreciationMethod:
        dto.depreciationMethod ?? DepreciationMethod.StraightLine,
      depreciationRatePercent: dto.depreciationRatePercent ?? null,
      accumulatedDepreciation: 0,
      location: dto.location?.trim() ?? null,
      vendorId: dto.vendorId ? new Types.ObjectId(dto.vendorId) : null,
      purchaseReference: dto.purchaseReference?.trim() ?? null,
      glAssetAccountId: dto.glAssetAccountId
        ? new Types.ObjectId(dto.glAssetAccountId)
        : null,
      glAccumDepAccountId: dto.glAccumDepAccountId
        ? new Types.ObjectId(dto.glAccumDepAccountId)
        : null,
      glDepExpenseAccountId: dto.glDepExpenseAccountId
        ? new Types.ObjectId(dto.glDepExpenseAccountId)
        : null,
      status: FixedAssetStatus.Draft,
      disposalDate: null,
      disposalAmount: null,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicFixedAsset(row), 'Fixed asset created');
  }

  async update(id: string, dto: UpdateFixedAssetDto, actorId: string) {
    const row = await this.requireAsset(id);
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or active assets can be updated',
      );
    }

    if (dto.grossBlock !== undefined || dto.salvageValue !== undefined) {
      this.assertAssetAmounts(
        dto.grossBlock ?? row.grossBlock,
        dto.salvageValue ?? row.salvageValue,
      );
    }

    if (dto.projectId !== undefined) {
      row.projectId = dto.projectId
        ? new Types.ObjectId(dto.projectId)
        : null;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.category !== undefined) row.category = dto.category;
    if (dto.capitalizationDate !== undefined) {
      row.capitalizationDate = this.parseDate(
        dto.capitalizationDate,
        'capitalizationDate',
      );
    }
    if (dto.putToUseDate !== undefined) {
      row.putToUseDate = this.parseDate(dto.putToUseDate, 'putToUseDate');
    }
    if (dto.grossBlock !== undefined) {
      row.grossBlock = roundMoney(dto.grossBlock);
    }
    if (dto.salvageValue !== undefined) {
      row.salvageValue = roundMoney(dto.salvageValue);
    }
    if (dto.usefulLifeMonths !== undefined) {
      row.usefulLifeMonths = dto.usefulLifeMonths;
    }
    if (dto.depreciationMethod !== undefined) {
      row.depreciationMethod = dto.depreciationMethod;
    }
    if (dto.depreciationRatePercent !== undefined) {
      row.depreciationRatePercent = dto.depreciationRatePercent;
    }
    if (dto.location !== undefined) {
      row.location = dto.location?.trim() ?? null;
    }
    if (dto.vendorId !== undefined) {
      row.vendorId = dto.vendorId ? new Types.ObjectId(dto.vendorId) : null;
    }
    if (dto.purchaseReference !== undefined) {
      row.purchaseReference = dto.purchaseReference?.trim() ?? null;
    }
    if (dto.glAssetAccountId !== undefined) {
      row.glAssetAccountId = dto.glAssetAccountId
        ? new Types.ObjectId(dto.glAssetAccountId)
        : null;
    }
    if (dto.glAccumDepAccountId !== undefined) {
      row.glAccumDepAccountId = dto.glAccumDepAccountId
        ? new Types.ObjectId(dto.glAccumDepAccountId)
        : null;
    }
    if (dto.glDepExpenseAccountId !== undefined) {
      row.glDepExpenseAccountId = dto.glDepExpenseAccountId
        ? new Types.ObjectId(dto.glDepExpenseAccountId)
        : null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicFixedAsset(row), 'Fixed asset updated');
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireAsset(id);
    if (row.status !== FixedAssetStatus.Draft) {
      throw new BadRequestException('Only draft assets can be activated');
    }
    row.status = FixedAssetStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicFixedAsset(row), 'Fixed asset activated');
  }

  async dispose(id: string, dto: DisposeFixedAssetDto, actorId: string) {
    const row = await this.requireAsset(id);
    if (row.status !== FixedAssetStatus.Active) {
      throw new BadRequestException('Only active assets can be disposed');
    }
    row.status = FixedAssetStatus.Disposed;
    row.disposalDate = this.parseDate(dto.disposalDate, 'disposalDate');
    row.disposalAmount =
      dto.disposalAmount != null ? roundMoney(dto.disposalAmount) : null;
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? row.notes;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicFixedAsset(row), 'Fixed asset disposed');
  }

  async depreciate(id: string, dto: DepreciateFixedAssetDto, actorId: string) {
    const asset = await this.requireAsset(id);
    if (asset.status !== FixedAssetStatus.Active) {
      throw new BadRequestException('Only active assets can be depreciated');
    }

    const existing = await this.depreciationModel
      .findOne({
        assetId: asset._id,
        periodYear: dto.periodYear,
        periodMonth: dto.periodMonth,
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        'Depreciation already recorded for this asset and period',
      );
    }

    const amount = roundMoney(
      dto.amount ?? this.computeDepreciationAmount(asset),
    );
    if (amount <= 0) {
      throw new BadRequestException('Depreciation amount must be > 0');
    }

    const remaining = roundMoney(
      asset.grossBlock - asset.salvageValue - asset.accumulatedDepreciation,
    );
    if (amount > remaining + 0.009) {
      throw new BadRequestException(
        `Depreciation ${amount} exceeds remaining depreciable value ${remaining}`,
      );
    }

    const depreciationNumber = await this.nextDepreciationNumber(
      String(asset.companyId),
    );
    const depreciation = await this.depreciationModel.create({
      depreciationNumber,
      assetId: asset._id,
      companyId: asset.companyId,
      periodMonth: dto.periodMonth,
      periodYear: dto.periodYear,
      amount,
      journalEntryId: null,
      status: FixedAssetDepreciationStatus.Draft,
      postedAt: null,
      postedBy: null,
      postingNote: null,
      createdBy: new Types.ObjectId(actorId),
    });

    let postingNote: string | null = null;
    const journalEntryId = await this.tryPostDepreciationJournal(
      asset,
      depreciation,
      actorId,
    );
    if (!journalEntryId) {
      if (
        asset.glDepExpenseAccountId &&
        asset.glAccumDepAccountId &&
        this.journalService
      ) {
        postingNote = 'Journal posting failed; depreciation recorded without GL link';
      } else if (!asset.glDepExpenseAccountId || !asset.glAccumDepAccountId) {
        postingNote = 'GL accounts not configured on asset';
      } else {
        postingNote = 'JournalService unavailable';
      }
    }

    depreciation.status = FixedAssetDepreciationStatus.Posted;
    depreciation.postedAt = new Date();
    depreciation.postedBy = new Types.ObjectId(actorId);
    depreciation.journalEntryId = journalEntryId
      ? new Types.ObjectId(journalEntryId)
      : null;
    depreciation.postingNote = postingNote;
    depreciation.set('updatedBy', new Types.ObjectId(actorId));
    await depreciation.save();

    asset.accumulatedDepreciation = roundMoney(
      asset.accumulatedDepreciation + amount,
    );
    asset.set('updatedBy', new Types.ObjectId(actorId));
    await asset.save();

    return createSuccessResponse(
      {
        asset: toPublicFixedAsset(asset),
        depreciation: toPublicFixedAssetDepreciation(depreciation),
      },
      'Depreciation recorded',
    );
  }

  async getById(id: string) {
    const row = await this.requireAsset(id);
    return createSuccessResponse(toPublicFixedAsset(row), 'Fixed asset fetched');
  }

  async list(query: ListFixedAssetsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<FixedAsset> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.assetModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.assetModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicFixedAsset(row)),
      'Fixed assets fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async listDepreciations(query: ListFixedAssetDepreciationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<FixedAssetDepreciation> = {};
    if (query.assetId) {
      filter.assetId = new Types.ObjectId(query.assetId);
    }
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.depreciationModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.depreciationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicFixedAssetDepreciation(row)),
      'Fixed asset depreciations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async register(id: string): Promise<ReturnType<typeof createSuccessResponse<FixedAssetRegisterSummary>>> {
    const asset = await this.requireAsset(id);
    const depreciations = await this.depreciationModel
      .find({
        assetId: asset._id,
        status: FixedAssetDepreciationStatus.Posted,
      })
      .sort({ periodYear: -1, periodMonth: -1 })
      .lean()
      .exec();

    const totalDepreciationPosted = roundMoney(
      depreciations.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    );
    const last = depreciations[0];

    const summary: FixedAssetRegisterSummary = {
      assetId: String(asset._id),
      assetNumber: asset.assetNumber,
      name: asset.name,
      status: asset.status,
      grossBlock: asset.grossBlock,
      accumulatedDepreciation: asset.accumulatedDepreciation,
      netBlock: roundMoney(
        Math.max(0, asset.grossBlock - asset.accumulatedDepreciation),
      ),
      depreciationCount: depreciations.length,
      totalDepreciationPosted,
      lastDepreciationPeriod: last
        ? { month: last.periodMonth, year: last.periodYear }
        : null,
    };

    return createSuccessResponse(summary, 'Fixed asset register summary fetched');
  }

  computeDepreciationAmount(asset: FixedAssetDocument | FixedAsset): number {
    if (asset.depreciationMethod === DepreciationMethod.Wdv) {
      if (
        asset.depreciationRatePercent != null &&
        Number.isFinite(asset.depreciationRatePercent)
      ) {
        return roundMoney(
          (asset.grossBlock * (asset.depreciationRatePercent / 100)) / 12,
        );
      }
      throw new BadRequestException(
        'WDV depreciation requires depreciationRatePercent or explicit amount',
      );
    }
    return roundMoney(
      (asset.grossBlock - asset.salvageValue) / asset.usefulLifeMonths,
    );
  }

  private async tryPostDepreciationJournal(
    asset: FixedAssetDocument,
    depreciation: FixedAssetDepreciationDocument,
    actorId: string,
  ): Promise<string | null> {
    if (!this.journalService) return null;
    if (!asset.glDepExpenseAccountId || !asset.glAccumDepAccountId) {
      return null;
    }

    const projectId = asset.projectId ? String(asset.projectId) : null;
    const journalDate = `${depreciation.periodYear}-${String(depreciation.periodMonth).padStart(2, '0')}-01`;

    try {
      const journal = await this.journalService.create(
        {
          journalDate,
          projectId,
          sourceModule: 'fixed_asset',
          sourceEntityType: 'fixed_asset_depreciation',
          sourceEntityId: String(depreciation._id),
          narration: `Depreciation ${depreciation.depreciationNumber} — ${asset.assetNumber}`.slice(
            0,
            500,
          ),
          lines: [
            {
              accountId: String(asset.glDepExpenseAccountId),
              debit: depreciation.amount,
              credit: 0,
              projectId,
              description: `Depreciation expense ${asset.assetNumber}`,
            },
            {
              accountId: String(asset.glAccumDepAccountId),
              debit: 0,
              credit: depreciation.amount,
              projectId,
              description: `Accumulated depreciation ${asset.assetNumber}`,
            },
          ],
          post: true,
        },
        actorId,
        `fixed-asset-depreciation:${String(depreciation._id)}`,
      );
      return journal.data?.id ?? null;
    } catch {
      return null;
    }
  }

  private assertAssetAmounts(grossBlock: number, salvageValue: number) {
    if (!Number.isFinite(grossBlock) || grossBlock < 0) {
      throw new BadRequestException('grossBlock must be ≥ 0');
    }
    if (!Number.isFinite(salvageValue) || salvageValue < 0) {
      throw new BadRequestException('salvageValue must be ≥ 0');
    }
    if (salvageValue > grossBlock + 0.001) {
      throw new BadRequestException('salvageValue cannot exceed grossBlock');
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async nextAssetNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.assetModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `FA-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextDepreciationNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.depreciationModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `FAD-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async requireAsset(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid fixed asset id');
    }
    const row = await this.assetModel.findById(id).exec();
    if (!row) throw new NotFoundException('Fixed asset not found');
    return row;
  }
}
