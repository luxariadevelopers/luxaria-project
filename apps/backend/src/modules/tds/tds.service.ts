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
import type {
  CreateTdsDeductionDto,
  CreateTdsReturnDto,
  CreateTdsSectionDto,
  FileTdsReturnDto,
  ListTdsDeductionsQueryDto,
  ListTdsReturnsQueryDto,
  ListTdsSectionsQueryDto,
  MarkTdsCertifiedDto,
  MarkTdsDepositedDto,
  TdsRegisterQueryDto,
  UpdateTdsSectionDto,
} from './dto/tds.dto';
import {
  toPublicTdsDeduction,
  toPublicTdsReturn,
  toPublicTdsSection,
  toTdsRegisterRow,
} from './tds.mapper';
import { DEFAULT_TDS_SECTIONS } from './tds.seed';
import {
  TdsDeduction,
  TdsDeductionStatus,
} from './schemas/tds-deduction.schema';
import {
  TdsQuarter,
  TdsReturn,
  TdsReturnStatus,
} from './schemas/tds-return.schema';
import {
  TdsSection,
  TdsSectionStatus,
} from './schemas/tds-section.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const ACTIVE_DEDUCTION_STATUSES: TdsDeductionStatus[] = [
  TdsDeductionStatus.Withheld,
  TdsDeductionStatus.Deposited,
  TdsDeductionStatus.Certified,
];

@Injectable()
export class TdsService {
  constructor(
    @InjectModel(TdsSection.name)
    private readonly sectionModel: Model<TdsSection>,
    @InjectModel(TdsDeduction.name)
    private readonly deductionModel: Model<TdsDeduction>,
    @InjectModel(TdsReturn.name)
    private readonly returnModel: Model<TdsReturn>,
  ) {}

  // ── Sections ───────────────────────────────────────────────────────────

  async createSection(dto: CreateTdsSectionDto, actorId: string) {
    const sectionCode = dto.sectionCode.trim().toUpperCase();
    const existing = await this.sectionModel.findOne({ sectionCode }).exec();
    if (existing) {
      throw new BadRequestException(`Section ${sectionCode} already exists`);
    }

    const row = await this.sectionModel.create({
      sectionCode,
      name: dto.name.trim(),
      ratePercent: dto.ratePercent,
      thresholdAmount: dto.thresholdAmount ?? 0,
      status: TdsSectionStatus.Active,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicTdsSection(row),
      'TDS section created',
    );
  }

  async updateSection(
    id: string,
    dto: UpdateTdsSectionDto,
    actorId: string,
  ) {
    const row = await this.requireSection(id);

    if (dto.sectionCode !== undefined) {
      const sectionCode = dto.sectionCode.trim().toUpperCase();
      if (sectionCode !== row.sectionCode) {
        const clash = await this.sectionModel.findOne({ sectionCode }).exec();
        if (clash) {
          throw new BadRequestException(`Section ${sectionCode} already exists`);
        }
        row.sectionCode = sectionCode;
      }
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.ratePercent !== undefined) row.ratePercent = dto.ratePercent;
    if (dto.thresholdAmount !== undefined) {
      row.thresholdAmount = dto.thresholdAmount;
    }
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicTdsSection(row),
      'TDS section updated',
    );
  }

