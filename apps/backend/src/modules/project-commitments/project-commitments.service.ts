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
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  ParticipantApprovalStatus,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { Project } from '../projects/schemas/project.schema';
import type {
  AmendCommitmentDto,
  CancelCommitmentDto,
  CreateCommitmentDto,
  RecordReceiptDto,
} from './dto/create-commitment.dto';
import { toPublicCommitment } from './project-commitments.mapper';
import {
  assertCommitmentNotBelowReceived,
  assertPaymentSchedule,
  assertPositiveReceipt,
  evaluateOverdueCommitmentAlerts,
} from './project-commitments.validation';
import {
  CommitmentStatus,
  ContributionCommitment,
} from './schemas/contribution-commitment.schema';

@Injectable()
export class ProjectCommitmentsService {
  constructor(
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    private readonly numberingService: NumberingService,
  ) {}

  async create(projectId: string, dto: CreateCommitmentDto, actorId: string) {
    await this.requireProject(projectId);
    await this.requireApprovedParticipant(projectId, dto.participantId);

    assertPaymentSchedule(dto.paymentSchedule, dto.commitmentAmount);
    assertCommitmentNotBelowReceived(dto.commitmentAmount, 0);

    const commitmentNumber = await this.numberingService.nextCode(
      NumberEntityType.CONTRIBUTION_COMMITMENT,
      { projectId, projectScoped: true },
    );

    const row = await this.commitmentModel.create({
      projectId: new Types.ObjectId(projectId),
      participantId: new Types.ObjectId(dto.participantId),
      commitmentNumber,
      commitmentAmount: dto.commitmentAmount,
      commitmentDate: dto.commitmentDate
        ? new Date(dto.commitmentDate)
        : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      contributionType: dto.contributionType,
      paymentSchedule: this.normalizeSchedule(dto.paymentSchedule),
      expectedBankAccount: this.normalizeBank(dto.expectedBankAccount),
      agreementReference: dto.agreementReference?.trim() ?? null,
      remarks: dto.remarks?.trim() ?? null,
      status: CommitmentStatus.Draft,
      version: 1,
      supersedesId: null,
      receivedAmount: 0,
      receipts: [],
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCommitment(row),
      'Contribution commitment created as draft',
    );
  }

  async submit(projectId: string, id: string, actorId: string) {
    const row = await this.requireCommitment(projectId, id);
    if (row.status !== CommitmentStatus.Draft) {
      throw new BadRequestException('Only draft commitments can be submitted');
    }

    row.status = CommitmentStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCommitment(row),
      'Commitment submitted for approval',
    );
  }

