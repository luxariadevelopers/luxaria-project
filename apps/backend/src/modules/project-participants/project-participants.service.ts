import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { Company } from '../company/schemas/company.schema';
import { Director } from '../directors/schemas/director.schema';
import { Investor } from '../investors/schemas/investor.schema';
import { Project } from '../projects/schemas/project.schema';
import type {
  CreateParticipantDto,
  CreateParticipantVersionDto,
} from './dto/create-participant.dto';
import type { RejectParticipantDto } from './dto/reject-participant.dto';
import type { UpdateParticipantDto } from './dto/update-participant.dto';
import {
  type PublicParticipantDocument,
  toPublicParticipant,
} from './project-participants.mapper';
import {
  assertActiveProfitShareTotals100,
  assertBudgetInvestmentPercentage,
  assertInterestRateForInstrument,
  assertPercent,
  buildParticipantKey,
} from './project-participants.validation';
import { ProjectParticipantConfig } from './schemas/project-participant-config.schema';
import {
  ParticipantDocumentCategory,
  ProjectParticipantFile,
} from './schemas/project-participant-document.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from './schemas/project-participant.schema';

@Injectable()
export class ProjectParticipantsService {
  constructor(
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(ProjectParticipantConfig.name)
    private readonly configModel: Model<ProjectParticipantConfig>,
    @InjectModel(ProjectParticipantFile.name)
    private readonly documentModel: Model<ProjectParticipantFile>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(Investor.name) private readonly investorModel: Model<Investor>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
  ) {}

