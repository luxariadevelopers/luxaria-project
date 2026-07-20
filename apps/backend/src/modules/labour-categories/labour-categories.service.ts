import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, HydratedDocument, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import type {
  CreateLabourCategoryDto,
  CreateLabourCategoryRateDto,
  ListLabourCategoriesQueryDto,
  ListLabourCategoryRatesQueryDto,
  ResolveLabourCategoryRateQueryDto,
  UpdateLabourCategoryDto,
  UpdateLabourCategoryRateDto,
} from './dto/labour-category.dto';
import {
  toPublicLabourCategory,
  toPublicLabourCategoryRate,
} from './labour-categories.mapper';
import { STANDARD_LABOUR_CATEGORIES } from './labour-categories.seed';
import {
  assertNonNegativeRate,
  assertScopedRateTargets,
  buildRateScopeKey,
  normalizeEffectiveDate,
  resolveRateScopeKind,
  roundMoney,
} from './labour-categories.validation';
import {
  LabourCategory,
  LabourCategoryRate,
  LabourCategoryRateStatus,
  LabourCategoryStatus,
} from './schemas/labour-category.schema';

@Injectable()
export class LabourCategoriesService {
  constructor(
    @InjectModel(LabourCategory.name)
    private readonly categoryModel: Model<LabourCategory>,
    @InjectModel(LabourCategoryRate.name)
    private readonly rateModel: Model<LabourCategoryRate>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateLabourCategoryDto, actorId: string) {
    assertNonNegativeRate(dto.defaultDailyRate, 'defaultDailyRate');
    assertNonNegativeRate(dto.overtimeRate, 'overtimeRate');

    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    const categoryCode = await this.numberingService.nextCode(
      NumberEntityType.LABOUR_CATEGORY,
    );

    try {
      const row = await this.categoryModel.create({
        categoryCode,
        name,
        skillLevel: dto.skillLevel,
        defaultDailyRate: roundMoney(dto.defaultDailyRate),
        overtimeRate: roundMoney(dto.overtimeRate),
        status: LabourCategoryStatus.Active,
        isSystem: false,
        notes: dto.notes?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicLabourCategory(row),
        'Labour category created',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateLabourCategoryDto, actorId: string) {
    const row = await this.requireCategory(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.toLowerCase() !== row.name.toLowerCase()) {
        await this.assertNameAvailable(name, id);
      }
      row.name = name;
    }
    if (dto.skillLevel !== undefined) row.skillLevel = dto.skillLevel;
    if (dto.defaultDailyRate !== undefined) {
      assertNonNegativeRate(dto.defaultDailyRate, 'defaultDailyRate');
      row.defaultDailyRate = roundMoney(dto.defaultDailyRate);
    }
    if (dto.overtimeRate !== undefined) {
      assertNonNegativeRate(dto.overtimeRate, 'overtimeRate');
      row.overtimeRate = roundMoney(dto.overtimeRate);
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }

    return createSuccessResponse(
      toPublicLabourCategory(row),
      'Labour category updated',
    );
  }

  async activate(id: string, actorId: string) {
    const row = await this.requireCategory(id);
    row.status = LabourCategoryStatus.Active;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicLabourCategory(row),
      'Labour category activated',
    );
  }

  async deactivate(id: string, actorId: string) {
    const row = await this.requireCategory(id);
    row.status = LabourCategoryStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicLabourCategory(row),
      'Labour category deactivated',
    );
  }

  async getById(id: string) {
    const row = await this.requireCategory(id);
    return createSuccessResponse(
      toPublicLabourCategory(row),
      'Labour category fetched',
    );
  }

  async getByCode(categoryCode: string) {
    const row = await this.categoryModel
      .findOne({ categoryCode: categoryCode.trim().toUpperCase() })
      .exec();
    if (!row) {
      throw new NotFoundException('Labour category not found');
    }
    return createSuccessResponse(
      toPublicLabourCategory(row),
      'Labour category fetched',
    );
  }

