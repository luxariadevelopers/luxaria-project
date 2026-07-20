import {
  BadRequestException,
  ConflictException,
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
import { DatabaseService } from '../../database/services/database.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { ApprovalsService } from '../approvals/approvals.service';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { JournalService } from '../journal/journal.service';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { Project } from '../projects/schemas/project.schema';
import {
  CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
  CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
} from './contractor-agreements.constants';
import {
  toPublicContractorAgreement,
  toPublicExpiryAlert,
} from './contractor-agreements.mapper';
import {
  assertDateRange,
  assertManpower,
  assertRetentionPercentage,
  computeBoqLineValue,
  daysUntil,
  expiryAlertMessage,
  normalizeSkillMix,
  resolveExpiryAlertType,
  summarizeBoqItems,
} from './contractor-agreements.validation';
import type {
  AmendContractorAgreementDto,
  ApproveContractorAgreementDto,
  CreateContractorAgreementDto,
  DisburseMobilisationAdvanceDto,
  ListContractorAgreementsQueryDto,
  ListExpiryAlertsQueryDto,
  RejectContractorAgreementDto,
  TerminateContractorAgreementDto,
  UpdateContractorAgreementDto,
} from './dto/contractor-agreement.dto';
import {
  AgreementBoqItem,
  ContractorAgreement,
  ContractorAgreementExpiryAlert,
  ContractorAgreementExpiryAlertType,
  ContractorAgreementStatus,
} from './schemas/contractor-agreement.schema';

const EDITABLE: ContractorAgreementStatus[] = [
  ContractorAgreementStatus.Draft,
  ContractorAgreementStatus.Rejected,
];

@Injectable()
export class ContractorAgreementsService {
  constructor(
    @InjectModel(ContractorAgreement.name)
    private readonly agreementModel: Model<ContractorAgreement>,
    @InjectModel(ContractorAgreementExpiryAlert.name)
    private readonly alertModel: Model<ContractorAgreementExpiryAlert>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    private readonly approvalsService: ApprovalsService,
    private readonly journalService: JournalService,
    private readonly financialYearService: FinancialYearService,
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(dto: CreateContractorAgreementDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'contractor-agreement' },
    );
    await this.requireActiveContractor(dto.contractorId);
    await this.requireProject(dto.projectId);

    const startDate = this.parseDate(dto.startDate, 'startDate');
    const endDate = this.parseDate(dto.endDate, 'endDate');
    assertDateRange(startDate, endDate);
    assertManpower(dto.manpowerCommitment);
    assertRetentionPercentage(dto.retentionPercentage);

    const boqItems = this.buildBoqItems(dto.boqItems);
    const summary = summarizeBoqItems(boqItems);

    const agreementNumber = await this.numberingService.nextCode(
      NumberEntityType.CONTRACTOR_AGREEMENT,
      {
        asOf: startDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    try {
      const row = await this.agreementModel.create({
        agreementNumber,
        version: 1,
        supersedesId: null,
        contractorId: new Types.ObjectId(dto.contractorId),
        projectId: new Types.ObjectId(dto.projectId),
        workScope: dto.workScope.trim(),
        boqItems,
        agreedRatesTotal: summary.agreedRatesTotal,
        agreedQuantity: summary.agreedQuantity,
        manpowerCommitment: dto.manpowerCommitment,
        skillMix: normalizeSkillMix(dto.skillMix),
        startDate,
        endDate,
        billingCycle: dto.billingCycle,
        advance: {
          amount: dto.advance?.amount ?? 0,
          terms: dto.advance?.terms?.trim() || null,
        },
        recoveryPlan: {
          method: dto.recoveryPlan?.method?.trim() || null,
          percentPerBill: dto.recoveryPlan?.percentPerBill ?? null,
          notes: dto.recoveryPlan?.notes?.trim() || null,
        },
        retentionPercentage: dto.retentionPercentage,
        penalties: dto.penalties?.trim() || null,
        safetyTerms: dto.safetyTerms?.trim() || null,
        terminationTerms: dto.terminationTerms?.trim() || null,
        agreementDocument: dto.agreementDocument?.trim() || null,
        status: ContractorAgreementStatus.Draft,
        notes: dto.notes?.trim() || null,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicContractorAgreement(row),
        'Contractor agreement created as draft',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateContractorAgreementDto,
    actorId: string,
  ) {
    const row = await this.requireAgreement(id, actorId, 'update');
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or rejected agreements can be updated',
      );
    }

    this.applyEditableFields(row, dto);
    row.set('updatedBy', new Types.ObjectId(actorId));
    if (row.status === ContractorAgreementStatus.Rejected) {
      row.status = ContractorAgreementStatus.Draft;
      row.rejectionReason = null;
      row.rejectedBy = null;
      row.rejectedAt = null;
    }

    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }

    return createSuccessResponse(
      toPublicContractorAgreement(row),
      'Contractor agreement updated',
    );
  }

  async amend(
    id: string,
    dto: AmendContractorAgreementDto,
    actorId: string,
  ) {
    const current = await this.requireAgreement(id, actorId, 'update');
    if (current.status !== ContractorAgreementStatus.Active) {
      throw new BadRequestException(
        'Only active agreements can be amended; edit the draft instead',
      );
    }

    const open = await this.agreementModel
      .findOne({
        projectId: current.projectId,
        agreementNumber: current.agreementNumber,
        status: {
          $in: [
            ContractorAgreementStatus.Draft,
            ContractorAgreementStatus.PendingApproval,
            ContractorAgreementStatus.Rejected,
          ],
        },
      })
      .exec();
    if (open) {
      throw new ConflictException(
        'A draft or pending amendment already exists for this agreement',
      );
    }

    const startDate = dto.startDate
      ? this.parseDate(dto.startDate, 'startDate')
      : current.startDate;
    const endDate = dto.endDate
      ? this.parseDate(dto.endDate, 'endDate')
      : current.endDate;
    assertDateRange(startDate, endDate);

    const boqItems = dto.boqItems
      ? this.buildBoqItems(dto.boqItems)
      : current.boqItems.map((item) => ({
          boqItemId: item.boqItemId,
          boqCode: item.boqCode,
          description: item.description,
          unit: item.unit,
          agreedQuantity: item.agreedQuantity,
          agreedRate: item.agreedRate,
          agreedValue: item.agreedValue,
        }));
    const summary = summarizeBoqItems(boqItems);
    const manpower =
      dto.manpowerCommitment !== undefined
        ? dto.manpowerCommitment
        : current.manpowerCommitment;
    assertManpower(manpower);
    const retention =
      dto.retentionPercentage !== undefined
        ? dto.retentionPercentage
        : current.retentionPercentage;
    assertRetentionPercentage(retention);

    try {
      const row = await this.agreementModel.create({
        agreementNumber: current.agreementNumber,
        version: current.version + 1,
        supersedesId: current._id,
        contractorId: current.contractorId,
        projectId: current.projectId,
        workScope: dto.workScope?.trim() || current.workScope,
        boqItems,
        agreedRatesTotal: summary.agreedRatesTotal,
        agreedQuantity: summary.agreedQuantity,
        manpowerCommitment: manpower,
        skillMix: dto.skillMix
          ? normalizeSkillMix(dto.skillMix)
          : current.skillMix,
        startDate,
        endDate,
        billingCycle: dto.billingCycle ?? current.billingCycle,
        advance: dto.advance
          ? {
              amount: dto.advance.amount ?? 0,
              terms: dto.advance.terms?.trim() || null,
            }
          : current.advance,
        recoveryPlan: dto.recoveryPlan
          ? {
              method: dto.recoveryPlan.method?.trim() || null,
              percentPerBill: dto.recoveryPlan.percentPerBill ?? null,
              notes: dto.recoveryPlan.notes?.trim() || null,
            }
          : current.recoveryPlan,
        retentionPercentage: retention,
        penalties:
          dto.penalties !== undefined
            ? dto.penalties?.trim() || null
            : current.penalties,
        safetyTerms:
          dto.safetyTerms !== undefined
            ? dto.safetyTerms?.trim() || null
            : current.safetyTerms,
        terminationTerms:
          dto.terminationTerms !== undefined
            ? dto.terminationTerms?.trim() || null
            : current.terminationTerms,
        agreementDocument:
          dto.agreementDocument !== undefined
            ? dto.agreementDocument?.trim() || null
            : current.agreementDocument,
        status: ContractorAgreementStatus.Draft,
        notes:
          dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
        createdBy: new Types.ObjectId(actorId),
      });

      return createSuccessResponse(
        toPublicContractorAgreement(row),
        'Agreement amendment created as draft (history preserved)',
      );
    } catch (error) {
      this.rethrowDuplicateKey(error);
      throw error;
    }
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requireAgreement(id, actorId, 'update');
    if (!EDITABLE.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or rejected agreements can be submitted for approval',
      );
    }
    if (!row.boqItems?.length) {
      throw new BadRequestException('At least one BOQ item is required');
    }

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: CONTRACTOR_AGREEMENT_APPROVAL_MODULE,
        entityType: CONTRACTOR_AGREEMENT_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount: row.agreedRatesTotal,
        reason: `Contractor agreement ${row.agreementNumber} v${row.version}`,
        submit: true,
      },
      actorId,
    );

    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = ContractorAgreementStatus.PendingApproval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorAgreement(row),
      'Contractor agreement submitted for approval',
    );
  }

  async approve(
    id: string,
    dto: ApproveContractorAgreementDto,
    actorId: string,
  ) {
    const row = await this.requireAgreement(id, actorId, 'update');
    if (row.status !== ContractorAgreementStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval agreements can be approved',
      );
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    const approval = await this.approvalsService.approve(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      { comment: dto.comment ?? 'Contractor agreement approved' },
    );

    if (approval.data?.status === ApprovalStatus.Approved) {
      await this.activateApproved(row, actorId);
    } else {
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
    }

    const fresh = await this.requireAgreement(id, actorId, 'update');
    return createSuccessResponse(
      toPublicContractorAgreement(fresh),
      fresh.status === ContractorAgreementStatus.Active
        ? 'Contractor agreement approved and activated'
        : 'Contractor agreement approval step completed',
    );
  }

  async reject(
    id: string,
    dto: RejectContractorAgreementDto,
    actorId: string,
  ) {
    const row = await this.requireAgreement(id, actorId, 'update');
    if (row.status !== ContractorAgreementStatus.PendingApproval) {
      throw new BadRequestException(
        'Only pending-approval agreements can be rejected',
      );
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    await this.approvalsService.reject(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      { comment: dto.reason },
    );

    row.status = ContractorAgreementStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorAgreement(row),
      'Contractor agreement rejected',
    );
  }

  async terminate(
    id: string,
    dto: TerminateContractorAgreementDto,
    actorId: string,
  ) {
    const row = await this.requireAgreement(id, actorId, 'update');
    if (row.status !== ContractorAgreementStatus.Active) {
      throw new BadRequestException('Only active agreements can be terminated');
    }

    row.status = ContractorAgreementStatus.Terminated;
    row.terminatedBy = new Types.ObjectId(actorId);
    row.terminatedAt = new Date();
    row.terminationReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorAgreement(row),
      'Contractor agreement terminated',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireAgreement(id, actorId, 'read');
    return createSuccessResponse(
      toPublicContractorAgreement(row),
      'Contractor agreement fetched',
    );
  }

  async listVersions(agreementNumber: string, projectId?: string) {
    const filter: FilterQuery<ContractorAgreement> = {
      agreementNumber: agreementNumber.trim().toUpperCase(),
    };
    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter.projectId = new Types.ObjectId(projectId);
    }

    const rows = await this.agreementModel
      .find(filter)
      .sort({ version: 1 })
      .exec();

    return createSuccessResponse(
      rows.map((row) => toPublicContractorAgreement(row)),
      'Agreement version history fetched',
    );
  }

  async list(query: ListContractorAgreementsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'contractor-agreement' },
      );
    }
    let filter: FilterQuery<ContractorAgreement> = {};
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      if (!Types.ObjectId.isValid(query.contractorId)) {
        throw new BadRequestException('Invalid contractorId');
      }
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.status) filter.status = query.status;
    if (query.agreementNumber?.trim()) {
      filter.agreementNumber = query.agreementNumber.trim().toUpperCase();
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort: Record<string, SortOrder> = { createdAt: -1 };

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const [items, total] = await Promise.all([
      this.agreementModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.agreementModel.countDocuments(filter),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicContractorAgreement(item)),
      'Contractor agreements listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async evaluateExpiryAlerts(asOfInput?: string | Date) {
    const asOf =
      asOfInput instanceof Date
        ? asOfInput
        : asOfInput
          ? this.parseDate(asOfInput, 'asOf')
          : new Date();
    const warningDays = this.configService.get(
      'contractorAgreementExpiryWarningDays',
      { infer: true },
    );

    const active = await this.agreementModel
      .find({ status: ContractorAgreementStatus.Active })
      .lean()
      .exec();

    let created = 0;
    let expiredMarked = 0;
    const alerts = [];

    for (const agreement of active) {
      const remaining = daysUntil(agreement.endDate, asOf);
      const alertType = resolveExpiryAlertType({
        daysRemaining: remaining,
        warningDays,
      });
      if (!alertType) continue;

      if (alertType === ContractorAgreementExpiryAlertType.Expired) {
        await this.agreementModel
          .updateOne(
            { _id: agreement._id, status: ContractorAgreementStatus.Active },
            { $set: { status: ContractorAgreementStatus.Expired } },
          )
          .exec();
        expiredMarked += 1;
      }

      const message = expiryAlertMessage({
        agreementNumber: agreement.agreementNumber,
        daysRemaining: remaining,
        alertType,
      });

      const existing = await this.alertModel
        .findOne({
          agreementId: agreement._id,
          alertType,
        })
        .exec();

      if (existing) {
        existing.message = message;
        existing.daysRemaining = remaining;
        existing.endDate = agreement.endDate;
        await existing.save();
        alerts.push(toPublicExpiryAlert(existing));
        continue;
      }

      const alert = await this.alertModel.create({
        agreementId: agreement._id,
        agreementNumber: agreement.agreementNumber,
        projectId: agreement.projectId,
        contractorId: agreement.contractorId,
        endDate: agreement.endDate,
        alertType,
        message,
        daysRemaining: remaining,
        acknowledged: false,
      });
      created += 1;
      alerts.push(toPublicExpiryAlert(alert));
    }

    return createSuccessResponse(
      { asOf, created, expiredMarked, alerts },
      `Agreement expiry evaluation complete (${created} alert(s))`,
    );
  }

  async listExpiryAlerts(query: ListExpiryAlertsQueryDto) {
    const filter: FilterQuery<ContractorAgreementExpiryAlert> = {};
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.alertType) filter.alertType = query.alertType;
    if (
      query.unacknowledgedOnly === true ||
      String(query.unacknowledgedOnly).toLowerCase() === 'true'
    ) {
      filter.acknowledged = false;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ endDate: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicExpiryAlert(item)),
      'Agreement expiry alerts listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async acknowledgeExpiryAlert(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid alert id');
    }
    const alert = await this.alertModel.findById(id).exec();
    if (!alert) {
      throw new NotFoundException('Expiry alert not found');
    }
    alert.acknowledged = true;
    alert.acknowledgedBy = new Types.ObjectId(actorId);
    alert.acknowledgedAt = new Date();
    await alert.save();

    return createSuccessResponse(
      toPublicExpiryAlert(alert),
      'Expiry alert acknowledged',
    );
  }

  async disburseMobilisationAdvance(
    id: string,
    dto: DisburseMobilisationAdvanceDto,
    actorId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid agreement id');
    }

    const agreement = await this.agreementModel.findById(id).exec();
    if (!agreement) {
      throw new NotFoundException('Contractor agreement not found');
    }
    if (agreement.status !== ContractorAgreementStatus.Active) {
      throw new BadRequestException(
        'Only active agreements can disburse mobilisation advance',
      );
    }
    const advanceAmount = Number(agreement.advance?.amount ?? 0);
    if (!(advanceAmount > 0)) {
      throw new BadRequestException('Agreement has no mobilisation advance amount');
    }
    if (agreement.advanceDisbursementJournalId) {
      return createSuccessResponse(
        toPublicContractorAgreement(agreement),
        'Mobilisation advance already disbursed',
      );
    }

    if (!Types.ObjectId.isValid(dto.bankAccountId)) {
      throw new BadRequestException('Invalid bankAccountId');
    }
    const bank = await this.bankModel.findById(dto.bankAccountId).exec();
    if (!bank) {
      throw new NotFoundException('Bank account not found');
    }
    if (bank.status !== BankAccountStatus.Active) {
      throw new BadRequestException('Bank account is not active');
    }
    if (
      bank.projectId &&
      String(bank.projectId) !== String(agreement.projectId)
    ) {
      throw new BadRequestException(
        'Bank account is not available for this project',
      );
    }
    if (!bank.ledgerAccountId) {
      throw new BadRequestException(
        'Bank account is missing ledgerAccountId for posting',
      );
    }

    const contractorAdvance = await this.accountModel
      .findOne({
        accountCategory: AccountCategory.ContractorAdvance,
        status: AccountStatus.Active,
        allowManualPosting: true,
      })
      .exec();
    if (!contractorAdvance) {
      throw new BadRequestException(
        'No active posting account found for category contractor_advance',
      );
    }

    const paymentDate = new Date(dto.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new BadRequestException('Invalid paymentDate');
    }
    await this.financialYearService.assertPostingAllowed(paymentDate);

    const projectId = String(agreement.projectId);
    const contractorId = String(agreement.contractorId);
    const agreementId = String(agreement._id);

    const posted = await this.databaseService.withTransaction(async (session) => {
      const locked = await this.agreementModel
        .findById(agreementId)
        .session(session)
        .exec();
      if (!locked) {
        throw new NotFoundException('Contractor agreement not found');
      }
      if (locked.advanceDisbursementJournalId) {
        return locked;
      }

      const journal = await this.journalService.create(
        {
          journalDate: paymentDate.toISOString().slice(0, 10),
          projectId,
          sourceModule: 'contractor_agreement',
          sourceEntityType: 'contractor_agreement',
          sourceEntityId: agreementId,
          postingPurpose: 'advance_disbursement',
          narration:
            `Mobilisation advance for agreement ${locked.agreementNumber}`.slice(
              0,
              500,
            ),
          lines: [
            {
              accountId: String(contractorAdvance._id),
              debit: advanceAmount,
              credit: 0,
              projectId,
              description: `Mobilisation advance disbursement ${locked.agreementNumber}`,
              partyType: JournalPartyType.Contractor,
              partyId: contractorId,
            },
            {
              accountId: String(bank.ledgerAccountId),
              debit: 0,
              credit: advanceAmount,
              projectId,
              description: `Bank payment ${dto.transactionReference?.trim() || locked.agreementNumber}`,
            },
          ],
          post: true,
        },
        actorId,
        `contractor-advance-disburse:${agreementId}`,
        session,
      );

      const journalId = journal.data?.id;
      if (!journalId) {
        throw new BadRequestException('Advance disbursement journal failed');
      }

      locked.advanceDisbursementJournalId = new Types.ObjectId(journalId);
      locked.advanceDisbursedAt = new Date();
      locked.advanceDisbursedBy = new Types.ObjectId(actorId);
      locked.set('updatedBy', new Types.ObjectId(actorId));
      await locked.save({ session });
      return locked;
    });

    return createSuccessResponse(
      toPublicContractorAgreement(posted),
      'Mobilisation advance disbursed',
    );
  }

  private async activateApproved(
    row: HydratedDocument<ContractorAgreement>,
    actorId: string,
  ) {
    if (row.supersedesId) {
      await this.agreementModel
        .updateOne(
          {
            _id: row.supersedesId,
            status: ContractorAgreementStatus.Active,
          },
          {
            $set: {
              status: ContractorAgreementStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    } else {
      await this.agreementModel
        .updateMany(
          {
            projectId: row.projectId,
            agreementNumber: row.agreementNumber,
            _id: { $ne: row._id },
            status: ContractorAgreementStatus.Active,
          },
          {
            $set: {
              status: ContractorAgreementStatus.Superseded,
              updatedBy: new Types.ObjectId(actorId),
            },
          },
        )
        .exec();
    }

    row.status = ContractorAgreementStatus.Active;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
  }

  private applyEditableFields(
    row: HydratedDocument<ContractorAgreement>,
    dto: UpdateContractorAgreementDto | AmendContractorAgreementDto,
  ) {
    if (dto.contractorId !== undefined) {
      throw new BadRequestException(
        'contractorId cannot be changed after create; amend instead',
      );
    }
    if (dto.projectId !== undefined) {
      throw new BadRequestException(
        'projectId cannot be changed after create; amend instead',
      );
    }
    if (dto.workScope !== undefined) row.workScope = dto.workScope.trim();
    if (dto.boqItems !== undefined) {
      row.boqItems = this.buildBoqItems(dto.boqItems);
      const summary = summarizeBoqItems(row.boqItems);
      row.agreedQuantity = summary.agreedQuantity;
      row.agreedRatesTotal = summary.agreedRatesTotal;
      row.markModified('boqItems');
    }
    if (dto.manpowerCommitment !== undefined) {
      assertManpower(dto.manpowerCommitment);
      row.manpowerCommitment = dto.manpowerCommitment;
    }
    if (dto.skillMix !== undefined) {
      row.skillMix = normalizeSkillMix(dto.skillMix);
      row.markModified('skillMix');
    }
    if (dto.startDate !== undefined || dto.endDate !== undefined) {
      const startDate = dto.startDate
        ? this.parseDate(dto.startDate, 'startDate')
        : row.startDate;
      const endDate = dto.endDate
        ? this.parseDate(dto.endDate, 'endDate')
        : row.endDate;
      assertDateRange(startDate, endDate);
      row.startDate = startDate;
      row.endDate = endDate;
    }
    if (dto.billingCycle !== undefined) row.billingCycle = dto.billingCycle;
    if (dto.advance !== undefined) {
      row.advance = {
        amount: dto.advance.amount ?? 0,
        terms: dto.advance.terms?.trim() || null,
      };
    }
    if (dto.recoveryPlan !== undefined) {
      row.recoveryPlan = {
        method: dto.recoveryPlan.method?.trim() || null,
        percentPerBill: dto.recoveryPlan.percentPerBill ?? null,
        notes: dto.recoveryPlan.notes?.trim() || null,
      };
    }
    if (dto.retentionPercentage !== undefined) {
      assertRetentionPercentage(dto.retentionPercentage);
      row.retentionPercentage = dto.retentionPercentage;
    }
    if (dto.penalties !== undefined) {
      row.penalties = dto.penalties?.trim() || null;
    }
    if (dto.safetyTerms !== undefined) {
      row.safetyTerms = dto.safetyTerms?.trim() || null;
    }
    if (dto.terminationTerms !== undefined) {
      row.terminationTerms = dto.terminationTerms?.trim() || null;
    }
    if (dto.agreementDocument !== undefined) {
      row.agreementDocument = dto.agreementDocument?.trim() || null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
  }

  private buildBoqItems(
    items: CreateContractorAgreementDto['boqItems'],
  ): AgreementBoqItem[] {
    return items.map((item) => {
      const agreedValue = computeBoqLineValue(
        item.agreedQuantity,
        item.agreedRate,
      );
      return {
        boqItemId:
          item.boqItemId && Types.ObjectId.isValid(item.boqItemId)
            ? new Types.ObjectId(item.boqItemId)
            : null,
        boqCode: item.boqCode?.trim().toUpperCase() || null,
        description: item.description.trim(),
        unit: item.unit,
        agreedQuantity: item.agreedQuantity,
        agreedRate: item.agreedRate,
        agreedValue,
      };
    });
  }

  private async requireAgreement(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ): Promise<HydratedDocument<ContractorAgreement>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid agreement id');
    }
    const row = await this.agreementModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Contractor agreement not found');
    }

    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'contractor-agreement', resourceId: id },
      );
    }
    return row;
  }

  private async requireActiveContractor(contractorId: string) {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel.findById(contractorId).exec();
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    if (contractor.status !== ContractorStatus.Active) {
      throw new BadRequestException(
        'Contractor must be active before creating an agreement',
      );
    }
    return contractor;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private rethrowDuplicateKey(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ConflictException(
        'An open or active agreement version already exists for this number',
      );
    }
  }
}