  async create(projectId: string, dto: CreateParticipantDto, actorId: string) {
    await this.requireProject(projectId);
    await this.assertConfigNotFinalised(projectId);

    const label = await this.resolveParticipantLabel(
      dto.participantType,
      dto.participantId,
    );
    assertPercent(dto.approvedProfitSharePercentage, 'approvedProfitSharePercentage');
    assertPercent(dto.lossSharePercentage, 'lossSharePercentage');
    assertBudgetInvestmentPercentage(dto.budgetInvestmentPercentage);
    assertInterestRateForInstrument(
      dto.instrumentType,
      dto.interestRate ?? null,
      dto.repaymentMode ?? null,
    );

    const participantKey = buildParticipantKey(
      dto.participantType,
      dto.participantId,
    );

    const existingOpen = await this.participantModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        participantKey,
        effectiveTo: null,
        status: {
          $in: [
            ParticipantApprovalStatus.Draft,
            ParticipantApprovalStatus.Submitted,
            ParticipantApprovalStatus.Approved,
          ],
        },
      })
      .lean()
      .exec();

    if (existingOpen) {
      throw new ConflictException(
        'An open participant version already exists for this participant; create a new version instead',
      );
    }

    if (dto.agreementDocumentId) {
      await this.assertAgreementDocument(
        dto.agreementDocumentId,
        projectId,
        null,
      );
    }

    const row = await this.participantModel.create({
      projectId: new Types.ObjectId(projectId),
      participantType: dto.participantType,
      participantId: new Types.ObjectId(dto.participantId),
      participantKey,
      participantLabel: label,
      commitmentAmount: dto.commitmentAmount,
      expectedContributionDate: dto.expectedContributionDate
        ? new Date(dto.expectedContributionDate)
        : null,
      actualContributionAmount: dto.actualContributionAmount ?? 0,
      approvedProfitSharePercentage: dto.approvedProfitSharePercentage,
      lossSharePercentage: dto.lossSharePercentage,
      interestRate: dto.interestRate ?? null,
      budgetInvestmentPercentage: dto.budgetInvestmentPercentage ?? null,
      repaymentMode: dto.repaymentMode ?? null,
      instrumentType: dto.instrumentType,
      effectiveFrom: dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : new Date(),
      effectiveTo: null,
      agreementDocumentId: dto.agreementDocumentId
        ? new Types.ObjectId(dto.agreementDocumentId)
        : null,
      status: ParticipantApprovalStatus.Draft,
      version: 1,
      supersedesId: null,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicParticipant(row),
      'Project participant created as draft',
    );
  }

  /**
   * Profit-share / commitment changes require a new version — prior rows are never overwritten.
   */
  async createVersion(
    projectId: string,
    recordId: string,
    dto: CreateParticipantVersionDto,
    actorId: string,
  ) {
    await this.requireProject(projectId);
    const current = await this.requireRecord(recordId, projectId);

    if (current.status !== ParticipantApprovalStatus.Approved) {
      throw new BadRequestException(
        'Only approved participants can spawn a new version; edit the draft instead',
      );
    }
    if (current.effectiveTo) {
      throw new BadRequestException(
        'Cannot version a closed historical participant row',
      );
    }

    const pending = await this.participantModel
      .findOne({
        projectId: current.projectId,
        participantKey: current.participantKey,
        status: {
          $in: [
            ParticipantApprovalStatus.Draft,
            ParticipantApprovalStatus.Submitted,
          ],
        },
        effectiveTo: null,
      })
      .lean()
      .exec();
    if (pending) {
      throw new ConflictException(
        'A draft or submitted version already exists for this participant',
      );
    }

    assertPercent(dto.approvedProfitSharePercentage, 'approvedProfitSharePercentage');
    assertPercent(dto.lossSharePercentage, 'lossSharePercentage');

    const instrumentType = dto.instrumentType ?? current.instrumentType;
    const interestRate =
      dto.interestRate !== undefined ? dto.interestRate : current.interestRate;
    const repaymentMode =
      dto.repaymentMode !== undefined
        ? dto.repaymentMode
        : current.repaymentMode;
    const budgetInvestmentPercentage =
      dto.budgetInvestmentPercentage !== undefined
        ? dto.budgetInvestmentPercentage
        : current.budgetInvestmentPercentage;
    assertBudgetInvestmentPercentage(budgetInvestmentPercentage);
    assertInterestRateForInstrument(instrumentType, interestRate, repaymentMode);

    if (dto.agreementDocumentId) {
      await this.assertAgreementDocument(
        dto.agreementDocumentId,
        projectId,
        null,
      );
    }

    const nextVersion = current.version + 1;
    const row = await this.participantModel.create({
      projectId: current.projectId,
      participantType: current.participantType,
      participantId: current.participantId,
      participantKey: current.participantKey,
      participantLabel: current.participantLabel,
      commitmentAmount: dto.commitmentAmount,
      expectedContributionDate:
        dto.expectedContributionDate !== undefined
          ? dto.expectedContributionDate
            ? new Date(dto.expectedContributionDate)
            : null
          : current.expectedContributionDate,
      actualContributionAmount:
        dto.actualContributionAmount ?? current.actualContributionAmount,
      approvedProfitSharePercentage: dto.approvedProfitSharePercentage,
      lossSharePercentage: dto.lossSharePercentage,
      interestRate,
      budgetInvestmentPercentage: budgetInvestmentPercentage ?? null,
      repaymentMode: repaymentMode ?? null,
      instrumentType,
      effectiveFrom: dto.effectiveFrom
        ? new Date(dto.effectiveFrom)
        : new Date(),
      effectiveTo: null,
      agreementDocumentId: dto.agreementDocumentId
        ? new Types.ObjectId(dto.agreementDocumentId)
        : current.agreementDocumentId,
      status: ParticipantApprovalStatus.Draft,
      version: nextVersion,
      supersedesId: current._id,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicParticipant(row),
      'New participant version created as draft (history preserved)',
    );
  }

  async updateDraft(
    projectId: string,
    recordId: string,
    dto: UpdateParticipantDto,
    actorId: string,
  ) {
    await this.requireProject(projectId);
    await this.assertConfigNotFinalised(projectId);
    const row = await this.requireRecord(recordId, projectId);

    if (row.status !== ParticipantApprovalStatus.Draft) {
      throw new BadRequestException(
        'Only draft participants can be updated; create a new version for approved changes',
      );
    }

    const instrumentType = dto.instrumentType ?? row.instrumentType;
    const interestRate =
      dto.interestRate !== undefined ? dto.interestRate : row.interestRate;
    const repaymentMode =
      dto.repaymentMode !== undefined ? dto.repaymentMode : row.repaymentMode;
    if (dto.budgetInvestmentPercentage !== undefined) {
      assertBudgetInvestmentPercentage(dto.budgetInvestmentPercentage);
    }
    assertInterestRateForInstrument(instrumentType, interestRate, repaymentMode);

    if (dto.approvedProfitSharePercentage !== undefined) {
      assertPercent(
        dto.approvedProfitSharePercentage,
        'approvedProfitSharePercentage',
      );
    }
    if (dto.lossSharePercentage !== undefined) {
      assertPercent(dto.lossSharePercentage, 'lossSharePercentage');
    }

    if (dto.agreementDocumentId) {
      await this.assertAgreementDocument(
        dto.agreementDocumentId,
        projectId,
        recordId,
      );
    }

    const update: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(actorId),
    };
    if (dto.commitmentAmount !== undefined) {
      update.commitmentAmount = dto.commitmentAmount;
    }
    if (dto.expectedContributionDate !== undefined) {
      update.expectedContributionDate = dto.expectedContributionDate
        ? new Date(dto.expectedContributionDate)
        : null;
    }
    if (dto.actualContributionAmount !== undefined) {
      update.actualContributionAmount = dto.actualContributionAmount;
    }
    if (dto.approvedProfitSharePercentage !== undefined) {
      update.approvedProfitSharePercentage = dto.approvedProfitSharePercentage;
    }
    if (dto.lossSharePercentage !== undefined) {
      update.lossSharePercentage = dto.lossSharePercentage;
    }
    if (dto.interestRate !== undefined) update.interestRate = dto.interestRate;
    if (dto.budgetInvestmentPercentage !== undefined) {
      update.budgetInvestmentPercentage = dto.budgetInvestmentPercentage;
    }
    if (dto.repaymentMode !== undefined) update.repaymentMode = dto.repaymentMode;
    if (dto.instrumentType !== undefined) update.instrumentType = instrumentType;
    if (dto.effectiveFrom !== undefined) {
      update.effectiveFrom = new Date(dto.effectiveFrom);
    }
    if (dto.agreementDocumentId !== undefined) {
      update.agreementDocumentId = dto.agreementDocumentId
        ? new Types.ObjectId(dto.agreementDocumentId)
        : null;
    }
    if (dto.notes !== undefined) update.notes = dto.notes?.trim() ?? null;

    const updated = await this.participantModel
      .findByIdAndUpdate(recordId, update, { new: true })
      .exec();

    return createSuccessResponse(
      toPublicParticipant(updated!),
      'Draft participant updated successfully',
    );
  }

  async submit(projectId: string, recordId: string, actorId: string) {
    await this.requireProject(projectId);
    const row = await this.requireRecord(recordId, projectId);
    if (row.status !== ParticipantApprovalStatus.Draft) {
      throw new BadRequestException('Only draft participants can be submitted');
    }

    row.status = ParticipantApprovalStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicParticipant(row),
      'Participant submitted for approval',
    );
  }

  async approve(projectId: string, recordId: string, actorId: string) {
    await this.requireProject(projectId);
    const row = await this.requireRecord(recordId, projectId);
    if (row.status !== ParticipantApprovalStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted participants can be approved',
      );
    }
    if (row.submittedBy && String(row.submittedBy) === actorId) {
      throw new ForbiddenException(
        'Approver cannot be the same user who submitted the participant',
      );
    }

    const now = new Date();

    // Close prior approved version — never overwrite its percentages
    if (row.supersedesId) {
      await this.participantModel
        .updateOne(
          { _id: row.supersedesId, effectiveTo: null },
          {
            $set: {
              effectiveTo: now,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    } else {
      await this.participantModel
        .updateMany(
          {
            projectId: row.projectId,
            participantKey: row.participantKey,
            status: ParticipantApprovalStatus.Approved,
            effectiveTo: null,
            _id: { $ne: row._id },
          },
          {
            $set: {
              effectiveTo: now,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    row.status = ParticipantApprovalStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = now;
    row.effectiveFrom = row.effectiveFrom ?? now;
    row.effectiveTo = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    // If configuration was finalised and totals no longer equal 100%, open it again
    let unfinalisedDueToImbalance = false;
    const config = await this.getOrCreateConfig(projectId);
    if (config.isFinalised) {
      const active = await this.listActiveApproved(projectId);
      const total = active.reduce(
        (sum, p) => sum + p.approvedProfitSharePercentage,
        0,
      );
      if (Math.abs(total - 100) > 0.0001) {
        config.isFinalised = false;
        config.unfinalisedAt = now;
        config.unfinalisedBy = new Types.ObjectId(actorId);
        await config.save();
        unfinalisedDueToImbalance = true;
      }
    }

    return createSuccessResponse(
      {
        ...toPublicParticipant(row),
        configurationUnfinalised: unfinalisedDueToImbalance,
      },
      unfinalisedDueToImbalance
        ? 'Participant approved; configuration unfinalised because active profit shares no longer total 100%'
        : 'Participant approved; prior version closed if any',
    );
  }

  async reject(
    projectId: string,
    recordId: string,
    dto: RejectParticipantDto,
    actorId: string,
  ) {
    await this.requireProject(projectId);
    const row = await this.requireRecord(recordId, projectId);
    if (row.status !== ParticipantApprovalStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted participants can be rejected',
      );
    }

    row.status = ParticipantApprovalStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.rejectionReason.trim();
    row.effectiveTo = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicParticipant(row),
      'Participant rejected',
    );
  }

  async finalize(projectId: string, actorId: string) {
    await this.requireProject(projectId);
    const active = await this.listActiveApproved(projectId);
    assertActiveProfitShareTotals100(
      active.map((p) => p.approvedProfitSharePercentage),
    );

    const pending = await this.participantModel
      .countDocuments({
        projectId: new Types.ObjectId(projectId),
        status: {
          $in: [
            ParticipantApprovalStatus.Draft,
            ParticipantApprovalStatus.Submitted,
          ],
        },
        effectiveTo: null,
      })
      .exec();
    if (pending > 0) {
      throw new BadRequestException(
        'Cannot finalise while draft or submitted participant versions exist',
      );
    }

    const config = await this.getOrCreateConfig(projectId);
    config.isFinalised = true;
    config.finalisedAt = new Date();
    config.finalisedBy = new Types.ObjectId(actorId);
    await config.save();

    return createSuccessResponse(
      {
        projectId,
        isFinalised: true,
        finalisedAt: config.finalisedAt,
        totalProfitSharePercentage: 100,
        activeParticipants: active.map(toPublicParticipant),
        note: 'Project profit sharing is independent of company shareholding',
      },
      'Project participant profit-share configuration finalised',
    );
  }

  async unfinalize(projectId: string, actorId: string) {
    await this.requireProject(projectId);
    const config = await this.getOrCreateConfig(projectId);
    if (!config.isFinalised) {
      throw new BadRequestException('Configuration is not finalised');
    }
    config.isFinalised = false;
    config.unfinalisedAt = new Date();
    config.unfinalisedBy = new Types.ObjectId(actorId);
    await config.save();

    return createSuccessResponse(
      {
        projectId,
        isFinalised: false,
        unfinalisedAt: config.unfinalisedAt,
      },
      'Project participant configuration unfinalised',
    );
  }

  async getConfiguration(projectId: string) {
    await this.requireProject(projectId);
    const config = await this.getOrCreateConfig(projectId);
    const active = await this.listActiveApproved(projectId);
    const total = active.reduce(
      (sum, p) => sum + p.approvedProfitSharePercentage,
      0,
    );

    return createSuccessResponse(
      {
        projectId,
        isFinalised: config.isFinalised,
        finalisedAt: config.finalisedAt,
        finalisedBy: config.finalisedBy ? String(config.finalisedBy) : null,
        totalProfitSharePercentage: total,
        isBalanced: Math.abs(total - 100) < 0.0001,
        activeCount: active.length,
        note: 'Project profit sharing is independent of company shareholding',
      },
      'Participant configuration fetched',
    );
  }

  async getById(projectId: string, recordId: string) {
    await this.requireProject(projectId);
    const row = await this.requireRecord(recordId, projectId);
    return createSuccessResponse(
      toPublicParticipant(row),
      'Project participant fetched successfully',
    );
  }

  async listActive(projectId: string) {
    await this.requireProject(projectId);
    const items = await this.listActiveApproved(projectId);
    const total = items.reduce(
      (sum, p) => sum + p.approvedProfitSharePercentage,
      0,
    );
    return createSuccessResponse(
      {
        participants: items.map(toPublicParticipant),
        totalProfitSharePercentage: total,
        isBalanced: Math.abs(total - 100) < 0.0001,
        note: 'Active approved project profit shares (not company shareholding)',
      },
      'Active project participants fetched',
    );
  }

  async listHistory(
    projectId: string,
    query: {
      page?: number;
      limit?: number;
      participantKey?: string;
      status?: ParticipantApprovalStatus;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    await this.requireProject(projectId);
    const filter: FilterQuery<ProjectParticipant> = {
      projectId: new Types.ObjectId(projectId),
    };
    if (query.participantKey) filter.participantKey = query.participantKey;
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.participantModel
        .find(filter)
        .sort({ participantKey: 1, version: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.participantModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicParticipant),
      'Project participant history fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async addDocument(
    projectId: string,
    recordId: string,
    input: {
      fileName: string;
      filePath: string;
      mimeType: string | null;
      sizeBytes: number;
      category?: ParticipantDocumentCategory;
      setAsAgreement?: boolean;
    },
    actorId: string,
  ) {
    await this.requireProject(projectId);
    const row = await this.requireRecord(recordId, projectId);

    const doc = await this.documentModel.create({
      participantRecordId: row._id,
      projectId: row.projectId,
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      category: input.category ?? ParticipantDocumentCategory.Agreement,
      uploadedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    if (input.setAsAgreement !== false) {
      row.agreementDocumentId = doc._id as Types.ObjectId;
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
    }

    return createSuccessResponse(
      this.toPublicDocument(doc),
      'Participant agreement document uploaded',
    );
  }

  async listDocuments(
    projectId: string,
    recordId: string,
    query: { page?: number; limit?: number },
  ) {
    await this.requireProject(projectId);
    await this.requireRecord(recordId, projectId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { participantRecordId: new Types.ObjectId(recordId) };

    const [items, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicDocument(item)),
      'Participant documents fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async listActiveApproved(projectId: string) {
    return this.participantModel
      .find({
        projectId: new Types.ObjectId(projectId),
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .sort({ approvedProfitSharePercentage: -1 })
      .exec();
  }

  private async getOrCreateConfig(projectId: string) {
    let config = await this.configModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .exec();
    if (!config) {
      config = await this.configModel.create({
        projectId: new Types.ObjectId(projectId),
        isFinalised: false,
      });
    }
    return config;
  }

  private async assertConfigNotFinalised(projectId: string) {
    const config = await this.configModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();
    if (config?.isFinalised) {
      throw new BadRequestException(
        'Participant configuration is finalised; unfinalise before creating or editing drafts',
      );
    }
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel
      .findById(projectId)
      .select('_id projectName')
      .lean()
      .exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireRecord(recordId: string, projectId: string) {
    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid participant record id');
    }
    const row = await this.participantModel.findById(recordId).exec();
    if (!row || String(row.projectId) !== projectId) {
      throw new NotFoundException('Project participant not found');
    }
    return row;
  }

  private async resolveParticipantLabel(
    type: ParticipantType,
    participantId: string,
  ): Promise<string> {
    if (!Types.ObjectId.isValid(participantId)) {
      throw new BadRequestException('Invalid participantId');
    }

    if (type === ParticipantType.Director) {
      const director = await this.directorModel
        .findById(participantId)
        .select('fullName directorCode')
        .lean()
        .exec();
      if (!director) throw new NotFoundException('Director not found');
      return `${director.fullName} (${director.directorCode})`;
    }

    if (type === ParticipantType.OutsideInvestor) {
      const investor = await this.investorModel
        .findById(participantId)
        .select('legalName investorCode')
        .lean()
        .exec();
      if (!investor) throw new NotFoundException('Investor not found');
      return `${investor.legalName} (${investor.investorCode})`;
    }

    if (type === ParticipantType.Company) {
      const company = await this.companyModel
        .findById(participantId)
        .select('legalName companyCode')
        .lean()
        .exec();
      if (!company) throw new NotFoundException('Company not found');
      return `${company.legalName} (${company.companyCode})`;
    }

    // joint_venture_party — Company or Investor
    const company = await this.companyModel
      .findById(participantId)
      .select('legalName companyCode')
      .lean()
      .exec();
    if (company) {
      return `JV: ${company.legalName} (${company.companyCode})`;
    }
    const investor = await this.investorModel
      .findById(participantId)
      .select('legalName investorCode')
      .lean()
      .exec();
    if (investor) {
      return `JV: ${investor.legalName} (${investor.investorCode})`;
    }
    throw new NotFoundException(
      'Joint venture party must reference an existing Company or Investor',
    );
  }

  private async assertAgreementDocument(
    documentId: string,
    projectId: string,
    recordId: string | null,
  ) {
    const doc = await this.documentModel.findById(documentId).lean().exec();
    if (!doc || String(doc.projectId) !== projectId) {
      throw new BadRequestException('Invalid agreementDocumentId for project');
    }
    if (recordId && String(doc.participantRecordId) !== recordId) {
      throw new BadRequestException(
        'agreementDocumentId does not belong to this participant record',
      );
    }
  }

  private toPublicDocument(doc: {
    _id: Types.ObjectId;
    participantRecordId: Types.ObjectId;
    projectId: Types.ObjectId;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    sizeBytes: number;
    category: ParticipantDocumentCategory;
    uploadedBy?: Types.ObjectId | null;
    createdAt?: Date;
  }): PublicParticipantDocument {
    return {
      id: String(doc._id),
      participantRecordId: String(doc.participantRecordId),
      projectId: String(doc.projectId),
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType ?? null,
      sizeBytes: doc.sizeBytes,
      category: doc.category,
      uploadedBy: doc.uploadedBy ? String(doc.uploadedBy) : null,
      createdAt: doc.createdAt,
    };
  }
}