  async list(query: ListLabourCategoriesQueryDto) {
    const filter: FilterQuery<LabourCategory> = {};
    if (query.status) filter.status = query.status;
    if (query.skillLevel) filter.skillLevel = query.skillLevel;
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { categoryCode: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort: Record<string, SortOrder> = { name: 1 };

    const [items, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(filter),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicLabourCategory(item)),
      'Labour categories listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async seedStandard(actorId: string) {
    let created = 0;
    let skipped = 0;

    for (const seed of STANDARD_LABOUR_CATEGORIES) {
      const existing = await this.categoryModel
        .findOne({ name: new RegExp(`^${escapeRegex(seed.name)}$`, 'i') })
        .exec();
      if (existing) {
        skipped += 1;
        continue;
      }

      const categoryCode = await this.numberingService.nextCode(
        NumberEntityType.LABOUR_CATEGORY,
      );
      await this.categoryModel.create({
        categoryCode,
        name: seed.name,
        skillLevel: seed.skillLevel,
        defaultDailyRate: seed.defaultDailyRate,
        overtimeRate: seed.overtimeRate,
        status: LabourCategoryStatus.Active,
        isSystem: true,
        notes: null,
        createdBy: new Types.ObjectId(actorId),
      });
      created += 1;
    }

    return createSuccessResponse(
      { created, skipped, total: STANDARD_LABOUR_CATEGORIES.length },
      `Seeded ${created} labour categor${created === 1 ? 'y' : 'ies'}`,
    );
  }

  async createRate(
    categoryId: string,
    dto: CreateLabourCategoryRateDto,
    actorId: string,
  ) {
    const category = await this.requireCategory(categoryId);
    assertScopedRateTargets({
      projectId: dto.projectId,
      contractorId: dto.contractorId,
    });
    assertNonNegativeRate(dto.dailyRate, 'dailyRate');
    assertNonNegativeRate(dto.overtimeRate, 'overtimeRate');

    const projectId = dto.projectId
      ? await this.requireProject(dto.projectId)
      : null;
    const contractorId = dto.contractorId
      ? await this.requireContractor(dto.contractorId)
      : null;

    const effectiveDate = normalizeEffectiveDate(dto.effectiveDate);
    const scopeKey = buildRateScopeKey({
      labourCategoryId: String(category._id),
      projectId,
      contractorId,
    });

    try {
      const row = await this.rateModel.create({
        labourCategoryId: category._id,
        projectId: projectId ? new Types.ObjectId(projectId) : null,
        contractorId: contractorId ? new Types.ObjectId(contractorId) : null,
        scopeKey,
        dailyRate: roundMoney(dto.dailyRate),
        overtimeRate: roundMoney(dto.overtimeRate),
        effectiveDate,
        status: LabourCategoryRateStatus.Active,
        notes: dto.notes?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicLabourCategoryRate(row),
        'Labour category rate created',
      );
    } catch (error) {
      this.rethrowDuplicateKey(
        error,
        'An active rate already exists for this scope and effective date',
      );
      throw error;
    }
  }

  async updateRate(
    rateId: string,
    dto: UpdateLabourCategoryRateDto,
    actorId: string,
  ) {
    const row = await this.requireRate(rateId);

    if (dto.dailyRate !== undefined) {
      assertNonNegativeRate(dto.dailyRate, 'dailyRate');
      row.dailyRate = roundMoney(dto.dailyRate);
    }
    if (dto.overtimeRate !== undefined) {
      assertNonNegativeRate(dto.overtimeRate, 'overtimeRate');
      row.overtimeRate = roundMoney(dto.overtimeRate);
    }
    if (dto.effectiveDate !== undefined) {
      row.effectiveDate = normalizeEffectiveDate(dto.effectiveDate);
    }
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicateKey(
        error,
        'An active rate already exists for this scope and effective date',
      );
      throw error;
    }

    return createSuccessResponse(
      toPublicLabourCategoryRate(row),
      'Labour category rate updated',
    );
  }

  async listRates(categoryId: string, query: ListLabourCategoryRatesQueryDto) {
    await this.requireCategory(categoryId);
    const filter: FilterQuery<LabourCategoryRate> = {
      labourCategoryId: new Types.ObjectId(categoryId),
    };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.rateModel
        .find(filter)
        .sort({ effectiveDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.rateModel.countDocuments(filter),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicLabourCategoryRate(item)),
      'Labour category rates listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Resolve applicable rate:
   * project+contractor → project → contractor → company default.
   */
  async resolveRate(query: ResolveLabourCategoryRateQueryDto) {
    const category = await this.requireCategory(query.labourCategoryId);
    if (category.status !== LabourCategoryStatus.Active) {
      throw new BadRequestException(
        'Cannot resolve rates for an inactive labour category',
      );
    }

    const asOf = query.asOf
      ? normalizeEffectiveDate(query.asOf)
      : normalizeEffectiveDate(new Date());

    const projectId = query.projectId ?? null;
    const contractorId = query.contractorId ?? null;
    if (projectId) await this.requireProject(projectId);
    if (contractorId) await this.requireContractor(contractorId);

    const candidates: Array<{
      projectId: string | null;
      contractorId: string | null;
      kind: ReturnType<typeof resolveRateScopeKind>;
    }> = [];

    if (projectId && contractorId) {
      candidates.push({
        projectId,
        contractorId,
        kind: 'project_contractor',
      });
    }
    if (projectId) {
      candidates.push({ projectId, contractorId: null, kind: 'project' });
    }
    if (contractorId) {
      candidates.push({ projectId: null, contractorId, kind: 'contractor' });
    }

    for (const candidate of candidates) {
      const scopeKey = buildRateScopeKey({
        labourCategoryId: String(category._id),
        projectId: candidate.projectId,
        contractorId: candidate.contractorId,
      });
      const rate = await this.rateModel
        .findOne({
          scopeKey,
          status: LabourCategoryRateStatus.Active,
          effectiveDate: { $lte: asOf },
        })
        .sort({ effectiveDate: -1 })
        .exec();

      if (rate) {
        return createSuccessResponse(
          {
            labourCategoryId: String(category._id),
            categoryCode: category.categoryCode,
            name: category.name,
            skillLevel: category.skillLevel,
            dailyRate: rate.dailyRate,
            overtimeRate: rate.overtimeRate,
            source: candidate.kind,
            rateId: String(rate._id),
            projectId: candidate.projectId,
            contractorId: candidate.contractorId,
            effectiveDate: rate.effectiveDate,
            asOf: asOf.toISOString(),
          },
          'Labour rate resolved',
        );
      }
    }

    return createSuccessResponse(
      {
        labourCategoryId: String(category._id),
        categoryCode: category.categoryCode,
        name: category.name,
        skillLevel: category.skillLevel,
        dailyRate: category.defaultDailyRate,
        overtimeRate: category.overtimeRate,
        source: 'company' as const,
        rateId: null,
        projectId,
        contractorId,
        effectiveDate: null,
        asOf: asOf.toISOString(),
      },
      'Labour rate resolved from company default',
    );
  }

  private async requireCategory(
    id: string,
  ): Promise<HydratedDocument<LabourCategory>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid labour category id');
    }
    const row = await this.categoryModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Labour category not found');
    }
    return row;
  }

  private async requireRate(
    id: string,
  ): Promise<HydratedDocument<LabourCategoryRate>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid labour category rate id');
    }
    const row = await this.rateModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Labour category rate not found');
    }
    return row;
  }

  private async requireProject(projectId: string): Promise<string> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return String(project._id);
  }

  private async requireContractor(contractorId: string): Promise<string> {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel.findById(contractorId).exec();
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    if (contractor.status === ContractorStatus.Blocked) {
      throw new BadRequestException(
        'Cannot set rates for a blocked contractor',
      );
    }
    return String(contractor._id);
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const filter: FilterQuery<LabourCategory> = {
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.categoryModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(
        `Labour category "${name}" already exists`,
      );
    }
  }

  private rethrowDuplicateKey(
    error: unknown,
    message = 'Duplicate labour category key',
  ) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(message);
    }
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
