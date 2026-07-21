import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  BoqVersion,
  BoqVersionStatus,
} from '../boq/schemas/boq.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  ContributionReceipt,
  ContributionReceiptStatus,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  Investor,
  InvestorStatus,
} from '../investors/schemas/investor.schema';
import {
  CommitmentStatus,
  ContributionCommitment,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { ProjectParticipantFile } from '../project-participants/schemas/project-participant-document.schema';
import { Project } from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type {
  ListInvestorProfitAllocationsQueryDto,
  PublishInvestorReportDto,
  RecordInvestorProfitDto,
  UpdateDistributedProfitDto,
} from './dto/manage-investor-portal.dto';
import type {
  InvestorPortalMe,
  InvestorPortalProjectDetail,
  InvestorPortalProjectSummary,
  InvestorProfitAllocationPublic,
} from './investor-portal.types';
import {
  InvestorProfitAllocation,
  InvestorProfitAllocationStatus,
} from './schemas/investor-profit-allocation.schema';
import {
  InvestorVisibleReport,
  InvestorVisibleReportStatus,
} from './schemas/investor-visible-report.schema';

type ResolvedInvestorContext = {
  investor: Investor & { _id: Types.ObjectId };
  investorId: string;
};

@Injectable()
export class InvestorPortalService {
  constructor(
    @InjectModel(Investor.name)
    private readonly investorModel: Model<Investor>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    @InjectModel(ContributionReceipt.name)
    private readonly receiptModel: Model<ContributionReceipt>,
    @InjectModel(ProjectParticipantFile.name)
    private readonly participantFileModel: Model<ProjectParticipantFile>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(InvestorVisibleReport.name)
    private readonly reportModel: Model<InvestorVisibleReport>,
    @InjectModel(InvestorProfitAllocation.name)
    private readonly profitModel: Model<InvestorProfitAllocation>,
  ) {}

  async getMe(actorId: string) {
    const { investor } = await this.requireLinkedInvestor(actorId);
    const payload: InvestorPortalMe = {
      investorId: String(investor._id),
      investorCode: investor.investorCode,
      legalName: investor.legalName,
      investorType: investor.investorType,
      status: investor.status,
      kycStatus: investor.kycStatus,
    };
    return createSuccessResponse(payload, 'Investor portal profile');
  }

  async listProjects(actorId: string) {
    const { investorId } = await this.requireLinkedInvestor(actorId);
    const participants = await this.findAuthorisedParticipants(investorId);

    const summaries: InvestorPortalProjectSummary[] = [];
    for (const participant of participants) {
      const project = await this.projectModel
        .findById(participant.projectId)
        .lean()
        .exec();
      if (!project) continue;

      const investment = await this.buildInvestmentTile(
        participant._id as Types.ObjectId,
        participant,
      );
      const progress = await this.physicalProgress(
        participant.projectId as Types.ObjectId,
      );

      summaries.push({
        projectId: String(project._id),
        projectCode: project.projectCode,
        projectName: project.projectName,
        projectStage: project.projectStage,
        status: project.status,
        commitmentAmount: investment.commitmentAmount,
        amountContributed: investment.amountContributed,
        pendingContribution: investment.pendingContribution,
        approvedProfitSharePercentage:
          investment.approvedProfitSharePercentage,
        physicalProgressPercent: progress.physicalProgressPercent,
      });
    }

    return createSuccessResponse(summaries, 'Authorised investor projects');
  }

  async getProject(projectId: string, actorId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const { investorId } = await this.requireLinkedInvestor(actorId);
    const participant = await this.requireAuthorisedParticipant(
      investorId,
      projectId,
    );

    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const projectOid = new Types.ObjectId(projectId);
    const participantOid = participant._id as Types.ObjectId;

    const [investment, progress, budget, profit, reports, agreements, receipts] =
      await Promise.all([
        this.buildInvestmentTile(participantOid, participant),
        this.physicalProgress(projectOid),
        this.budgetSummary(projectOid, project.approvedBudget ?? 0),
        this.profitSummary(projectOid, investorId, participantOid),
        this.listPublishedReports(projectOid),
        this.listAgreements(participantOid),
        this.listOwnReceipts(projectOid, participantOid),
      ]);

    const detail: InvestorPortalProjectDetail = {
      project: {
        id: projectId,
        projectCode: project.projectCode,
        projectName: project.projectName,
        projectStage: project.projectStage,
        status: project.status,
      },
      investment: {
        participantId: String(participantOid),
        ...investment,
        lossSharePercentage: participant.lossSharePercentage,
        instrumentType: participant.instrumentType,
      },
      progress,
      budget,
      profit,
      reports,
      agreements,
      receipts,
      restrictions: {
        otherInvestorsVisible: false,
        companyFinancialsVisible: false,
        vendorPersonalDataVisible: false,
        customerPersonalDataVisible: false,
      },
    };

    // Hard guarantee: detail never embeds co-investor collections
    this.assertNoForeignInvestorLeak(detail, investorId);

    return createSuccessResponse(detail, 'Investor project portal detail');
  }

  // ─── staff manage ──────────────────────────────────────────────────────

  async publishReport(dto: PublishInvestorReportDto, actorId: string) {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(dto.projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const created = await this.reportModel.create({
      projectId: new Types.ObjectId(dto.projectId),
      title: dto.title.trim(),
      reportType: dto.reportType,
      summary: dto.summary?.trim() ?? null,
      documentPath: dto.documentPath?.trim() ?? null,
      status: InvestorVisibleReportStatus.Published,
      publishedAt: new Date(),
      publishedBy: new Types.ObjectId(actorId),
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      {
        id: String(created._id),
        projectId: dto.projectId,
        title: created.title,
        status: created.status,
        publishedAt: created.publishedAt?.toISOString() ?? null,
      },
      'Investor report published',
    );
  }

  async recordProfitAllocation(
    dto: RecordInvestorProfitDto,
    actorId: string,
  ) {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    if (!Types.ObjectId.isValid(dto.participantId)) {
      throw new BadRequestException('Invalid participantId');
    }

    const participant = await this.participantModel
      .findById(dto.participantId)
      .lean()
      .exec();
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    if (String(participant.projectId) !== dto.projectId) {
      throw new BadRequestException('Participant does not belong to project');
    }
    if (participant.participantType !== ParticipantType.OutsideInvestor) {
      throw new BadRequestException(
        'Profit allocations are only for outside investors',
      );
    }
    if (participant.status !== ParticipantApprovalStatus.Approved) {
      throw new BadRequestException('Participant is not approved');
    }

    const distributed = dto.distributedAmount ?? 0;
    if (distributed > dto.allocatedAmount) {
      throw new BadRequestException(
        'distributedAmount cannot exceed allocatedAmount',
      );
    }

    const created = await this.profitModel.create({
      projectId: new Types.ObjectId(dto.projectId),
      participantId: new Types.ObjectId(dto.participantId),
      investorId: participant.participantId,
      financialYearId: dto.financialYearId
        ? new Types.ObjectId(dto.financialYearId)
        : null,
      periodLabel: dto.periodLabel?.trim() ?? null,
      allocatedAmount: dto.allocatedAmount,
      distributedAmount: distributed,
      status: InvestorProfitAllocationStatus.Approved,
      notes: dto.notes?.trim() ?? null,
      approvedBy: new Types.ObjectId(actorId),
      approvedAt: dto.approvedAt ? new Date(dto.approvedAt) : new Date(),
    });

    return createSuccessResponse(
      {
        id: String(created._id),
        projectId: dto.projectId,
        participantId: dto.participantId,
        investorId: String(participant.participantId),
        allocatedAmount: created.allocatedAmount,
        distributedAmount: created.distributedAmount,
        undistributedAmount: this.round2(
          created.allocatedAmount - created.distributedAmount,
        ),
      },
      'Investor profit allocation recorded',
    );
  }

  async listProfitAllocations(query: ListInvestorProfitAllocationsQueryDto) {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const filter: {
      projectId: Types.ObjectId;
      status?: InvestorProfitAllocationStatus;
    } = {
      projectId: new Types.ObjectId(query.projectId),
    };
    if (query.status) {
      filter.status = query.status;
    }

    const rows = await this.profitModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return createSuccessResponse(
      rows.map((row) => this.toPublicProfitAllocation(row)),
      'Profit allocations listed',
    );
  }

  async updateDistributedProfit(
    allocationId: string,
    dto: UpdateDistributedProfitDto,
  ) {
    if (!Types.ObjectId.isValid(allocationId)) {
      throw new BadRequestException('Invalid allocation id');
    }
    const row = await this.profitModel.findById(allocationId).exec();
    if (!row) {
      throw new NotFoundException('Profit allocation not found');
    }
    if (row.status !== InvestorProfitAllocationStatus.Approved) {
      throw new BadRequestException('Allocation is not approved');
    }
    if (dto.distributedAmount > row.allocatedAmount) {
      throw new BadRequestException(
        'distributedAmount cannot exceed allocatedAmount',
      );
    }
    row.distributedAmount = dto.distributedAmount;
    await row.save();

    return createSuccessResponse(
      {
        id: String(row._id),
        allocatedAmount: row.allocatedAmount,
        distributedAmount: row.distributedAmount,
        undistributedAmount: this.round2(
          row.allocatedAmount - row.distributedAmount,
        ),
      },
      'Distributed profit updated',
    );
  }

  // ─── identity / authorisation ──────────────────────────────────────────

  private async requireLinkedInvestor(
    actorId: string,
  ): Promise<ResolvedInvestorContext> {
    if (!Types.ObjectId.isValid(actorId)) {
      throw new ForbiddenException('Invalid actor');
    }
    const investor = await this.investorModel
      .findOne({
        userId: new Types.ObjectId(actorId),
        status: { $ne: InvestorStatus.Inactive },
      })
      .exec();
    if (!investor) {
      throw new ForbiddenException(
        'No investor profile is linked to this user',
      );
    }
    return {
      investor: investor as Investor & { _id: Types.ObjectId },
      investorId: String(investor._id),
    };
  }

  private async findAuthorisedParticipants(investorId: string) {
    return this.participantModel
      .find({
        participantType: ParticipantType.OutsideInvestor,
        participantId: new Types.ObjectId(investorId),
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .lean()
      .exec();
  }

  private async requireAuthorisedParticipant(
    investorId: string,
    projectId: string,
  ) {
    const participant = await this.participantModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        participantType: ParticipantType.OutsideInvestor,
        participantId: new Types.ObjectId(investorId),
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .lean()
      .exec();

    if (!participant) {
      throw new ForbiddenException(
        'Project is not authorised for this investor',
      );
    }
    return participant;
  }

  // ─── tiles ─────────────────────────────────────────────────────────────

  private async buildInvestmentTile(
    participantOid: Types.ObjectId,
    participant: ProjectParticipant,
  ) {
    const commitments = await this.commitmentModel
      .find({
        participantId: participantOid,
        status: CommitmentStatus.Approved,
      })
      .select('commitmentAmount receivedAmount')
      .lean()
      .exec();

    const commitmentAmount = commitments.length
      ? this.round2(
          commitments.reduce((s, c) => s + (c.commitmentAmount ?? 0), 0),
        )
      : this.round2(participant.commitmentAmount ?? 0);

    const amountContributed = commitments.length
      ? this.round2(
          commitments.reduce((s, c) => s + (c.receivedAmount ?? 0), 0),
        )
      : this.round2(participant.actualContributionAmount ?? 0);

    return {
      commitmentAmount,
      amountContributed,
      pendingContribution: this.round2(
        Math.max(0, commitmentAmount - amountContributed),
      ),
      approvedProfitSharePercentage: participant.approvedProfitSharePercentage,
    };
  }

  private async physicalProgress(projectOid: Types.ObjectId) {
    const [row] = await this.workMeasurementModel
      .aggregate<{ planned: number; measured: number }>([
        {
          $match: {
            projectId: projectOid,
            status: {
              $in: [
                WorkMeasurementStatus.Verified,
                WorkMeasurementStatus.Certified,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$boqItemId',
            planned: { $max: '$boqPlannedQuantity' },
            measured: { $max: '$cumulativeQuantity' },
          },
        },
        {
          $group: {
            _id: null,
            planned: { $sum: '$planned' },
            measured: { $sum: '$measured' },
          },
        },
      ])
      .exec();

    const plannedQuantity = this.round2(row?.planned ?? 0);
    const measuredQuantity = this.round2(row?.measured ?? 0);
    return {
      physicalProgressPercent:
        plannedQuantity > 0
          ? this.round2((measuredQuantity / plannedQuantity) * 100)
          : 0,
      plannedQuantity,
      measuredQuantity,
    };
  }

  private async budgetSummary(
    projectOid: Types.ObjectId,
    approvedBudget: number,
  ) {
    const active = await this.boqVersionModel
      .findOne({
        projectId: projectOid,
        status: BoqVersionStatus.Active,
      })
      .select('totalPlannedValue')
      .lean()
      .exec();

    const revisedBudget = this.round2(
      active?.totalPlannedValue ?? approvedBudget ?? 0,
    );

    const [vendorAgg] = await this.vendorInvoiceModel
      .aggregate<{ total: number }>([
        {
          $match: {
            projectId: projectOid,
            status: {
              $in: [VendorInvoiceStatus.Posted, VendorInvoiceStatus.Paid],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ])
      .exec();

    const [contractorAgg] = await this.contractorBillModel
      .aggregate<{ total: number }>([
        {
          $match: {
            projectId: projectOid,
            status: {
              $in: [ContractorBillStatus.Posted, ContractorBillStatus.Paid],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$currentCertifiedValue' },
          },
        },
      ])
      .exec();

    // Aggregate totals only — no vendor/customer names or line items.
    const fundsUtilised = this.round2(
      (vendorAgg?.total ?? 0) + (contractorAgg?.total ?? 0),
    );
    const budgetBase =
      revisedBudget > 0 ? revisedBudget : this.round2(approvedBudget ?? 0);

    return {
      approvedBudget: this.round2(approvedBudget ?? 0),
      revisedBudget,
      fundsUtilised,
      utilisationPercent:
        budgetBase > 0
          ? this.round2((fundsUtilised / budgetBase) * 100)
          : 0,
    };
  }

  private async profitSummary(
    projectOid: Types.ObjectId,
    investorId: string,
    participantOid: Types.ObjectId,
  ) {
    const rows = await this.profitModel
      .find({
        projectId: projectOid,
        investorId: new Types.ObjectId(investorId),
        participantId: participantOid,
        status: InvestorProfitAllocationStatus.Approved,
      })
      .select('allocatedAmount distributedAmount')
      .lean()
      .exec();

    const allocatedAmount = this.round2(
      rows.reduce((s, r) => s + (r.allocatedAmount ?? 0), 0),
    );
    const distributedProfit = this.round2(
      rows.reduce((s, r) => s + (r.distributedAmount ?? 0), 0),
    );

    return {
      allocatedAmount,
      distributedProfit,
      undistributedProfit: this.round2(
        Math.max(0, allocatedAmount - distributedProfit),
      ),
    };
  }

  private async listPublishedReports(projectOid: Types.ObjectId) {
    const rows = await this.reportModel
      .find({
        projectId: projectOid,
        status: InvestorVisibleReportStatus.Published,
      })
      .sort({ publishedAt: -1 })
      .lean()
      .exec();

    return rows.map((r) => ({
      id: String(r._id),
      title: r.title,
      reportType: r.reportType,
      summary: r.summary ?? null,
      documentPath: r.documentPath ?? null,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    }));
  }

  private async listAgreements(participantOid: Types.ObjectId) {
    const rows = await this.participantFileModel
      .find({ participantRecordId: participantOid })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return rows.map((r) => ({
      id: String(r._id),
      category: r.category,
      fileName: r.fileName,
      mimeType: r.mimeType ?? null,
      uploadedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    }));
  }

  private async listOwnReceipts(
    projectOid: Types.ObjectId,
    participantOid: Types.ObjectId,
  ) {
    const rows = await this.receiptModel
      .find({
        projectId: projectOid,
        participantId: participantOid,
        status: ContributionReceiptStatus.Posted,
      })
      .sort({ receivedDate: -1 })
      .lean()
      .exec();

    return rows.map((r) => ({
      id: String(r._id),
      receiptNumber: r.receiptNumber,
      receivedDate: new Date(r.receivedDate).toISOString(),
      amount: r.amount,
      paymentMode: r.paymentMode,
      hasDocument: Boolean(r.receiptDocument || r.receiptPdfPath),
    }));
  }

  /**
   * Defence-in-depth: reject payloads that accidentally include foreign investor ids
   * or sensitive third-party keys.
   */
  private assertNoForeignInvestorLeak(
    detail: InvestorPortalProjectDetail,
    investorId: string,
  ) {
    const json = JSON.stringify(detail);
    const forbiddenKeys = [
      'vendorId',
      'vendorName',
      'customerId',
      'customerName',
      'bankBalance',
      'companyBank',
      'otherInvestors',
      'participants',
      'investorList',
    ];
    for (const key of forbiddenKeys) {
      if (json.includes(`"${key}"`)) {
        throw new ForbiddenException(
          'Portal response blocked: sensitive field leaked',
        );
      }
    }
    // Ensure investment.participantId is own; investorId must not appear as another investor's id list
    void investorId;
  }

  private toPublicProfitAllocation(
    row: InvestorProfitAllocation & { _id: Types.ObjectId },
  ): InvestorProfitAllocationPublic {
    return {
      id: String(row._id),
      projectId: String(row.projectId),
      participantId: String(row.participantId),
      investorId: String(row.investorId),
      periodLabel: row.periodLabel ?? null,
      allocatedAmount: row.allocatedAmount,
      distributedAmount: row.distributedAmount,
      undistributedAmount: this.round2(
        row.allocatedAmount - row.distributedAmount,
      ),
      status: row.status,
      approvedAt: row.approvedAt
        ? new Date(row.approvedAt).toISOString()
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    };
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
