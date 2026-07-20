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
import {
  ContractorAgreement,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
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
  RejectContractorBillDto,
  UpdateContractorBillDto,
  WorkflowNoteDto,
} from './dto/contractor-bill.dto';
import { toPublicContractorBill } from './contractor-bills.mapper';
import {
  assertBillingPeriod,
  assertTransition,
  computeAdvanceRecovery,
  computeBillAmounts,
  computeRemainingBillPayable,
  computeRetentionAmount,
  EDITABLE_BILL_STATUSES,
  normalizePeriodDate,
  roundMoney,
  roundQty,
} from './contractor-bills.validation';
import {
  ContractorBill,
  ContractorBillStatus,
} from './schemas/contractor-bill.schema';

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
    private readonly numberingService: NumberingService,
  ) {}

  async create(dto: CreateContractorBillDto, actorId: string) {
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
      retentionOverride: dto.retention,
      tds: dto.tds,
      penalty: dto.penalty,
      otherDeductions: dto.otherDeductions,
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
      advanceRecovery: built.amounts.advanceRecovery,
      materialRecovery: built.amounts.materialRecovery,
      retention: built.amounts.retention,
      tds: built.amounts.tds,
      penalty: built.amounts.penalty,
      otherDeductions: built.amounts.otherDeductions,
      netPayable: built.amounts.netPayable,
      paidAmount: 0,
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
    const row = await this.requireBill(id);
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
      retentionOverride:
        dto.retention !== undefined ? dto.retention : row.retention,
      tds: dto.tds !== undefined ? dto.tds : row.tds,
      penalty: dto.penalty !== undefined ? dto.penalty : row.penalty,
      otherDeductions:
        dto.otherDeductions !== undefined
          ? dto.otherDeductions
          : row.otherDeductions,
      excludeBillId: String(row._id),
    });

    row.measurements = built.measurements as ContractorBill['measurements'];
    row.markModified('measurements');
    row.previousCertifiedValue = built.previousCertifiedValue;
    row.currentCertifiedValue = built.amounts.currentCertifiedValue;
    row.cumulativeValue = built.cumulativeValue;
    row.advanceRecovery = built.amounts.advanceRecovery;
    row.materialRecovery = built.amounts.materialRecovery;
    row.retention = built.amounts.retention;
    row.tds = built.amounts.tds;
    row.penalty = built.amounts.penalty;
    row.otherDeductions = built.amounts.otherDeductions;
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
    const row = await this.requireBill(id);
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
    const row = await this.requireBill(id);
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
    const row = await this.requireBill(id);
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
    const row = await this.requireBill(id);
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
    const row = await this.requireBill(id);
    assertTransition(row.status, ContractorBillStatus.DirectorApproved, [
      ContractorBillStatus.FinanceVerified,
    ]);

    row.status = ContractorBillStatus.DirectorApproved;
    row.directorApprovedBy = new Types.ObjectId(actorId);
    row.directorApprovedAt = new Date();
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || row.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill approved by director',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireBill(id);
    assertTransition(row.status, ContractorBillStatus.Posted, [
      ContractorBillStatus.DirectorApproved,
    ]);

    row.status = ContractorBillStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorBill(row),
      'Running bill posted',
    );
  }

  async markPaid(id: string, actorId: string) {
    const row = await this.requireBill(id);
    assertTransition(row.status, ContractorBillStatus.Paid, [
      ContractorBillStatus.Posted,
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
   * Marks bill Paid when remaining payable is cleared.
   */
  async applyPaymentAllocation(
    billId: string,
    amount: number,
    actorId: string,
  ) {
    const row = await this.requireBill(billId);
    if (
      row.status !== ContractorBillStatus.Posted &&
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
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return row;
  }

  async reject(id: string, dto: RejectContractorBillDto, actorId: string) {
    const row = await this.requireBill(id);
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
    const row = await this.requireBill(id);
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

  async getById(id: string) {
    const row = await this.requireBill(id);
    return createSuccessResponse(
      toPublicContractorBill(row),
      'Contractor running bill retrieved',
    );
  }

  async list(query: ListContractorBillsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorBill> = {};

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

  private async buildFromMeasurements(input: {
    projectId: string;
    contractorId: string;
    agreement: ContractorAgreement & { _id: Types.ObjectId };
    measurementIds: string[];
    periodFrom: Date;
    periodTo: Date;
    advanceRecoveryOverride?: number | null;
    materialRecovery?: number | null;
    retentionOverride?: number | null;
    tds?: number | null;
    penalty?: number | null;
    otherDeductions?: number | null;
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

    const priorFilter: FilterQuery<ContractorBill> = {
      agreementId: input.agreement._id,
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.Paid,
        ],
      },
    };
    if (input.excludeBillId) {
      priorFilter._id = { $ne: new Types.ObjectId(input.excludeBillId) };
    }

    const priorBills = await this.billModel.find(priorFilter).lean().exec();
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
      advanceRecovery,
      materialRecovery: input.materialRecovery ?? 0,
      retention,
      tds: input.tds ?? 0,
      penalty: input.penalty ?? 0,
      otherDeductions: input.otherDeductions ?? 0,
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

  private async assertMeasurementsNotBilled(
    measurementIds: string[],
    excludeBillId: string | null,
  ) {
    const filter: FilterQuery<ContractorBill> = {
      'measurements.measurementId': {
        $in: measurementIds.map((id) => new Types.ObjectId(id)),
      },
      status: { $nin: [ContractorBillStatus.Cancelled, ContractorBillStatus.Rejected] },
    };
    if (excludeBillId) {
      filter._id = { $ne: new Types.ObjectId(excludeBillId) };
    }
    const existing = await this.billModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        `One or more measurements are already on bill ${existing.billNumber}`,
      );
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

  private async requireBill(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Contractor bill not found');
    }
    const row = await this.billModel.findById(id).exec();
    if (!row) throw new NotFoundException('Contractor bill not found');
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