  async approve(projectId: string, id: string, actorId: string) {
    const row = await this.requireCommitment(projectId, id);
    if (row.status !== CommitmentStatus.Submitted) {
      throw new BadRequestException('Only submitted commitments can be approved');
    }
    if (row.submittedBy && String(row.submittedBy) === actorId) {
      throw new ForbiddenException(
        'Approver cannot be the same user who submitted the commitment',
      );
    }

    assertCommitmentNotBelowReceived(row.commitmentAmount, row.receivedAmount);

    const now = new Date();

    if (row.supersedesId) {
      await this.commitmentModel
        .updateOne(
          { _id: row.supersedesId },
          {
            $set: {
              status: CommitmentStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    row.status = CommitmentStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = now;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    evaluateOverdueCommitmentAlerts({
      dueDate: row.dueDate,
      pendingAmount: row.commitmentAmount - row.receivedAmount,
      status: row.status,
    });

    return createSuccessResponse(
      toPublicCommitment(row),
      'Commitment approved',
    );
  }

  /**
   * Amendments require versioning — approved commitments are never edited in place.
   */
  async amend(
    projectId: string,
    id: string,
    dto: AmendCommitmentDto,
    actorId: string,
  ) {
    const current = await this.requireCommitment(projectId, id);
    if (current.status !== CommitmentStatus.Approved) {
      throw new BadRequestException(
        'Only approved commitments can be amended; edit the draft instead',
      );
    }

    const pending = await this.commitmentModel
      .findOne({
        projectId: current.projectId,
        commitmentNumber: current.commitmentNumber,
        status: {
          $in: [CommitmentStatus.Draft, CommitmentStatus.Submitted],
        },
      })
      .lean()
      .exec();
    if (pending) {
      throw new ConflictException(
        'A draft or submitted amendment already exists for this commitment',
      );
    }

    assertCommitmentNotBelowReceived(dto.commitmentAmount, current.receivedAmount);
    assertPaymentSchedule(
      dto.paymentSchedule,
      dto.commitmentAmount,
    );

    const row = await this.commitmentModel.create({
      projectId: current.projectId,
      participantId: current.participantId,
      commitmentNumber: current.commitmentNumber,
      commitmentAmount: dto.commitmentAmount,
      commitmentDate: current.commitmentDate,
      dueDate:
        dto.dueDate !== undefined
          ? dto.dueDate
            ? new Date(dto.dueDate)
            : null
          : current.dueDate,
      contributionType: dto.contributionType ?? current.contributionType,
      paymentSchedule: dto.paymentSchedule
        ? this.normalizeSchedule(dto.paymentSchedule)
        : current.paymentSchedule,
      expectedBankAccount: dto.expectedBankAccount
        ? this.normalizeBank(dto.expectedBankAccount)
        : current.expectedBankAccount,
      agreementReference:
        dto.agreementReference !== undefined
          ? dto.agreementReference?.trim() ?? null
          : current.agreementReference,
      remarks: dto.remarks.trim(),
      status: CommitmentStatus.Draft,
      version: current.version + 1,
      supersedesId: current._id,
      receivedAmount: current.receivedAmount,
      receipts: current.receipts ?? [],
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCommitment(row),
      'Commitment amendment created as draft (history preserved)',
    );
  }

  async cancel(
    projectId: string,
    id: string,
    dto: CancelCommitmentDto,
    actorId: string,
  ) {
    const row = await this.requireCommitment(projectId, id);
    if (
      row.status !== CommitmentStatus.Draft &&
      row.status !== CommitmentStatus.Submitted &&
      row.status !== CommitmentStatus.Approved
    ) {
      throw new BadRequestException(
        'Only draft, submitted, or approved commitments can be cancelled',
      );
    }
    if (row.receivedAmount > 0 && row.status === CommitmentStatus.Approved) {
      throw new BadRequestException(
        'Cannot cancel an approved commitment that already has receipts; amend or reverse receipts first',
      );
    }

    row.status = CommitmentStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.cancellationReason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCommitment(row),
      'Commitment cancelled',
    );
  }

  async recordReceipt(
    projectId: string,
    id: string,
    dto: RecordReceiptDto,
    actorId: string,
  ) {
    return this.applyPostedReceipt({
      projectId,
      commitmentId: id,
      amount: dto.amount,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      reference: dto.reference?.trim() ?? null,
      remarks: dto.remarks?.trim() ?? null,
      actorId,
      contributionReceiptId: null,
    });
  }

  /**
   * Applies a posted contribution receipt to commitment + participant balances.
   * Used by ContributionReceiptsService on post.
   */
  async applyPostedReceipt(input: {
    projectId: string;
    commitmentId: string;
    amount: number;
    receivedAt: Date;
    reference: string | null;
    remarks: string | null;
    actorId: string;
    contributionReceiptId: string | null;
  }) {
    const row = await this.requireCommitment(
      input.projectId,
      input.commitmentId,
    );
    if (row.status !== CommitmentStatus.Approved) {
      throw new BadRequestException(
        'Receipts can only be applied against approved commitments',
      );
    }

    assertPositiveReceipt(input.amount);
    const nextReceived = row.receivedAmount + input.amount;
    if (nextReceived > row.commitmentAmount + 0.0001) {
      throw new BadRequestException(
        `Receipt would exceed commitment amount (committed ${row.commitmentAmount}, already received ${row.receivedAmount})`,
      );
    }

    if (input.contributionReceiptId) {
      const already = row.receipts.some(
        (r) =>
          r.contributionReceiptId &&
          String(r.contributionReceiptId) === input.contributionReceiptId,
      );
      if (already) {
        return createSuccessResponse(
          toPublicCommitment(row),
          'Receipt already applied to commitment',
        );
      }
    }

    row.receipts.push({
      amount: input.amount,
      receivedAt: input.receivedAt,
      reference: input.reference,
      remarks: input.remarks,
      recordedBy: new Types.ObjectId(input.actorId),
      contributionReceiptId: input.contributionReceiptId
        ? new Types.ObjectId(input.contributionReceiptId)
        : null,
    });
    row.receivedAmount = nextReceived;
    row.set('updatedBy', new Types.ObjectId(input.actorId));
    await row.save();

    await this.participantModel
      .updateOne(
        { _id: row.participantId },
        { $inc: { actualContributionAmount: input.amount } },
      )
      .exec();

    evaluateOverdueCommitmentAlerts({
      dueDate: row.dueDate,
      pendingAmount: row.commitmentAmount - row.receivedAmount,
      status: row.status,
    });

    return createSuccessResponse(
      toPublicCommitment(row),
      'Receipt applied to commitment balances',
    );
  }

  async getById(projectId: string, id: string) {
    const row = await this.requireCommitment(projectId, id);
    return createSuccessResponse(
      toPublicCommitment(row),
      'Commitment fetched successfully',
    );
  }

  async list(
    projectId: string,
    query: {
      page?: number;
      limit?: number;
      participantId?: string;
      status?: CommitmentStatus;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    await this.requireProject(projectId);
    const filter: FilterQuery<ContributionCommitment> = {
      projectId: new Types.ObjectId(projectId),
    };
    if (query.participantId) {
      filter.participantId = new Types.ObjectId(query.participantId);
    }
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.commitmentModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.commitmentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicCommitment),
      'Commitments fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async summary(projectId: string, participantId?: string) {
    await this.requireProject(projectId);
    const filter: FilterQuery<ContributionCommitment> = {
      projectId: new Types.ObjectId(projectId),
      status: CommitmentStatus.Approved,
    };
    if (participantId) {
      filter.participantId = new Types.ObjectId(participantId);
    }

    const approved = await this.commitmentModel.find(filter).lean().exec();
    const committed = approved.reduce((s, r) => s + r.commitmentAmount, 0);
    const received = approved.reduce((s, r) => s + (r.receivedAmount ?? 0), 0);

    return createSuccessResponse(
      {
        projectId,
        participantId: participantId ?? null,
        committedAmount: committed,
        receivedAmount: received,
        pendingAmount: Math.max(0, committed - received),
        approvedCommitmentCount: approved.length,
        note: 'Overdue commitment alerts will be added later',
      },
      'Commitment totals fetched',
    );
  }

  async listHistory(projectId: string, commitmentNumber: string) {
    await this.requireProject(projectId);
    const items = await this.commitmentModel
      .find({
        projectId: new Types.ObjectId(projectId),
        commitmentNumber: commitmentNumber.toUpperCase(),
      })
      .sort({ version: 1 })
      .exec();

    return createSuccessResponse(
      items.map(toPublicCommitment),
      'Commitment version history fetched',
    );
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    const project = await this.projectModel
      .findById(projectId)
      .select('_id')
      .lean()
      .exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireApprovedParticipant(
    projectId: string,
    participantRecordId: string,
  ) {
    if (!Types.ObjectId.isValid(participantRecordId)) {
      throw new BadRequestException('Invalid participantId');
    }
    const participant = await this.participantModel
      .findById(participantRecordId)
      .lean()
      .exec();
    if (!participant || String(participant.projectId) !== projectId) {
      throw new NotFoundException('Project participant not found');
    }
    if (
      participant.status !== ParticipantApprovalStatus.Approved ||
      participant.effectiveTo
    ) {
      throw new BadRequestException(
        'Commitments require an active approved project participant',
      );
    }
    return participant;
  }

  private async requireCommitment(projectId: string, id: string) {
    await this.requireProject(projectId);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid commitment id');
    }
    const row = await this.commitmentModel.findById(id).exec();
    if (!row || String(row.projectId) !== projectId) {
      throw new NotFoundException('Contribution commitment not found');
    }
    return row;
  }

  private normalizeSchedule(
    schedule?: Array<{ dueDate: string; amount: number; label?: string | null }>,
  ) {
    return (schedule ?? []).map((line) => ({
      dueDate: new Date(line.dueDate),
      amount: line.amount,
      label: line.label?.trim() ?? null,
    }));
  }

  private normalizeBank(bank?: {
    bankName?: string | null;
    ifsc?: string | null;
    accountHolderName?: string | null;
    accountNumberLast4?: string | null;
  }) {
    if (!bank) {
      return {
        bankName: null,
        ifsc: null,
        accountHolderName: null,
        accountNumberLast4: null,
      };
    }
    return {
      bankName: bank.bankName?.trim() ?? null,
      ifsc: bank.ifsc?.trim().toUpperCase() ?? null,
      accountHolderName: bank.accountHolderName?.trim() ?? null,
      accountNumberLast4: bank.accountNumberLast4?.trim() ?? null,
    };
  }
}
