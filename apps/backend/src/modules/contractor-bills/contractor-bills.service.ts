import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  CONTRACTOR_BILL_IDEMPOTENCY_SCOPE,
  IdempotencyService,
} from '../../database/services/idempotency.service';
import { DatabaseService } from '../../database/services/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorAgreement,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { JournalService } from '../journal/journal.service';
import {
  JournalEntry,
  JournalPartyType,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type {
  CreateContractorBillDto,
  ListContractorBillsQueryDto,
  PostContractorBillDto,
  RejectContractorBillDto,
  UpdateContractorBillDto,
  WorkflowNoteDto,
} from './dto/contractor-bill.dto';
import {
  type PublicContractorBill,
  toPublicContractorBill,
} from './contractor-bills.mapper';
import {
  assertBillingPeriod,
  assertTransition,
  CERTIFIED_BILL_STATUSES,
  computeAdvanceRecovery,
  computeBillAmounts,
  computeRemainingBillPayable,
  computeRetentionAmount,
  EDITABLE_BILL_STATUSES,
  MEASUREMENT_BLOCKING_BILL_STATUSES,
  normalizePeriodDate,
  roundMoney,
  roundQty,
} from './contractor-bills.validation';
import {
  ContractorBill,
  type ContractorBillDocument,
  ContractorBillStatus,
} from './schemas/contractor-bill.schema';

const JOURNAL_SOURCE_MODULE = 'contractor_bill';
const JOURNAL_SOURCE_ENTITY_TYPE = 'contractor_bill';
const JOURNAL_POSTING_PURPOSE = 'ap_recognition';

@Injectable()
export class ContractorBillsService {
  constructor(
    @InjectModel(ContractorBill.name)
    private readonly billModel: Model<ContractorBill>,
    @InjectModel(ContractorAgreement.name)
    private readonly agreementModel: Model<ContractorAgreement>,
    @InjectModel(WorkMeasurement.name)
    private readonly measurementModel: Model<WorkMeasurement>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    private readonly numberingService: NumberingService,
    private readonly journalService: JournalService,
    private readonly financialYearService: FinancialYearService,
    private readonly idempotencyService: IdempotencyService,
    private readonly databaseService: DatabaseService,
    private readonly auditLogService: AuditLogService,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(dto: CreateContractorBillDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'contractor-bill' },
    );
    await this.requireProject(dto.projectId);
    await this.requireContractor(dto.contractorId);
    const agreement = await this.requireAgreement(dto.agreementId);
    this.assertAgreementMatches(agreement, dto.projectId, dto.contractorId);

    const periodFrom = normalizePeriodDate(
      dto.billingPeriod.from,
      'billingPeriod.from',
    );
    const periodTo = normalizePeriodDate(
      dto.billingPeriod.to,
      'billingPeriod.to',
    );
    assertBillingPeriod(periodFrom, periodTo);

    const built = await this.buildFromMeasurements({
      projectId: dto.projectId,
      contractorId: dto.contractorId,
      agreement,
      measurementIds: dto.measurementIds,
      periodFrom,
      periodTo,
      advanceRecoveryOverride: dto.advanceRecovery,
      materialRecovery: dto.materialRecovery,
      equipmentRecovery: dto.equipmentRecovery,
      labourRecovery: dto.labourRecovery,
      retentionOverride: dto.retention,
      tds: dto.tds,
      penalty: dto.penalty,
      otherDeductions: dto.otherDeductions,
      approvedExtras: dto.approvedExtras,
      priceEscalation: dto.priceEscalation,
      gst: dto.gst,
      excludeBillId: null,
    });

    const raNumber = await this.nextRaNumber(String(agreement._id));
    const billNumber = await this.numberingService.nextCode(
      NumberEntityType.CONTRACTOR_BILL,
      {
        asOf: periodTo,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.billModel.create({
      billNumber,
      raNumber,
      contractorId: new Types.ObjectId(dto.contractorId),
      projectId: new Types.ObjectId(dto.projectId),
      agreementId: agreement._id,
      billingPeriod: { from: periodFrom, to: periodTo },
      measurements: built.measurements,
      previousCertifiedValue: built.previousCertifiedValue,
      currentCertifiedValue: built.amounts.currentCertifiedValue,
      cumulativeValue: built.cumulativeValue,
      approvedExtras: built.amounts.approvedExtras,
      priceEscalation: built.amounts.priceEscalation,
      advanceRecovery: built.amounts.advanceRecovery,
      materialRecovery: built.amounts.materialRecovery,
      equipmentRecovery: built.amounts.equipmentRecovery,
      labourRecovery: built.amounts.labourRecovery,
      retention: built.amounts.retention,
      tds: built.amounts.tds,
      penalty: built.amounts.penalty,
      otherDeductions: built.amounts.otherDeductions,
      gst: built.amounts.gst,
      netPayable: built.amounts.netPayable,
      paidAmount: 0,
      paymentCertificateNumber: null,
      journalEntryId: null,
      invoiceDocument: dto.invoiceDocument?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: ContractorBillStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Contractor running bill created as draft',
    );
  }

  async update(id: string, dto: UpdateContractorBillDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    this.assertEditable(row);

    const agreement = await this.requireAgreement(String(row.agreementId));

    let periodFrom = row.billingPeriod.from;
    let periodTo = row.billingPeriod.to;
    if (dto.billingPeriod) {
      periodFrom = normalizePeriodDate(
        dto.billingPeriod.from,
        'billingPeriod.from',
      );
      periodTo = normalizePeriodDate(dto.billingPeriod.to, 'billingPeriod.to');
      assertBillingPeriod(periodFrom, periodTo);
      row.billingPeriod = { from: periodFrom, to: periodTo };
    }

    const measurementIds =
      dto.measurementIds ??
      row.measurements.map((line) => String(line.measurementId));

    const built = await this.buildFromMeasurements({
      projectId: String(row.projectId),
      contractorId: String(row.contractorId),
      agreement,
      measurementIds,
      periodFrom,
      periodTo,
      advanceRecoveryOverride:
        dto.advanceRecovery !== undefined
          ? dto.advanceRecovery
          : row.advanceRecovery,
      materialRecovery:
        dto.materialRecovery !== undefined
          ? dto.materialRecovery
          : row.materialRecovery,
      equipmentRecovery:
        dto.equipmentRecovery !== undefined
          ? dto.equipmentRecovery
          : (row.equipmentRecovery ?? 0),
      labourRecovery:
        dto.labourRecovery !== undefined
          ? dto.labourRecovery
          : (row.labourRecovery ?? 0),
      retentionOverride:
        dto.retention !== undefined ? dto.retention : row.retention,
      tds: dto.tds !== undefined ? dto.tds : row.tds,
      penalty: dto.penalty !== undefined ? dto.penalty : row.penalty,
      otherDeductions:
        dto.otherDeductions !== undefined
          ? dto.otherDeductions
          : row.otherDeductions,
      approvedExtras:
        dto.approvedExtras !== undefined
          ? dto.approvedExtras
          : (row.approvedExtras ?? 0),
      priceEscalation:
        dto.priceEscalation !== undefined
          ? dto.priceEscalation
          : (row.priceEscalation ?? 0),
      gst: dto.gst !== undefined ? dto.gst : (row.gst ?? 0),
      excludeBillId: String(row._id),
    });

    row.measurements = built.measurements as ContractorBill['measurements'];
    row.markModified('measurements');
    row.previousCertifiedValue = built.previousCertifiedValue;
    row.currentCertifiedValue = built.amounts.currentCertifiedValue;
    row.cumulativeValue = built.cumulativeValue;
    row.approvedExtras = built.amounts.approvedExtras;
    row.priceEscalation = built.amounts.priceEscalation;
    row.advanceRecovery = built.amounts.advanceRecovery;
    row.materialRecovery = built.amounts.materialRecovery;
    row.equipmentRecovery = built.amounts.equipmentRecovery;
    row.labourRecovery = built.amounts.labourRecovery;
    row.retention = built.amounts.retention;
    row.tds = built.amounts.tds;
    row.penalty = built.amounts.penalty;
    row.otherDeductions = built.amounts.otherDeductions;
    row.gst = built.amounts.gst;
    row.netPayable = built.amounts.netPayable;

    if (dto.invoiceDocument !== undefined) {
      row.invoiceDocument = dto.invoiceDocument?.trim() || null;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || null;
    }

    if (row.status === ContractorBillStatus.Rejected) {
      row.status = ContractorBillStatus.Draft;
      row.rejectionReason = null;
      row.rejectedBy = null;
      row.rejectedAt = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Contractor running bill updated',
    );
  }

  async submitClaim(id: string, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.Claimed, [
      ContractorBillStatus.Draft,
      ContractorBillStatus.Rejected,
    ]);
    this.assertReadyForClaim(row);

    row.status = ContractorBillStatus.Claimed;
    row.claimedBy = new Types.ObjectId(actorId);
    row.claimedAt = new Date();
    row.rejectionReason = null;
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Contractor claim submitted',
    );
  }

  async engineerVerify(id: string, dto: WorkflowNoteDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(
      row.status,
      ContractorBillStatus.EngineerVerified,
      [ContractorBillStatus.Claimed],
    );
    if (row.claimedBy && String(row.claimedBy) === actorId) {
      throw new ForbiddenException(
        'Engineer verifier cannot be the same user who submitted the claim',
      );
    }

    row.status = ContractorBillStatus.EngineerVerified;
    row.engineerVerifiedBy = new Types.ObjectId(actorId);
    row.engineerVerifiedAt = new Date();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || row.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill verified by engineer',
    );
  }

  async pmCertify(id: string, dto: WorkflowNoteDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.PmCertified, [
      ContractorBillStatus.EngineerVerified,
    ]);

    row.status = ContractorBillStatus.PmCertified;
    row.pmCertifiedBy = new Types.ObjectId(actorId);
    row.pmCertifiedAt = new Date();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || row.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill certified by project manager',
    );
  }

  async financeVerify(id: string, dto: WorkflowNoteDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.FinanceVerified, [
      ContractorBillStatus.PmCertified,
    ]);

    row.status = ContractorBillStatus.FinanceVerified;
    row.financeVerifiedBy = new Types.ObjectId(actorId);
    row.financeVerifiedAt = new Date();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || row.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill verified by finance',
    );
  }

  async directorApprove(id: string, dto: WorkflowNoteDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.DirectorApproved, [
      ContractorBillStatus.FinanceVerified,
    ]);

    row.status = ContractorBillStatus.DirectorApproved;
    row.directorApprovedBy = new Types.ObjectId(actorId);
    row.directorApprovedAt = new Date();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || row.notes;
    this.applyPaymentCertificateNumber(row, dto.paymentCertificateNumber);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill approved by director',
    );
  }

  async post(id: string, actorId: string, dto: PostContractorBillDto = {}) {
    const existing = await this.requireBill(id, actorId, 'update');
    if (
      (existing.status === ContractorBillStatus.Posted ||
        existing.status === ContractorBillStatus.PartiallyPaid ||
        existing.status === ContractorBillStatus.Paid ||
        existing.status === ContractorBillStatus.Closed) &&
      existing.journalEntryId
    ) {
      return createSuccessResponse(
        toPublicContractorBill(existing),
        'Running bill already posted',
      );
    }

    const postKey = `ctr-bill-post:${String(existing._id)}`;
    const requestHash = this.idempotencyService.hashRequest({
      billId: String(existing._id),
      action: 'post',
      paymentCertificateNumber: dto.paymentCertificateNumber ?? null,
    });

    const begin = await this.idempotencyService.begin({
      key: postKey,
      scope: CONTRACTOR_BILL_IDEMPOTENCY_SCOPE,
      userId: actorId,
      requestHash,
    });
    if (begin.outcome === 'replay') {
      return begin.response as unknown as ApiResponseDto<PublicContractorBill>;
    }

    try {
      const response = await this.executePost(id, actorId, dto);
      await this.idempotencyService.complete(
        postKey,
        CONTRACTOR_BILL_IDEMPOTENCY_SCOPE,
        response as unknown as Record<string, unknown>,
      );
      return response;
    } catch (error) {
      await this.idempotencyService.fail(
        postKey,
        CONTRACTOR_BILL_IDEMPOTENCY_SCOPE,
      );
      throw error;
    }
  }

  private async executePost(
    id: string,
    actorId: string,
    dto: PostContractorBillDto = {},
  ) {
    const existing = await this.requireBill(id, actorId, 'update');

    if (
      (existing.status === ContractorBillStatus.Posted ||
        existing.status === ContractorBillStatus.PartiallyPaid ||
        existing.status === ContractorBillStatus.Paid ||
        existing.status === ContractorBillStatus.Closed) &&
      existing.journalEntryId
    ) {
      return createSuccessResponse(
        toPublicContractorBill(existing),
        'Running bill already posted',
      );
    }

    assertTransition(existing.status, ContractorBillStatus.Posted, [
      ContractorBillStatus.DirectorApproved,
    ]);

    const previousStatus = existing.status;

    const posted = await this.databaseService.withTransaction(async (session) =>
      this.postBillInTransaction(id, actorId, session, dto),
    );

    await this.auditLogService.record({
      userId: actorId,
      action: AuditAction.POST,
      module: 'contractor_bill',
      entityType: 'contractor_bill',
      entityId: String(posted._id),
      projectId: String(posted.projectId),
      beforeData: {
        status: previousStatus,
        journalEntryId: null,
      },
      afterData: {
        status: posted.status,
        journalEntryId: String(posted.journalEntryId),
        contractorId: String(posted.contractorId),
        agreementId: String(posted.agreementId),
        billNumber: posted.billNumber,
        currentCertifiedValue: posted.currentCertifiedValue,
        retention: posted.retention,
        tds: posted.tds,
        advanceRecovery: posted.advanceRecovery,
        materialRecovery: posted.materialRecovery,
        penalty: posted.penalty,
        otherDeductions: posted.otherDeductions,
        netPayable: posted.netPayable,
      },
    });

    return createSuccessResponse(
      toPublicContractorBill(posted),
      'Running bill posted',
    );
  }

  private async postBillInTransaction(
    id: string,
    actorId: string,
    session: ClientSession,
    dto: PostContractorBillDto = {},
  ): Promise<ContractorBillDocument> {
    const lockedQuery = this.billModel.findById(id).session(session);
    const row = await lockedQuery.exec();
    if (!row) {
      throw new NotFoundException('Contractor bill not found');
    }

    if (
      (row.status === ContractorBillStatus.Posted ||
        row.status === ContractorBillStatus.PartiallyPaid ||
        row.status === ContractorBillStatus.Paid ||
        row.status === ContractorBillStatus.Closed) &&
      row.journalEntryId
    ) {
      return row;
    }

    if (row.status !== ContractorBillStatus.DirectorApproved) {
      throw new ConflictException(
        'Contractor bill is no longer in a postable state',
      );
    }

    this.assertPostableAmounts(row);
    this.applyPaymentCertificateNumber(row, dto.paymentCertificateNumber);
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || row.notes;
    }

    const project = await this.requireProject(String(row.projectId));
    await this.requireContractor(String(row.contractorId));
    const agreement = await this.requireAgreement(String(row.agreementId));

    const journalDate = row.directorApprovedAt ?? row.billingPeriod.to;
    await this.financialYearService.assertPostingAllowed(
      journalDate,
      project.companyId ? String(project.companyId) : undefined,
    );

    const amounts = computeBillAmounts({
      currentCertifiedValue: row.currentCertifiedValue,
      approvedExtras: row.approvedExtras ?? 0,
      priceEscalation: row.priceEscalation ?? 0,
      advanceRecovery: row.advanceRecovery,
      materialRecovery: row.materialRecovery,
      equipmentRecovery: row.equipmentRecovery ?? 0,
      labourRecovery: row.labourRecovery ?? 0,
      retention: row.retention,
      tds: row.tds,
      penalty: row.penalty,
      otherDeductions: row.otherDeductions,
      gst: row.gst ?? 0,
    });
    if (Math.abs(amounts.netPayable - row.netPayable) > 0.005) {
      throw new BadRequestException(
        'Bill netPayable does not match certified gross and deductions',
      );
    }
    if (
      Math.abs(
        roundMoney(row.previousCertifiedValue + row.currentCertifiedValue) -
          row.cumulativeValue,
      ) > 0.005
    ) {
      throw new BadRequestException(
        'Bill cumulativeValue does not equal previous + current certified value',
      );
    }

    await this.assertAdvanceRecoverySupported(row, agreement, amounts, session);

    const journalId = await this.createOrReuseApJournal(
      row,
      actorId,
      amounts,
      session,
    );

    if (
      row.journalEntryId &&
      String(row.journalEntryId) !== journalId
    ) {
      throw new ConflictException(
        'Contractor bill already linked to a different journal',
      );
    }

    row.journalEntryId = new Types.ObjectId(journalId);
    row.status = ContractorBillStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save({ session });
    return row;
  }

  private assertPostableAmounts(row: ContractorBillDocument) {
    if (!row.measurements?.length) {
      throw new BadRequestException('Bill must include measurements');
    }
    if (row.currentCertifiedValue <= 0) {
      throw new BadRequestException(
        'Cannot post a bill with zero or negative certified value',
      );
    }
    for (const line of row.measurements) {
      if (line.currentQuantity < 0) {
        throw new BadRequestException(
          'Current certified quantity cannot be negative',
        );
      }
      const expectedCumulative = roundQty(
        line.previousQuantity + line.currentQuantity,
      );
      if (Math.abs(expectedCumulative - line.cumulativeQuantity) > 0.000001) {
        throw new BadRequestException(
          'Cumulative quantity must equal previous + current',
        );
      }
    }
  }

  private async createOrReuseApJournal(
    row: ContractorBillDocument,
    actorId: string,
    amounts: ReturnType<typeof computeBillAmounts>,
    session: ClientSession,
  ): Promise<string> {
    const billId = String(row._id);
    const existingQuery = this.journalModel
      .findOne({
        sourceModule: JOURNAL_SOURCE_MODULE,
        sourceEntityType: JOURNAL_SOURCE_ENTITY_TYPE,
        sourceEntityId: billId,
        postingPurpose: JOURNAL_POSTING_PURPOSE,
        status: {
          $in: [
            JournalStatus.Posted,
            JournalStatus.Draft,
            JournalStatus.PendingApproval,
          ],
        },
      })
      .session(session);
    const existing = await existingQuery.exec();

    if (existing) {
      if (existing.status !== JournalStatus.Posted) {
        const posted = await this.journalService.post(
          String(existing._id),
          actorId,
          session,
        );
        const postedId = posted.data?.id;
        if (!postedId) {
          throw new BadRequestException('Journal entry posting failed');
        }
        return postedId;
      }
      return String(existing._id);
    }

    const wip = await this.requireAccountByCategory(
      AccountCategory.WorkInProgress,
    );
    const contractorPayable = await this.requireAccountByCategory(
      AccountCategory.ContractorPayable,
    );
    const retentionPayable = await this.requireAccountByCategory(
      AccountCategory.RetentionPayable,
    );
    const tdsPayable = await this.requireAccountByCategory(
      AccountCategory.TdsPayable,
    );

    const projectId = String(row.projectId);
    const contractorId = String(row.contractorId);
    const journalDate = (row.directorApprovedAt ?? row.billingPeriod.to)
      .toISOString()
      .slice(0, 10);

    type Line = {
      accountId: string;
      debit: number;
      credit: number;
      projectId: string;
      description: string;
      partyType?: JournalPartyType;
      partyId?: string;
    };

    const wipDebit = roundMoney(
      amounts.currentCertifiedValue +
        amounts.approvedExtras +
        amounts.priceEscalation,
    );

    const lines: Line[] = [
      {
        accountId: String(wip._id),
        debit: wipDebit,
        credit: 0,
        projectId,
        description: `Contractor RA ${row.billNumber} certified work`,
      },
    ];

    if (amounts.gst > 0) {
      const inputGst = await this.requireAccountByCategory(
        AccountCategory.InputGst,
      );
      lines.push({
        accountId: String(inputGst._id),
        debit: amounts.gst,
        credit: 0,
        projectId,
        description: `GST on contractor RA ${row.billNumber}`,
      });
    }

    if (amounts.retention > 0) {
      lines.push({
        accountId: String(retentionPayable._id),
        debit: 0,
        credit: amounts.retention,
        projectId,
        description: `Retention withheld ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.tds > 0) {
      lines.push({
        accountId: String(tdsPayable._id),
        debit: 0,
        credit: amounts.tds,
        projectId,
        description: `TDS deducted ${row.billNumber}`,
      });
    }
    if (amounts.advanceRecovery > 0) {
      const contractorAdvance = await this.requireAccountByCategory(
        AccountCategory.ContractorAdvance,
      );
      lines.push({
        accountId: String(contractorAdvance._id),
        debit: 0,
        credit: amounts.advanceRecovery,
        projectId,
        description: `Mobilisation advance recovery ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.materialRecovery > 0) {
      const materialRecovery = await this.requireAccountByCategory(
        AccountCategory.MaterialRecovery,
      );
      lines.push({
        accountId: String(materialRecovery._id),
        debit: 0,
        credit: amounts.materialRecovery,
        projectId,
        description: `Material recovery ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.equipmentRecovery > 0) {
      const otherDeduction = await this.requireAccountByCategory(
        AccountCategory.OtherContractorDeduction,
      );
      lines.push({
        accountId: String(otherDeduction._id),
        debit: 0,
        credit: amounts.equipmentRecovery,
        projectId,
        description: `Equipment recovery ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.labourRecovery > 0) {
      const otherDeduction = await this.requireAccountByCategory(
        AccountCategory.OtherContractorDeduction,
      );
      lines.push({
        accountId: String(otherDeduction._id),
        debit: 0,
        credit: amounts.labourRecovery,
        projectId,
        description: `Labour recovery ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.penalty > 0) {
      const penaltyRecovery = await this.requireAccountByCategory(
        AccountCategory.PenaltyRecovery,
      );
      lines.push({
        accountId: String(penaltyRecovery._id),
        debit: 0,
        credit: amounts.penalty,
        projectId,
        description: `Penalty recovery ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }
    if (amounts.otherDeductions > 0) {
      const otherDeduction = await this.requireAccountByCategory(
        AccountCategory.OtherContractorDeduction,
      );
      lines.push({
        accountId: String(otherDeduction._id),
        debit: 0,
        credit: amounts.otherDeductions,
        projectId,
        description: `Other contractor deduction ${row.billNumber}`,
      });
    }

    if (amounts.netPayable > 0) {
      lines.push({
        accountId: String(contractorPayable._id),
        debit: 0,
        credit: amounts.netPayable,
        projectId,
        description: `Contractor payable ${row.billNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: contractorId,
      });
    }

    if (lines.length < 2) {
      throw new BadRequestException(
        'Bill posting did not produce a balanced journal',
      );
    }

    try {
      const journal = await this.journalService.create(
        {
          journalDate,
          projectId,
          sourceModule: JOURNAL_SOURCE_MODULE,
          sourceEntityType: JOURNAL_SOURCE_ENTITY_TYPE,
          sourceEntityId: billId,
          postingPurpose: JOURNAL_POSTING_PURPOSE,
          narration:
            `Contractor running bill ${row.billNumber} (RA-${row.raNumber})`.slice(
              0,
              500,
            ),
          lines,
          post: true,
        },
        actorId,
        `contractor-bill-journal:${billId}`,
        session,
      );

      const journalId = journal.data?.id;
      if (!journalId) {
        throw new BadRequestException('Journal entry creation failed');
      }
      return journalId;
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
      const raced = await this.journalModel
        .findOne({
          sourceModule: JOURNAL_SOURCE_MODULE,
          sourceEntityType: JOURNAL_SOURCE_ENTITY_TYPE,
          sourceEntityId: billId,
          postingPurpose: JOURNAL_POSTING_PURPOSE,
        })
        .session(session)
        .exec();
      if (!raced) {
        throw error;
      }
      if (raced.status !== JournalStatus.Posted) {
        const posted = await this.journalService.post(
          String(raced._id),
          actorId,
          session,
        );
        const postedId = posted.data?.id;
        if (!postedId) {
          throw new BadRequestException('Journal entry posting failed');
        }
        return postedId;
      }
      return String(raced._id);
    }
  }

  private async assertAdvanceRecoverySupported(
    row: ContractorBillDocument,
    agreement: ContractorAgreement,
    amounts: ReturnType<typeof computeBillAmounts>,
    session: ClientSession,
  ) {
    if (amounts.advanceRecovery <= 0) {
      return;
    }

    const advanceAmount = roundMoney(agreement.advance?.amount ?? 0);
    if (advanceAmount <= 0) {
      throw new BadRequestException(
        'Cannot recover mobilisation advance: agreement has no advance amount',
      );
    }

    if (!agreement.advanceDisbursementJournalId) {
      throw new BadRequestException(
        'Cannot recover mobilisation advance: advance has not been disbursed in the ledger',
      );
    }

    const priorRecovered = await this.sumPriorAdvanceRecovery(
      String(row.agreementId),
      String(row._id),
      session,
    );
    const agreementRemaining = roundMoney(
      Math.max(0, advanceAmount - priorRecovered),
    );
    if (amounts.advanceRecovery - agreementRemaining > 0.005) {
      throw new BadRequestException(
        `advanceRecovery ${amounts.advanceRecovery} exceeds remaining agreement advance ${agreementRemaining}`,
      );
    }

    const contractorAdvance = await this.requireAccountByCategory(
      AccountCategory.ContractorAdvance,
    );
    const glOutstanding = await this.getContractorAdvanceGlBalance({
      accountId: String(contractorAdvance._id),
      contractorId: String(row.contractorId),
      projectId: String(row.projectId),
      session,
    });
    if (amounts.advanceRecovery - glOutstanding > 0.005) {
      throw new BadRequestException(
        `advanceRecovery ${amounts.advanceRecovery} exceeds outstanding contractor advance asset ${glOutstanding}`,
      );
    }
  }

  private async sumPriorAdvanceRecovery(
    agreementId: string,
    excludeBillId: string,
    session: ClientSession,
  ): Promise<number> {
    const prior = await this.billModel
      .find({
        agreementId: new Types.ObjectId(agreementId),
        _id: { $ne: new Types.ObjectId(excludeBillId) },
        status: { $in: [...CERTIFIED_BILL_STATUSES] },
        isDeleted: { $ne: true },
      })
      .session(session)
      .select({ advanceRecovery: 1 })
      .lean()
      .exec();
    return roundMoney(
      prior.reduce((sum, bill) => sum + (bill.advanceRecovery ?? 0), 0),
    );
  }

  private async getContractorAdvanceGlBalance(input: {
    accountId: string;
    contractorId: string;
    projectId: string;
    session: ClientSession;
  }): Promise<number> {
    const rows = await this.journalModel
      .aggregate<{ balance: number }>([
        {
          $match: {
            status: JournalStatus.Posted,
            isDeleted: { $ne: true },
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.accountId': new Types.ObjectId(input.accountId),
            'lines.partyId': new Types.ObjectId(input.contractorId),
            'lines.projectId': new Types.ObjectId(input.projectId),
          },
        },
        {
          $group: {
            _id: null,
            balance: {
              $sum: { $subtract: ['$lines.debit', '$lines.credit'] },
            },
          },
        },
      ])
      .session(input.session)
      .exec();
    return roundMoney(Math.max(0, rows[0]?.balance ?? 0));
  }

  private async requireAccountByCategory(category: AccountCategory) {
    const account = await this.accountModel
      .findOne({
        accountCategory: category,
        status: AccountStatus.Active,
        allowManualPosting: true,
      })
      .exec();
    if (!account) {
      throw new BadRequestException(
        `No active posting account found for category ${category}`,
      );
    }
    return account;
  }

  async markPaid(id: string, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.Paid, [
      ContractorBillStatus.Posted,
      ContractorBillStatus.PartiallyPaid,
    ]);

    const remaining = computeRemainingBillPayable({
      netPayable: row.netPayable,
      paidAmount: row.paidAmount ?? 0,
    });
    if (remaining > 0.005) {
      throw new BadRequestException(
        `Cannot mark paid: remaining payable is ${remaining}. Use contractor payments for partial/full settlement.`,
      );
    }

    row.status = ContractorBillStatus.Paid;
    row.paidBy = new Types.ObjectId(actorId);
    row.paidAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill marked paid',
    );
  }

  /**
   * Increments paidAmount from a posted contractor payment allocation.
   * Sets PartiallyPaid when remaining > 0; Paid when cleared.
   */
  async applyPaymentAllocation(
    billId: string,
    amount: number,
    actorId: string,
  ) {
    const row = await this.requireBill(billId, actorId, 'update');
    if (
      row.status !== ContractorBillStatus.Posted &&
      row.status !== ContractorBillStatus.PartiallyPaid &&
      row.status !== ContractorBillStatus.Paid
    ) {
      throw new BadRequestException(
        `Only posted running bills can receive payments (${row.billNumber})`,
      );
    }

    const applyAmount = roundMoney(amount);
    if (applyAmount <= 0) {
      throw new BadRequestException('Payment allocation amount must be > 0');
    }

    const remaining = computeRemainingBillPayable({
      netPayable: row.netPayable,
      paidAmount: row.paidAmount ?? 0,
    });
    if (applyAmount - remaining > 0.005) {
      throw new BadRequestException(
        `Payment allocation (${applyAmount}) exceeds remaining payable (${remaining}) on bill ${row.billNumber}`,
      );
    }

    row.paidAmount = roundMoney((row.paidAmount ?? 0) + applyAmount);
    const nextRemaining = computeRemainingBillPayable({
      netPayable: row.netPayable,
      paidAmount: row.paidAmount,
    });
    if (nextRemaining <= 0.005) {
      row.paidAmount = roundMoney(row.netPayable);
      row.status = ContractorBillStatus.Paid;
      row.paidBy = new Types.ObjectId(actorId);
      row.paidAt = new Date();
    } else {
      row.status = ContractorBillStatus.PartiallyPaid;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return row;
  }

  /** Paid → Closed (terminal commercial close). */
  async close(id: string, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.Closed, [
      ContractorBillStatus.Paid,
    ]);

    row.status = ContractorBillStatus.Closed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill closed',
    );
  }

  async reject(id: string, dto: RejectContractorBillDto, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    const rejectable = [
      ContractorBillStatus.Claimed,
      ContractorBillStatus.EngineerVerified,
      ContractorBillStatus.PmCertified,
      ContractorBillStatus.FinanceVerified,
    ];
    assertTransition(row.status, ContractorBillStatus.Rejected, rejectable);

    row.status = ContractorBillStatus.Rejected;
    row.rejectionReason = dto.reason.trim();
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill rejected',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireBill(id, actorId, 'update');
    assertTransition(row.status, ContractorBillStatus.Cancelled, [
      ContractorBillStatus.Draft,
      ContractorBillStatus.Rejected,
    ]);

    row.status = ContractorBillStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill cancelled',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireBill(id, actorId, 'read');
    return createSuccessResponse(
      toPublicContractorBill(row),
      'Contractor running bill retrieved',
    );
  }

  async list(query: ListContractorBillsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'contractor-bill' },
      );
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let filter: FilterQuery<ContractorBill> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.agreementId) {
      filter.agreementId = new Types.ObjectId(query.agreementId);
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const [rows, total] = await Promise.all([
      this.billModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.billModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((row) => toPublicContractorBill(row)),
      'Contractor running bills listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  private applyPaymentCertificateNumber(
    row: ContractorBillDocument,
    value?: string | null,
  ) {
    if (value === undefined) return;
    const trimmed = value?.trim() || null;
    if (!trimmed) {
      // Do not clear an existing certificate number once set.
      return;
    }
    row.paymentCertificateNumber = trimmed.toUpperCase();
  }

  private async buildFromMeasurements(input: {
    projectId: string;
    contractorId: string;
    agreement: ContractorAgreement & { _id: Types.ObjectId };
    measurementIds: string[];
    periodFrom: Date;
    periodTo: Date;
    advanceRecoveryOverride?: number | null;
    materialRecovery?: number | null;
    equipmentRecovery?: number | null;
    labourRecovery?: number | null;
    retentionOverride?: number | null;
    tds?: number | null;
    penalty?: number | null;
    otherDeductions?: number | null;
    approvedExtras?: number | null;
    priceEscalation?: number | null;
    gst?: number | null;
    excludeBillId: string | null;
  }) {
    if (!input.measurementIds?.length) {
      throw new BadRequestException('At least one measurement is required');
    }
    const uniqueIds = [...new Set(input.measurementIds.map(String))];
    if (uniqueIds.length !== input.measurementIds.length) {
      throw new BadRequestException('Duplicate measurementIds are not allowed');
    }

    const measurements = await this.measurementModel
      .find({
        _id: { $in: uniqueIds.map((id) => new Types.ObjectId(id)) },
      })
      .lean()
      .exec();

    if (measurements.length !== uniqueIds.length) {
      throw new BadRequestException('One or more measurements were not found');
    }

    for (const measurement of measurements) {
      if (measurement.status !== WorkMeasurementStatus.Verified) {
        throw new BadRequestException(
          `Measurement ${measurement.measurementNumber} must be verified`,
        );
      }
      if (String(measurement.projectId) !== input.projectId) {
        throw new BadRequestException(
          `Measurement ${measurement.measurementNumber} belongs to another project`,
        );
      }
      if (String(measurement.contractorId) !== input.contractorId) {
        throw new BadRequestException(
          `Measurement ${measurement.measurementNumber} belongs to another contractor`,
        );
      }
      const mDate = normalizePeriodDate(
        measurement.measurementDate,
        'measurementDate',
      );
      if (
        mDate.getTime() < input.periodFrom.getTime() ||
        mDate.getTime() > input.periodTo.getTime()
      ) {
        throw new BadRequestException(
          `Measurement ${measurement.measurementNumber} is outside the billing period`,
        );
      }
    }

    await this.assertMeasurementsNotBilled(uniqueIds, input.excludeBillId);

    const priorFilter: FilterQuery<ContractorBill> = {
      agreementId: input.agreement._id,
      status: { $in: [...CERTIFIED_BILL_STATUSES] },
    };
    if (input.excludeBillId) {
      priorFilter._id = { $ne: new Types.ObjectId(input.excludeBillId) };
    }

    const priorBills = await this.billModel.find(priorFilter).lean().exec();
    this.assertBoqQuantitiesNotDoubleBilled(measurements, priorBills);

    const rateByBoq = new Map<string, number>();
    for (const line of input.agreement.boqItems ?? []) {
      if (line.boqItemId) {
        rateByBoq.set(String(line.boqItemId), line.agreedRate);
      }
      if (line.boqCode) {
        rateByBoq.set(line.boqCode.trim().toUpperCase(), line.agreedRate);
      }
    }

    const lines = measurements.map((measurement) => {
      const boqKey = String(measurement.boqItemId);
      const rate =
        rateByBoq.get(boqKey) ??
        (measurement.boqCode
          ? rateByBoq.get(measurement.boqCode.trim().toUpperCase())
          : undefined);
      if (rate == null) {
        throw new BadRequestException(
          `No agreed rate on agreement for BOQ item ${measurement.boqCode ?? boqKey}`,
        );
      }
      const currentQuantity = roundQty(measurement.currentQuantity);
      const amount = roundMoney(currentQuantity * rate);
      return {
        measurementId: measurement._id,
        measurementNumber: measurement.measurementNumber,
        boqItemId: measurement.boqItemId,
        boqCode: measurement.boqCode ?? null,
        description: measurement.location ?? null,
        unit: measurement.unit,
        previousQuantity: roundQty(measurement.previousQuantity),
        currentQuantity,
        cumulativeQuantity: roundQty(measurement.cumulativeQuantity),
        rate: roundMoney(rate),
        amount,
      };
    });

    const currentCertifiedValue = roundMoney(
      lines.reduce((sum, line) => sum + line.amount, 0),
    );

    const previousCertifiedValue = roundMoney(
      priorBills.reduce((sum, bill) => sum + bill.currentCertifiedValue, 0),
    );
    const alreadyRecovered = roundMoney(
      priorBills.reduce((sum, bill) => sum + bill.advanceRecovery, 0),
    );

    const retention =
      input.retentionOverride != null
        ? roundMoney(input.retentionOverride)
        : computeRetentionAmount(
            currentCertifiedValue,
            input.agreement.retentionPercentage ?? 0,
          );

    const advanceRecovery = computeAdvanceRecovery({
      currentCertifiedValue,
      advanceAmount: input.agreement.advance?.amount ?? 0,
      alreadyRecovered,
      percentPerBill: input.agreement.recoveryPlan?.percentPerBill,
      overrideAmount: input.advanceRecoveryOverride,
    });

    const amounts = computeBillAmounts({
      currentCertifiedValue,
      approvedExtras: input.approvedExtras ?? 0,
      priceEscalation: input.priceEscalation ?? 0,
      advanceRecovery,
      materialRecovery: input.materialRecovery ?? 0,
      equipmentRecovery: input.equipmentRecovery ?? 0,
      labourRecovery: input.labourRecovery ?? 0,
      retention,
      tds: input.tds ?? 0,
      penalty: input.penalty ?? 0,
      otherDeductions: input.otherDeductions ?? 0,
      gst: input.gst ?? 0,
    });

    return {
      measurements: lines,
      previousCertifiedValue,
      cumulativeValue: roundMoney(
        previousCertifiedValue + amounts.currentCertifiedValue,
      ),
      amounts,
    };
  }

  /**
   * Blocks re-use of a measurement on any non-rejected/cancelled bill.
   * Also surfaces already-certified measurements with an explicit conflict.
   */
  private async assertMeasurementsNotBilled(
    measurementIds: string[],
    excludeBillId: string | null,
  ) {
    const objectIds = measurementIds.map((id) => new Types.ObjectId(id));
    const filter: FilterQuery<ContractorBill> = {
      'measurements.measurementId': { $in: objectIds },
      status: { $in: [...MEASUREMENT_BLOCKING_BILL_STATUSES] },
    };
    if (excludeBillId) {
      filter._id = { $ne: new Types.ObjectId(excludeBillId) };
    }
    const existing = await this.billModel.findOne(filter).lean().exec();
    if (existing) {
      const certified = CERTIFIED_BILL_STATUSES.includes(
        existing.status as (typeof CERTIFIED_BILL_STATUSES)[number],
      );
      throw new ConflictException(
        certified
          ? `One or more measurements were already certified on bill ${existing.billNumber}`
          : `One or more measurements are already on bill ${existing.billNumber}`,
      );
    }
  }

  /**
   * Prevents double-billing of previously certified BOQ quantities.
   * For each BOQ item: priorCertifiedQty + Σ current on this bill
   * must equal the max cumulativeQuantity among selected measurements.
   */
  private assertBoqQuantitiesNotDoubleBilled(
    measurements: Array<{
      measurementNumber?: string | null;
      boqItemId: Types.ObjectId | string;
      currentQuantity: number;
      cumulativeQuantity: number;
    }>,
    priorBills: Array<{
      billNumber: string;
      measurements?: Array<{
        boqItemId: Types.ObjectId | string;
        currentQuantity: number;
      }>;
    }>,
  ) {
    const priorQtyByBoq = new Map<string, number>();
    for (const bill of priorBills) {
      for (const line of bill.measurements ?? []) {
        const key = String(line.boqItemId);
        priorQtyByBoq.set(
          key,
          roundQty((priorQtyByBoq.get(key) ?? 0) + line.currentQuantity),
        );
      }
    }

    const selectedByBoq = new Map<
      string,
      { currentSum: number; maxCumulative: number; sampleNumber: string }
    >();
    for (const measurement of measurements) {
      const key = String(measurement.boqItemId);
      const existing = selectedByBoq.get(key) ?? {
        currentSum: 0,
        maxCumulative: 0,
        sampleNumber: measurement.measurementNumber ?? key,
      };
      existing.currentSum = roundQty(
        existing.currentSum + measurement.currentQuantity,
      );
      existing.maxCumulative = Math.max(
        existing.maxCumulative,
        roundQty(measurement.cumulativeQuantity),
      );
      selectedByBoq.set(key, existing);
    }

    for (const [boqItemId, selected] of selectedByBoq) {
      const priorQty = priorQtyByBoq.get(boqItemId) ?? 0;
      const expectedCumulative = roundQty(priorQty + selected.currentSum);
      if (Math.abs(expectedCumulative - selected.maxCumulative) > 0.000001) {
        throw new ConflictException(
          `BOQ item on measurement ${selected.sampleNumber} would double-bill certified quantity (prior ${priorQty} + current ${selected.currentSum} ≠ cumulative ${selected.maxCumulative})`,
        );
      }
      if (priorQty > 0 && selected.currentSum <= 0) {
        throw new ConflictException(
          `BOQ item on measurement ${selected.sampleNumber} has no current quantity to bill`,
        );
      }
    }
  }

  private async nextRaNumber(agreementId: string): Promise<number> {
    const latest = await this.billModel
      .findOne({
        agreementId: new Types.ObjectId(agreementId),
        status: { $nin: [ContractorBillStatus.Cancelled] },
      })
      .sort({ raNumber: -1 })
      .lean()
      .exec();
    return (latest?.raNumber ?? 0) + 1;
  }

  private assertReadyForClaim(row: ContractorBill) {
    if (!row.measurements?.length) {
      throw new BadRequestException('Bill must include measurements');
    }
    if (!row.invoiceDocument?.trim()) {
      throw new BadRequestException(
        'invoiceDocument is required before submitting claim',
      );
    }
    if (row.currentCertifiedValue <= 0) {
      throw new BadRequestException('currentCertifiedValue must be > 0');
    }
  }

  private assertEditable(row: ContractorBill) {
    if (
      !EDITABLE_BILL_STATUSES.includes(
        row.status as (typeof EDITABLE_BILL_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('Only draft or rejected bills can be edited');
    }
  }

  private assertAgreementMatches(
    agreement: ContractorAgreement,
    projectId: string,
    contractorId: string,
  ) {
    if (String(agreement.projectId) !== projectId) {
      throw new BadRequestException('Agreement belongs to another project');
    }
    if (String(agreement.contractorId) !== contractorId) {
      throw new BadRequestException('Agreement belongs to another contractor');
    }
    if (agreement.status !== ContractorAgreementStatus.Active) {
      throw new BadRequestException(
        `Agreement is ${agreement.status}; only active agreements can be billed`,
      );
    }
  }

  private async requireBill(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Contractor bill not found');
    }
    const row = await this.billModel.findById(id).exec();
    if (!row) throw new NotFoundException('Contractor bill not found');

    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'contractor-bill', resourceId: id },
      );
    }
    return row;
  }

  private async requireAgreement(agreementId: string) {
    if (!Types.ObjectId.isValid(agreementId)) {
      throw new BadRequestException('Invalid agreementId');
    }
    const agreement = await this.agreementModel.findById(agreementId).exec();
    if (!agreement) throw new NotFoundException('Contractor agreement not found');
    return agreement;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new NotFoundException('Project not found');
    if (
      project.status === ProjectStatus.Cancelled ||
      project.status === ProjectStatus.Closed
    ) {
      throw new BadRequestException(
        `Project is ${project.status}; billing is not allowed`,
      );
    }
    return project;
  }

  private async requireContractor(contractorId: string) {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel
      .findById(contractorId)
      .lean()
      .exec();
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (
      contractor.status === ContractorStatus.Blocked ||
      contractor.status === ContractorStatus.Inactive
    ) {
      throw new BadRequestException(
        `Contractor is ${contractor.status}; billing is not allowed`,
      );
    }
    return contractor;
  }
}
