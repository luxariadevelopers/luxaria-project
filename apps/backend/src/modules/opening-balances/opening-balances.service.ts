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
  Account,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import { Company } from '../company/schemas/company.schema';
import { CostCentresService } from '../cost-centres/cost-centres.service';
import { FinancialYearService } from '../financial-year/financial-year.service';
import {
  FinancialYear,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import { JournalService } from '../journal/journal.service';
import type { OpeningBalanceLineDto } from './dto/opening-balance.dto';
import {
  validateAndNormalizeLines,
  type RawJournalLine,
} from '../journal/journal.validation';
import { Project } from '../projects/schemas/project.schema';
import type {
  CreateOpeningBalancePackDto,
  ListOpeningBalancePacksQueryDto,
  UpdateOpeningBalancePackDto,
} from './dto/opening-balance.dto';
import { toPublicOpeningBalancePack } from './opening-balances.mapper';
import {
  OpeningBalanceLine,
  OpeningBalancePack,
  OpeningBalancePackStatus,
} from './schemas/opening-balance-pack.schema';

@Injectable()
export class OpeningBalancesService {
  constructor(
    @InjectModel(OpeningBalancePack.name)
    private readonly model: Model<OpeningBalancePack>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<Company>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    private readonly journalService: JournalService,
    private readonly financialYearService: FinancialYearService,
    private readonly costCentresService: CostCentresService,
  ) {}

  async create(dto: CreateOpeningBalancePackDto, actorId: string) {
    await this.assertCompany(dto.companyId);
    const fy = await this.requireFinancialYear(dto.financialYearId, dto.companyId);
    await this.assertProjectScope(dto.projectId ?? null, dto.companyId);

    const { lines, totalDebit, totalCredit } = this.normalizePackLines(
      dto.lines,
    );
    await this.assertLineReferences(lines, dto.projectId ?? null);

    const packNumber = await this.nextPackNumber(
      dto.companyId,
      dto.financialYearId,
      fy.startDate,
    );

    const row = await this.model.create({
      packNumber,
      companyId: new Types.ObjectId(dto.companyId),
      financialYearId: new Types.ObjectId(dto.financialYearId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      status: OpeningBalancePackStatus.Draft,
      lines: this.toEmbeddedLines(lines),
      totalDebit,
      totalCredit,
      journalEntryId: null,
      notes: dto.notes?.trim() ?? null,
      postedBy: null,
      postedAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicOpeningBalancePack(row),
      'Opening balance pack created as draft',
    );
  }

  async update(
    id: string,
    dto: UpdateOpeningBalancePackDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    this.assertDraft(row, 'update');

    if (dto.companyId !== undefined) {
      await this.assertCompany(dto.companyId);
      row.companyId = new Types.ObjectId(dto.companyId);
    }
    if (dto.financialYearId !== undefined) {
      await this.requireFinancialYear(
        dto.financialYearId,
        String(row.companyId),
      );
      row.financialYearId = new Types.ObjectId(dto.financialYearId);
    }
    if (dto.projectId !== undefined) {
      await this.assertProjectScope(
        dto.projectId,
        dto.companyId ?? String(row.companyId),
      );
      row.projectId = dto.projectId ? new Types.ObjectId(dto.projectId) : null;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }
    if (dto.lines !== undefined) {
      const { lines, totalDebit, totalCredit } = this.normalizePackLines(
        dto.lines,
      );
      await this.assertLineReferences(
        lines,
        dto.projectId !== undefined
          ? dto.projectId ?? null
          : row.projectId
            ? String(row.projectId)
            : null,
      );
      row.lines = this.toEmbeddedLines(lines);
      row.totalDebit = totalDebit;
      row.totalCredit = totalCredit;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicOpeningBalancePack(row),
      'Opening balance pack updated',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireRow(id);
    this.assertDraft(row, 'post');

    const fy = await this.requireFinancialYear(
      String(row.financialYearId),
      String(row.companyId),
    );

    const existingPosted = await this.model
      .countDocuments({
        companyId: row.companyId,
        financialYearId: row.financialYearId,
        status: OpeningBalancePackStatus.Posted,
        _id: { $ne: row._id },
      })
      .exec();
    if (existingPosted > 0) {
      throw new ConflictException(
        'An opening balance pack is already posted for this financial year',
      );
    }

    const journalDate = fy.startDate.toISOString().slice(0, 10);
    await this.financialYearService.assertPostingAllowed(
      journalDate,
      String(row.companyId),
    );

    const normalized = this.normalizePackLines(
      row.lines.map((line) => ({
        accountId: String(line.accountId),
        debit: line.debit,
        credit: line.credit,
        costCentreId: line.costCentreId ? String(line.costCentreId) : null,
        partyType: line.partyType,
        partyId: line.partyId ? String(line.partyId) : null,
        description: line.description,
      })),
    );
    await this.assertLineReferences(
      normalized.lines,
      row.projectId ? String(row.projectId) : null,
    );

    const journalKey = `opening-balance-post:${String(row._id)}`;
    const journalResponse = await this.journalService.create(
      {
        journalDate,
        projectId: row.projectId ? String(row.projectId) : null,
        sourceModule: 'opening_balance',
        sourceEntityType: 'opening_balance_pack',
        sourceEntityId: String(row._id),
        postingPurpose: 'opening',
        narration: `Opening trial balance ${row.packNumber}`.slice(0, 500),
        lines: normalized.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          projectId: row.projectId ? String(row.projectId) : null,
          costCentreId: line.costCentreId,
          partyType: line.partyType as OpeningBalanceLineDto['partyType'],
          partyId: line.partyId,
          description: line.description,
        })),
        post: true,
      },
      actorId,
      journalKey,
    );

    const journalId = journalResponse.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }

    row.status = OpeningBalancePackStatus.Posted;
    row.journalEntryId = new Types.ObjectId(journalId);
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicOpeningBalancePack(row),
      'Opening balance pack posted',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireRow(id);
    this.assertDraft(row, 'cancel');

    row.status = OpeningBalancePackStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicOpeningBalancePack(row),
      'Opening balance pack cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(toPublicOpeningBalancePack(row));
  }

  async list(query: ListOpeningBalancePacksQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<OpeningBalancePack> = {};

    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.financialYearId) {
      filter.financialYearId = new Types.ObjectId(query.financialYearId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      filter.packNumber = new RegExp(query.search.trim(), 'i');
    }

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [rows, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicOpeningBalancePack(r)),
      'Opening balance packs fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ─── internals ───────────────────────────────────────────────────────

  private normalizePackLines(lines: OpeningBalanceLineDto[]) {
    const raw: RawJournalLine[] = lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      costCentreId: line.costCentreId ?? null,
      partyType: line.partyType ?? null,
      partyId: line.partyId ?? null,
      description: line.description ?? null,
    }));
    return validateAndNormalizeLines(raw);
  }

  private toEmbeddedLines(
    lines: ReturnType<typeof validateAndNormalizeLines>['lines'],
  ): OpeningBalanceLine[] {
    return lines.map((line) => ({
      accountId: new Types.ObjectId(line.accountId),
      debit: line.debit,
      credit: line.credit,
      costCentreId: line.costCentreId
        ? new Types.ObjectId(line.costCentreId)
        : null,
      partyType: (line.partyType as OpeningBalanceLine['partyType']) ?? null,
      partyId: line.partyId ? new Types.ObjectId(line.partyId) : null,
      description: line.description,
    }));
  }

  private async assertLineReferences(
    lines: ReturnType<typeof validateAndNormalizeLines>['lines'],
    projectId: string | null,
  ) {
    for (const line of lines) {
      const account = await this.accountModel.findById(line.accountId).exec();
      if (!account) {
        throw new BadRequestException(`Account ${line.accountId} not found`);
      }
      if (account.status !== AccountStatus.Active) {
        throw new BadRequestException(
          `Account ${account.accountCode} is inactive`,
        );
      }
      if (account.requiresProject && !projectId) {
        throw new BadRequestException(
          `Account ${account.accountCode} requires project scope on opening lines`,
        );
      }
      if (line.costCentreId) {
        await this.costCentresService.assertActive(line.costCentreId);
      }
      if (line.partyType && !line.partyId) {
        throw new BadRequestException(
          'partyId is required when partyType is set',
        );
      }
    }
  }

  private async nextPackNumber(
    companyId: string,
    financialYearId: string,
    startDate: Date,
  ): Promise<string> {
    const year = startDate.getFullYear();
    const count = await this.model
      .countDocuments({
        companyId: new Types.ObjectId(companyId),
        financialYearId: new Types.ObjectId(financialYearId),
      })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(4, '0');
    return `OB-${year}-${seq}`;
  }

  private async assertCompany(companyId: string) {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestException('Invalid companyId');
    }
    const company = await this.companyModel
      .findById(companyId)
      .select('_id')
      .lean()
      .exec();
    if (!company) {
      throw new NotFoundException('Company not found');
    }
  }

  private async requireFinancialYear(financialYearId: string, companyId: string) {
    if (!Types.ObjectId.isValid(financialYearId)) {
      throw new BadRequestException('Invalid financialYearId');
    }
    const fy = await this.financialYearModel.findById(financialYearId).exec();
    if (!fy) {
      throw new NotFoundException('Financial year not found');
    }
    if (fy.companyId && String(fy.companyId) !== companyId) {
      throw new BadRequestException('financialYearId company mismatch');
    }
    if (fy.status === FinancialYearStatus.Closed) {
      throw new BadRequestException(
        'Cannot create opening balance for a closed financial year',
      );
    }
    return fy;
  }

  private async assertProjectScope(
    projectId: string | null,
    companyId: string,
  ) {
    if (!projectId) return;
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel
      .findById(projectId)
      .select('companyId')
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.companyId && String(project.companyId) !== companyId) {
      throw new BadRequestException('projectId company mismatch');
    }
  }

  private assertDraft(row: OpeningBalancePack, action: string) {
    if (row.status !== OpeningBalancePackStatus.Draft) {
      throw new BadRequestException(
        `Only draft opening balance packs can be ${action}ed`,
      );
    }
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Opening balance pack not found');
    }
    const row = await this.model.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Opening balance pack not found');
    }
    return row;
  }
}
