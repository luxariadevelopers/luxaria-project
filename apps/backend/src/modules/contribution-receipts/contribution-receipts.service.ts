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
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  CONTRIBUTION_RECEIPT_IDEMPOTENCY_SCOPE,
  IdempotencyService,
} from '../../database/services/idempotency.service';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { ProjectCommitmentsService } from '../project-commitments/project-commitments.service';
import {
  CommitmentStatus,
  ContributionCommitment,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantApprovalStatus,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { Project } from '../projects/schemas/project.schema';
import { ContributionReceiptPdfService } from './contribution-receipt-pdf.service';
import {
  type PublicContributionReceipt,
  toPublicReceipt,
} from './contribution-receipts.mapper';
import type {
  CancelContributionReceiptDto,
  CreateContributionReceiptDto,
} from './dto/create-contribution-receipt.dto';
import {
  ParticipantContributionBalance,
  ProjectContributionBalance,
} from './schemas/contribution-balance.schema';
import {
  ContributionPaymentMode,
  ContributionReceipt,
  ContributionReceiptStatus,
} from './schemas/contribution-receipt.schema';

@Injectable()
export class ContributionReceiptsService {
  constructor(
    @InjectModel(ContributionReceipt.name)
    private readonly receiptModel: Model<ContributionReceipt>,
    @InjectModel(ProjectContributionBalance.name)
    private readonly projectBalanceModel: Model<ProjectContributionBalance>,
    @InjectModel(ParticipantContributionBalance.name)
    private readonly participantBalanceModel: Model<ParticipantContributionBalance>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    private readonly numberingService: NumberingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly commitmentsService: ProjectCommitmentsService,
    private readonly pdfService: ContributionReceiptPdfService,
    private readonly financialYearService: FinancialYearService,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(
    projectId: string,
    dto: CreateContributionReceiptDto,
    actorId: string,
    idempotencyKey?: string | null,
  ) {
    await this.projectScope.assertProjectAccess(
      actorId,
      projectId,
      'create',
      { resourceType: 'contribution-receipt' },
    );
    await this.requireProject(projectId);
    const requestHash = this.idempotencyService.hashRequest({
      projectId,
      ...dto,
    });

    if (idempotencyKey) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: CONTRIBUTION_RECEIPT_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicContributionReceipt>;
      }
    }

    try {
      const participant = await this.requireActiveParticipant(
        projectId,
        dto.participantId,
      );
      const commitment = await this.requireApprovedCommitment(
        projectId,
        dto.commitmentId,
        dto.participantId,
      );

      this.assertBankFields(dto);
      await this.assertUniqueTxnRef(
        dto.bankAccountId ?? null,
        dto.transactionReference ?? null,
      );

      const pendingHeadroom =
        commitment.commitmentAmount - commitment.receivedAmount;
      if (dto.amount > pendingHeadroom + 0.0001) {
        throw new BadRequestException(
          `Amount exceeds remaining commitment (${pendingHeadroom})`,
        );
      }

      const receiptNumber = await this.numberingService.nextCode(
        NumberEntityType.CONTRIBUTION_RECEIPT,
        { projectId, projectScoped: true },
      );

      const row = await this.receiptModel.create({
        receiptNumber,
        projectId: new Types.ObjectId(projectId),
        participantId: participant._id,
        commitmentId: commitment._id,
        receivedDate: dto.receivedDate
          ? new Date(dto.receivedDate)
          : new Date(),
        amount: dto.amount,
        paymentMode: dto.paymentMode,
        bankAccountId: dto.bankAccountId
          ? new Types.ObjectId(dto.bankAccountId)
          : null,
        transactionReference: dto.transactionReference?.trim() ?? null,
        receiptDocument: null,
        receiptPdfPath: null,
        remarks: dto.remarks?.trim() ?? null,
        status: ContributionReceiptStatus.Draft,
        idempotencyKey: idempotencyKey?.trim() ?? null,
        journalEntryId: null,
        balancesApplied: false,
        createdBy: new Types.ObjectId(actorId),
      });

      const response = createSuccessResponse(
        toPublicReceipt(row),
        'Contribution receipt created as draft',
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          CONTRIBUTION_RECEIPT_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          CONTRIBUTION_RECEIPT_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async submit(projectId: string, id: string, actorId: string) {
    const row = await this.requireReceipt(projectId, id, actorId, 'update');
    if (row.status !== ContributionReceiptStatus.Draft) {
      throw new BadRequestException('Only draft receipts can be submitted');
    }
    row.status = ContributionReceiptStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicReceipt(row),
      'Contribution receipt submitted',
    );
  }

  async verify(projectId: string, id: string, actorId: string) {
    const row = await this.requireReceipt(projectId, id, actorId, 'update');
    if (row.status !== ContributionReceiptStatus.Submitted) {
      throw new BadRequestException('Only submitted receipts can be verified');
    }
    if (row.submittedBy && String(row.submittedBy) === actorId) {
      throw new ForbiddenException(
        'Verifier cannot be the same user who submitted the receipt',
      );
    }
    row.status = ContributionReceiptStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicReceipt(row),
      'Contribution receipt verified',
    );
  }

  async post(projectId: string, id: string, actorId: string) {
    const row = await this.requireReceipt(projectId, id, actorId, 'update');
    if (row.status !== ContributionReceiptStatus.Verified) {
      throw new BadRequestException('Only verified receipts can be posted');
    }
    if (row.verifiedBy && String(row.verifiedBy) === actorId) {
      throw new ForbiddenException(
        'Poster cannot be the same user who verified the receipt',
      );
    }

    const project = await this.requireProject(projectId);
    await this.financialYearService.assertPostingAllowed(
      row.receivedDate,
      project.companyId ? String(project.companyId) : undefined,
    );

    await this.assertUniqueTxnRef(
      row.bankAccountId ? String(row.bankAccountId) : null,
      row.transactionReference,
      String(row._id),
    );

    // Apply commitment + participant actuals
    await this.commitmentsService.applyPostedReceipt({
      projectId,
      commitmentId: String(row.commitmentId),
      amount: row.amount,
      receivedAt: row.receivedDate,
      reference: row.transactionReference,
      remarks: row.remarks,
      actorId,
      contributionReceiptId: String(row._id),
    });

    await this.applyBalances(row);

    // Generate PDF
    const pdfPath = await this.pdfService.generate(row);
    row.receiptPdfPath = pdfPath;
    if (!row.receiptDocument) {
      row.receiptDocument = pdfPath;
    }

    /**
     * TODO(accounting): create journal entry (Dr Bank/Cash, Cr Contribution Liability)
     * and set journalEntryId when the ledger module is available.
     */
    row.journalEntryId = null;
    row.balancesApplied = true;
    row.status = ContributionReceiptStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicReceipt(row),
      'Contribution receipt posted; balances updated (accounting entry pending)',
    );
  }

  async cancel(
    projectId: string,
    id: string,
    dto: CancelContributionReceiptDto,
    actorId: string,
  ) {
    const row = await this.requireReceipt(projectId, id, actorId, 'update');
    if (
      row.status !== ContributionReceiptStatus.Draft &&
      row.status !== ContributionReceiptStatus.Submitted &&
      row.status !== ContributionReceiptStatus.Verified
    ) {
      throw new BadRequestException(
        'Posted receipts cannot be cancelled here; reverse via accounting later',
      );
    }
    row.status = ContributionReceiptStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.cancellationReason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicReceipt(row),
      'Contribution receipt cancelled',
    );
  }

  async attachDocument(
    projectId: string,
    id: string,
    filePath: string,
    actorId: string,
  ) {
    const row = await this.requireReceipt(projectId, id, actorId, 'update');
    if (row.status === ContributionReceiptStatus.Cancelled) {
      throw new BadRequestException('Cannot attach document to cancelled receipt');
    }
    row.receiptDocument = filePath;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicReceipt(row),
      'Receipt document attached',
    );
  }

  async getById(projectId: string, id: string, actorId: string) {
    const row = await this.requireReceipt(projectId, id, actorId, 'read');
    return createSuccessResponse(
      toPublicReceipt(row),
      'Contribution receipt fetched',
    );
  }

  async list(
    projectId: string,
    query: {
      page?: number;
      limit?: number;
      participantId?: string;
      commitmentId?: string;
      status?: ContributionReceiptStatus;
      sortOrder?: 'asc' | 'desc';
    },
    actorId: string,
  ) {
    await this.projectScope.assertProjectAccess(
      actorId,
      projectId,
      'read',
      { resourceType: 'contribution-receipt' },
    );
    await this.requireProject(projectId);
    let filter: FilterQuery<ContributionReceipt> = {
      projectId: new Types.ObjectId(projectId),
    };
    if (query.participantId) {
      filter.participantId = new Types.ObjectId(query.participantId);
    }
    if (query.commitmentId) {
      filter.commitmentId = new Types.ObjectId(query.commitmentId);
    }
    if (query.status) filter.status = query.status;

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.receiptModel
        .find(filter)
        .sort({ receivedDate: sortOrder, createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.receiptModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicReceipt),
      'Contribution receipts fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getBalances(projectId: string, participantId?: string) {
    await this.requireProject(projectId);
    const projectBalance = await this.projectBalanceModel
      .findOne({ projectId: new Types.ObjectId(projectId) })
      .lean()
      .exec();

    let participantBalance = null;
    if (participantId) {
      participantBalance = await this.participantBalanceModel
        .findOne({
          projectId: new Types.ObjectId(projectId),
          participantId: new Types.ObjectId(participantId),
        })
        .lean()
        .exec();
    }

    return createSuccessResponse(
      {
        project: {
          projectId,
          receivedAmount: projectBalance?.receivedAmount ?? 0,
          postedReceiptCount: projectBalance?.postedReceiptCount ?? 0,
          lastReceiptAt: projectBalance?.lastReceiptAt ?? null,
        },
        participant: participantBalance
          ? {
              projectId,
              participantId,
              receivedAmount: participantBalance.receivedAmount,
              postedReceiptCount: participantBalance.postedReceiptCount,
              lastReceiptAt: participantBalance.lastReceiptAt,
            }
          : null,
      },
      'Contribution balances fetched',
    );
  }

  private async applyBalances(row: ContributionReceipt) {
    const now = row.receivedDate;
    await this.projectBalanceModel
      .findOneAndUpdate(
        { projectId: row.projectId },
        {
          $inc: { receivedAmount: row.amount, postedReceiptCount: 1 },
          $set: { lastReceiptAt: now },
          $setOnInsert: { projectId: row.projectId },
        },
        { upsert: true, new: true },
      )
      .exec();

    await this.participantBalanceModel
      .findOneAndUpdate(
        {
          projectId: row.projectId,
          participantId: row.participantId,
        },
        {
          $inc: { receivedAmount: row.amount, postedReceiptCount: 1 },
          $set: { lastReceiptAt: now },
          $setOnInsert: {
            projectId: row.projectId,
            participantId: row.participantId,
          },
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  private assertBankFields(dto: CreateContributionReceiptDto) {
    const needsBank =
      dto.paymentMode === ContributionPaymentMode.BankTransfer ||
      dto.paymentMode === ContributionPaymentMode.Cheque;
    if (needsBank && !dto.bankAccountId) {
      throw new BadRequestException(
        'bankAccountId is required for bank transfer and cheque receipts',
      );
    }
    if (needsBank && !dto.transactionReference?.trim()) {
      throw new BadRequestException(
        'transactionReference is required for bank transfer and cheque receipts',
      );
    }
  }

  private async assertUniqueTxnRef(
    bankAccountId: string | null,
    transactionReference: string | null,
    excludeId?: string,
  ) {
    if (!bankAccountId || !transactionReference?.trim()) return;

    const filter: FilterQuery<ContributionReceipt> = {
      bankAccountId: new Types.ObjectId(bankAccountId),
      transactionReference: transactionReference.trim(),
      status: {
        $in: [
          ContributionReceiptStatus.Draft,
          ContributionReceiptStatus.Submitted,
          ContributionReceiptStatus.Verified,
          ContributionReceiptStatus.Posted,
        ],
      },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existing = await this.receiptModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        'Duplicate transaction reference for this bank account',
      );
    }
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireActiveParticipant(
    projectId: string,
    participantId: string,
  ) {
    if (!Types.ObjectId.isValid(participantId)) {
      throw new BadRequestException('Invalid participantId');
    }
    const participant = await this.participantModel
      .findById(participantId)
      .exec();
    if (!participant || String(participant.projectId) !== projectId) {
      throw new NotFoundException('Project participant not found');
    }
    if (
      participant.status !== ParticipantApprovalStatus.Approved ||
      participant.effectiveTo
    ) {
      throw new BadRequestException(
        'Receipts require an active approved project participant',
      );
    }
    return participant;
  }

  private async requireApprovedCommitment(
    projectId: string,
    commitmentId: string,
    participantId: string,
  ) {
    if (!Types.ObjectId.isValid(commitmentId)) {
      throw new BadRequestException('Invalid commitmentId');
    }
    const commitment = await this.commitmentModel.findById(commitmentId).exec();
    if (!commitment || String(commitment.projectId) !== projectId) {
      throw new NotFoundException('Contribution commitment not found');
    }
    if (commitment.status !== CommitmentStatus.Approved) {
      throw new BadRequestException('Commitment must be approved');
    }
    if (String(commitment.participantId) !== participantId) {
      throw new BadRequestException(
        'Commitment does not belong to the given participant',
      );
    }
    return commitment;
  }

  private async requireReceipt(
    projectId: string,
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    await this.requireProject(projectId);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid receipt id');
    }
    const row = await this.receiptModel.findById(id).exec();
    if (!row || String(row.projectId) !== projectId) {
      throw new NotFoundException('Contribution receipt not found');
    }
    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        projectId,
        action,
        { resourceType: 'contribution-receipt', resourceId: id },
      );
    }
    return row;
  }
}