  async listSections(query: ListTdsSectionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<TdsSection> = {};
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'sectionCode';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.sectionModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.sectionModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicTdsSection(row)),
      'TDS sections fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getSectionById(id: string) {
    const row = await this.requireSection(id);
    return createSuccessResponse(toPublicTdsSection(row), 'TDS section fetched');
  }

  async removeSection(id: string, actorId: string) {
    const row = await this.requireSection(id);
    row.status = TdsSectionStatus.Inactive;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicTdsSection(row),
      'TDS section deactivated',
    );
  }

  async seedDefaultSections() {
    let created = 0;
    for (const seed of DEFAULT_TDS_SECTIONS) {
      const sectionCode = seed.sectionCode.toUpperCase();
      const existing = await this.sectionModel.findOne({ sectionCode }).exec();
      if (existing) continue;

      await this.sectionModel.create({
        sectionCode,
        name: seed.name,
        ratePercent: seed.ratePercent,
        thresholdAmount: seed.thresholdAmount,
        status: TdsSectionStatus.Active,
        notes: seed.notes,
        createdBy: null,
      });
      created += 1;
    }

    return createSuccessResponse(
      { created, total: DEFAULT_TDS_SECTIONS.length },
      'Default TDS sections seeded',
    );
  }

  // ── Deductions ─────────────────────────────────────────────────────────

  async createDeduction(dto: CreateTdsDeductionDto, actorId: string) {
    const section = await this.requireSection(dto.sectionId);
    if (section.status !== TdsSectionStatus.Active) {
      throw new BadRequestException('TDS section is not active');
    }

    const transactionAmount = roundMoney(dto.transactionAmount);
    const tdsAmount = roundMoney(dto.tdsAmount);
    if (tdsAmount > transactionAmount + 0.001) {
      throw new BadRequestException('TDS amount cannot exceed transaction amount');
    }

    const deductionNumber = await this.nextDeductionNumber(dto.companyId);
    const row = await this.deductionModel.create({
      deductionNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      sectionId: section._id,
      sectionCode: section.sectionCode,
      partyType: dto.partyType,
      partyId: dto.partyId ? new Types.ObjectId(dto.partyId) : null,
      partyName: dto.partyName.trim(),
      partyPan: dto.partyPan?.trim().toUpperCase() ?? null,
      deducteeType: dto.deducteeType,
      transactionDate: new Date(dto.transactionDate),
      transactionAmount,
      tdsAmount,
      sourceModule: dto.sourceModule?.trim() ?? null,
      sourceEntityType: dto.sourceEntityType?.trim() ?? null,
      sourceEntityId: dto.sourceEntityId?.trim() ?? null,
      challanNumber: null,
      challanDate: null,
      bsrCode: null,
      certificateNumber: null,
      status: TdsDeductionStatus.Withheld,
      journalEntryId: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicTdsDeduction(row),
      'TDS deduction recorded',
    );
  }

  async listDeductions(query: ListTdsDeductionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = this.buildDeductionFilter(query);
    const sortField = query.sortBy ?? 'transactionDate';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.deductionModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.deductionModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicTdsDeduction(row)),
      'TDS deductions fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getDeductionById(id: string) {
    const row = await this.requireDeduction(id);
    return createSuccessResponse(
      toPublicTdsDeduction(row),
      'TDS deduction fetched',
    );
  }

  async cancelDeduction(id: string, actorId: string) {
    const row = await this.requireDeduction(id);
    if (row.status === TdsDeductionStatus.Cancelled) {
      throw new BadRequestException('Deduction is already cancelled');
    }
    if (row.status === TdsDeductionStatus.Certified) {
      throw new BadRequestException('Certified deductions cannot be cancelled');
    }

    row.status = TdsDeductionStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicTdsDeduction(row),
      'TDS deduction cancelled',
    );
  }

  async markDeposited(
    id: string,
    dto: MarkTdsDepositedDto,
    actorId: string,
  ) {
    const row = await this.requireDeduction(id);
    if (row.status !== TdsDeductionStatus.Withheld) {
      throw new BadRequestException(
        'Only withheld deductions can be marked deposited',
      );
    }

    row.status = TdsDeductionStatus.Deposited;
    row.challanNumber = dto.challanNumber.trim();
    row.challanDate = new Date(dto.challanDate);
    row.bsrCode = dto.bsrCode?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicTdsDeduction(row),
      'TDS marked as deposited',
    );
  }

  async markCertified(
    id: string,
    dto: MarkTdsCertifiedDto,
    actorId: string,
  ) {
    const row = await this.requireDeduction(id);
    if (row.status !== TdsDeductionStatus.Deposited) {
      throw new BadRequestException(
        'Only deposited deductions can be certified',
      );
    }

    row.status = TdsDeductionStatus.Certified;
    row.certificateNumber = dto.certificateNumber.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicTdsDeduction(row),
      'TDS certificate issued',
    );
  }

  async register(query: TdsRegisterQueryDto) {
    const filter: FilterQuery<TdsDeduction> = {
      companyId: new Types.ObjectId(query.companyId),
      status: { $in: ACTIVE_DEDUCTION_STATUSES },
      transactionDate: {
        $gte: new Date(query.from),
        $lte: new Date(query.to),
      },
    };
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.sectionCode) {
      filter.sectionCode = query.sectionCode.trim().toUpperCase();
    }

    const rows = await this.deductionModel
      .find(filter)
      .sort({ transactionDate: 1, deductionNumber: 1 })
      .exec();

    const data = rows.map((row) => toTdsRegisterRow(row));
    const totals = data.reduce(
      (acc, row) => ({
        transactionAmount: roundMoney(
          acc.transactionAmount + row.transactionAmount,
        ),
        tdsAmount: roundMoney(acc.tdsAmount + row.tdsAmount),
      }),
      { transactionAmount: 0, tdsAmount: 0 },
    );

    return createSuccessResponse(
      { rows: data, totals, count: data.length },
      'TDS register fetched',
    );
  }

  // ── Returns ────────────────────────────────────────────────────────────

  async createReturn(dto: CreateTdsReturnDto, actorId: string) {
    const returnNumber = await this.nextReturnNumber(
      dto.companyId,
      dto.formType,
      dto.financialYearLabel,
      dto.quarter,
    );

    const row = await this.returnModel.create({
      returnNumber,
      companyId: new Types.ObjectId(dto.companyId),
      formType: dto.formType,
      quarter: dto.quarter,
      financialYearLabel: dto.financialYearLabel.trim(),
      status: TdsReturnStatus.Draft,
      totalDeductees: 0,
      totalTransactionAmount: 0,
      totalTds: 0,
      acknowledgementNumber: null,
      filedAt: null,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(toPublicTdsReturn(row), 'TDS return created');
  }

  async listReturns(query: ListTdsReturnsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<TdsReturn> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.formType) filter.formType = query.formType;
    if (query.quarter) filter.quarter = query.quarter;
    if (query.financialYearLabel) {
      filter.financialYearLabel = query.financialYearLabel.trim();
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.returnModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.returnModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicTdsReturn(row)),
      'TDS returns fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getReturnById(id: string) {
    const row = await this.requireReturn(id);
    return createSuccessResponse(toPublicTdsReturn(row), 'TDS return fetched');
  }

  async computeReturn(id: string, actorId: string) {
    const row = await this.requireReturn(id);
    if (
      row.status !== TdsReturnStatus.Draft &&
      row.status !== TdsReturnStatus.Computed
    ) {
      throw new BadRequestException(
        'Only draft or computed returns can be recomputed',
      );
    }

    const { start, end } = this.quarterBounds(
      row.financialYearLabel,
      row.quarter,
    );

    const deductions = await this.deductionModel
      .find({
        companyId: row.companyId,
        status: { $in: ACTIVE_DEDUCTION_STATUSES },
        transactionDate: { $gte: start, $lte: end },
      })
      .lean()
      .exec();

    const partyKeys = new Set<string>();
    let totalTransactionAmount = 0;
    let totalTds = 0;

    for (const d of deductions) {
      partyKeys.add(`${d.partyType}:${String(d.partyId ?? d.partyName)}`);
      totalTransactionAmount += d.transactionAmount;
      totalTds += d.tdsAmount;
    }

    row.totalDeductees = partyKeys.size;
    row.totalTransactionAmount = roundMoney(totalTransactionAmount);
    row.totalTds = roundMoney(totalTds);
    row.status = TdsReturnStatus.Computed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicTdsReturn(row),
      'TDS return computed from deductions',
    );
  }

  async fileReturn(id: string, dto: FileTdsReturnDto, actorId: string) {
    const row = await this.requireReturn(id);
    if (row.status !== TdsReturnStatus.Computed) {
      throw new BadRequestException('Only computed returns can be filed');
    }

    row.status = TdsReturnStatus.Filed;
    row.filedAt = new Date();
    row.acknowledgementNumber =
      dto.acknowledgementNumber?.trim() ??
      `ACK-TDS-${row.returnNumber}-${Date.now()}`;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicTdsReturn(row), 'TDS return filed');
  }

  async cancelReturn(id: string, actorId: string) {
    const row = await this.requireReturn(id);
    if (row.status === TdsReturnStatus.Filed) {
      throw new BadRequestException('Filed returns cannot be cancelled');
    }
    if (row.status === TdsReturnStatus.Cancelled) {
      throw new BadRequestException('Return is already cancelled');
    }

    row.status = TdsReturnStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicTdsReturn(row), 'TDS return cancelled');
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private buildDeductionFilter(
    query: ListTdsDeductionsQueryDto,
  ): FilterQuery<TdsDeduction> {
    const filter: FilterQuery<TdsDeduction> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.sectionCode) {
      filter.sectionCode = query.sectionCode.trim().toUpperCase();
    }
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.transactionDate = {};
      if (query.from) {
        filter.transactionDate.$gte = new Date(query.from);
      }
      if (query.to) {
        filter.transactionDate.$lte = new Date(query.to);
      }
    }
    return filter;
  }

  private quarterBounds(financialYearLabel: string, quarter: TdsQuarter) {
    const match = /^(\d{4})-(\d{2})$/.exec(financialYearLabel.trim());
    if (!match) {
      throw new BadRequestException(
        'financialYearLabel must be like 2025-26',
      );
    }
    const startYear = Number(match[1]);
    const monthRanges: Record<TdsQuarter, [number, number, number, number]> = {
      [TdsQuarter.Q1]: [startYear, 3, startYear, 5],
      [TdsQuarter.Q2]: [startYear, 6, startYear, 8],
      [TdsQuarter.Q3]: [startYear, 9, startYear, 11],
      [TdsQuarter.Q4]: [startYear + 1, 0, startYear + 1, 2],
    };
    const [sy, sm, ey, em] = monthRanges[quarter];
    const start = new Date(Date.UTC(sy, sm, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(ey, em + 1, 0, 23, 59, 59, 999));
    return { start, end };
  }

  private async nextDeductionNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.deductionModel
      .countDocuments({ companyId: new Types.ObjectId(companyId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `TDS-DED-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async nextReturnNumber(
    companyId: string,
    formType: string,
    financialYearLabel: string,
    quarter: string,
  ): Promise<string> {
    const count = await this.returnModel
      .countDocuments({
        companyId: new Types.ObjectId(companyId),
        formType,
        financialYearLabel: financialYearLabel.trim(),
        quarter,
      })
      .setOptions({ withDeleted: true })
      .exec();
    const fy = financialYearLabel.replace(/-/g, '');
    return `TDS-${formType.toUpperCase()}-${fy}-${quarter.toUpperCase()}-${String(count + 1).padStart(3, '0')}`;
  }

  private async requireSection(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid TDS section id');
    }
    const row = await this.sectionModel.findById(id).exec();
    if (!row) throw new NotFoundException('TDS section not found');
    return row;
  }

  private async requireDeduction(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid TDS deduction id');
    }
    const row = await this.deductionModel.findById(id).exec();
    if (!row) throw new NotFoundException('TDS deduction not found');
    return row;
  }

  private async requireReturn(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid TDS return id');
    }
    const row = await this.returnModel.findById(id).exec();
    if (!row) throw new NotFoundException('TDS return not found');
    return row;
  }
}
