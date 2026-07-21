import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  collectionExists,
  findSafe,
} from '../site-execution-dashboard/optional-collection.helper';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';

export type CtrReportQuery = {
  projectId?: string;
  companyId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

type ReportScope = {
  projectId: string | null;
  projectOid: Types.ObjectId | null;
  companyId: string | null;
  companyOid: Types.ObjectId | null;
  from: Date | null;
  to: Date | null;
  limit: number;
};

@Injectable()
export class ContractorReportsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(ContractorBill.name)
    private readonly billModel: Model<ContractorBill>,
  ) {}

  async contractorsRegister(query: CtrReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<Contractor> = {};
    if (scope.companyOid) match.companyId = scope.companyOid;

    const rows = await this.contractorModel
      .find(match)
      .sort({ legalName: 1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        companyId: scope.companyId,
        available: true,
        rows: rows.map((c) => ({
          contractorId: String(c._id),
          contractorCode: c.contractorCode,
          legalName: c.legalName,
          tradeName: c.tradeName ?? null,
          contractorType: c.contractorType,
          status: c.status,
          verificationStatus: c.verificationStatus,
          workCategories: c.workCategories ?? [],
          pan: c.pan ?? null,
          gstin: c.gstin ?? null,
          labourLicenceValidTo: c.labourLicence?.validTo
            ? new Date(c.labourLicence.validTo).toISOString()
            : null,
          insuranceValidTo: c.insurance?.validTo
            ? new Date(c.insurance.validTo).toISOString()
            : null,
          contactPerson: c.contact?.contactPerson ?? null,
          phone: c.contact?.phone ?? null,
          email: c.contact?.email ?? null,
        })),
      },
      'Contractor register report',
    );
  }

  async workOrderSummary(query: CtrReportQuery) {
    const scope = this.resolveScope(query);
    const available = await collectionExists(this.connection, 'work_orders');
    if (!available) {
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: false,
          rows: [],
        },
        'Work order summary (module not registered)',
      );
    }

    const filter: Record<string, unknown> = {};
    if (scope.projectOid) filter.projectId = scope.projectOid;
    this.applyDate(filter, 'issuedAt', scope);

    const rows = await findSafe(this.connection, 'work_orders', filter, {
      sort: { createdAt: -1 },
      limit: scope.limit,
    });

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: true,
        rows: rows.map((r) => ({
          workOrderId: String(r._id),
          workOrderNumber: (r.workOrderNumber as string) ?? null,
          contractorId: r.contractorId ? String(r.contractorId) : null,
          projectId: r.projectId ? String(r.projectId) : null,
          status: (r.status as string) ?? null,
          title: (r.title as string) ?? null,
          value: Number(r.value ?? r.orderValue ?? 0),
        })),
      },
      'Work order summary report',
    );
  }

  async raRegister(query: CtrReportQuery) {
    const scope = this.resolveScope(query);
    const available = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!available) {
      return createSuccessResponse(
        { projectId: scope.projectId, available: false, rows: [] },
        'RA register (bills module not registered)',
      );
    }

    const match: FilterQuery<ContractorBill> = {
      isDeleted: { $ne: true },
    };
    if (scope.projectOid) match.projectId = scope.projectOid;
    this.applyDate(match, 'createdAt', scope);

    const rows = await this.billModel
      .find(match)
      .sort({ createdAt: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: true,
        rows: rows.map((b) => ({
          billId: String(b._id),
          billNumber: b.billNumber,
          raNumber: b.raNumber,
          contractorId: String(b.contractorId),
          projectId: String(b.projectId),
          agreementId: String(b.agreementId),
          status: b.status,
          currentCertifiedValue: b.currentCertifiedValue,
          cumulativeValue: b.cumulativeValue,
          retention: b.retention,
          advanceRecovery: b.advanceRecovery,
          materialRecovery: b.materialRecovery,
          tds: b.tds,
          penalty: b.penalty,
          netPayable: b.netPayable,
          paidAmount: b.paidAmount,
          remainingPayable: this.round2(
            Math.max((b.netPayable ?? 0) - (b.paidAmount ?? 0), 0),
          ),
          periodFrom: b.billingPeriod?.from
            ? new Date(b.billingPeriod.from).toISOString()
            : null,
          periodTo: b.billingPeriod?.to
            ? new Date(b.billingPeriod.to).toISOString()
            : null,
        })),
      },
      'RA register report',
    );
  }

  async retentionRegister(query: CtrReportQuery) {
    const scope = this.resolveScope(query);

    const retentionModule = await collectionExists(
      this.connection,
      'contractor_retentions',
    );
    if (retentionModule) {
      const filter: Record<string, unknown> = {};
      if (scope.projectOid) filter.projectId = scope.projectOid;
      const rows = await findSafe(
        this.connection,
        'contractor_retentions',
        filter,
        { sort: { createdAt: -1 }, limit: scope.limit },
      );
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: true,
          source: 'contractor_retentions',
          rows: rows.map((r) => ({
            retentionId: String(r._id),
            contractorId: r.contractorId ? String(r.contractorId) : null,
            projectId: r.projectId ? String(r.projectId) : null,
            billId: r.billId ? String(r.billId) : null,
            amount: Number(r.amount ?? 0),
            status: (r.status as string) ?? null,
            heldAt: r.heldAt
              ? new Date(r.heldAt as Date).toISOString()
              : null,
            releasedAt: r.releasedAt
              ? new Date(r.releasedAt as Date).toISOString()
              : null,
          })),
        },
        'Retention register report',
      );
    }

    const billsAvailable = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!billsAvailable) {
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: false,
          source: null,
          rows: [],
        },
        'Retention register (no source)',
      );
    }

    const match: FilterQuery<ContractorBill> = {
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.PartiallyPaid,
          ContractorBillStatus.Paid,
          ContractorBillStatus.Closed,
        ],
      },
      retention: { $gt: 0 },
      isDeleted: { $ne: true },
    };
    if (scope.projectOid) match.projectId = scope.projectOid;

    const rows = await this.billModel
      .find(match)
      .sort({ postedAt: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: true,
        source: 'contractor_bills',
        rows: rows.map((b) => ({
          billId: String(b._id),
          billNumber: b.billNumber,
          raNumber: b.raNumber,
          contractorId: String(b.contractorId),
          projectId: String(b.projectId),
          retention: b.retention,
          status: b.status,
          heldAt: b.postedAt ? new Date(b.postedAt).toISOString() : null,
          releasedAt: null,
        })),
      },
      'Retention register report (from RA bills)',
    );
  }

  async recoveriesRegister(query: CtrReportQuery) {
    const scope = this.resolveScope(query);

    const recoveryModule = await collectionExists(
      this.connection,
      'contractor_recoveries',
    );
    if (recoveryModule) {
      const filter: Record<string, unknown> = {};
      if (scope.projectOid) filter.projectId = scope.projectOid;
      const rows = await findSafe(
        this.connection,
        'contractor_recoveries',
        filter,
        { sort: { createdAt: -1 }, limit: scope.limit },
      );
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: true,
          source: 'contractor_recoveries',
          rows: rows.map((r) => ({
            recoveryId: String(r._id),
            contractorId: r.contractorId ? String(r.contractorId) : null,
            projectId: r.projectId ? String(r.projectId) : null,
            type: (r.type as string) ?? null,
            amount: Number(r.amount ?? 0),
            status: (r.status as string) ?? null,
          })),
        },
        'Recoveries register report',
      );
    }

    const billsAvailable = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!billsAvailable) {
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: false,
          source: null,
          rows: [],
        },
        'Recoveries register (no source)',
      );
    }

    const match: FilterQuery<ContractorBill> = {
      status: {
        $nin: [
          ContractorBillStatus.Cancelled,
          ContractorBillStatus.Rejected,
        ],
      },
      isDeleted: { $ne: true },
      $or: [
        { advanceRecovery: { $gt: 0 } },
        { materialRecovery: { $gt: 0 } },
        { penalty: { $gt: 0 } },
        { otherDeductions: { $gt: 0 } },
      ],
    };
    if (scope.projectOid) match.projectId = scope.projectOid;

    const rows = await this.billModel
      .find(match)
      .sort({ createdAt: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: true,
        source: 'contractor_bills',
        rows: rows.flatMap((b) => {
          const base = {
            billId: String(b._id),
            billNumber: b.billNumber,
            raNumber: b.raNumber,
            contractorId: String(b.contractorId),
            projectId: String(b.projectId),
            status: b.status,
          };
          const lines: Array<Record<string, unknown>> = [];
          if (b.advanceRecovery > 0) {
            lines.push({
              ...base,
              type: 'advance_recovery',
              amount: b.advanceRecovery,
            });
          }
          if (b.materialRecovery > 0) {
            lines.push({
              ...base,
              type: 'material_recovery',
              amount: b.materialRecovery,
            });
          }
          if (b.penalty > 0) {
            lines.push({ ...base, type: 'penalty', amount: b.penalty });
          }
          if (b.otherDeductions > 0) {
            lines.push({
              ...base,
              type: 'other_deductions',
              amount: b.otherDeductions,
            });
          }
          return lines;
        }),
      },
      'Recoveries register report (from RA bills)',
    );
  }

  /** Convenience: blacklisted / suspended contractors. */
  async statusRegister(query: CtrReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<Contractor> = {
      status: {
        $in: [ContractorStatus.Blocked, ContractorStatus.Suspended],
      },
    };
    if (scope.companyOid) match.companyId = scope.companyOid;

    const rows = await this.contractorModel
      .find(match)
      .sort({ updatedAt: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        companyId: scope.companyId,
        available: true,
        rows: rows.map((c) => ({
          contractorId: String(c._id),
          contractorCode: c.contractorCode,
          legalName: c.legalName,
          status: c.status,
          statusReason: c.statusReason ?? c.blockReason ?? null,
          updatedAt: c.updatedAt
            ? new Date(c.updatedAt).toISOString()
            : null,
        })),
      },
      'Contractor suspension / blacklist register',
    );
  }

  private resolveScope(query: CtrReportQuery): ReportScope {
    let projectOid: Types.ObjectId | null = null;
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      projectOid = new Types.ObjectId(query.projectId);
    }
    let companyOid: Types.ObjectId | null = null;
    if (query.companyId) {
      if (!Types.ObjectId.isValid(query.companyId)) {
        throw new BadRequestException('Invalid companyId');
      }
      companyOid = new Types.ObjectId(query.companyId);
    }
    return {
      projectId: query.projectId ?? null,
      projectOid,
      companyId: query.companyId ?? null,
      companyOid,
      from: query.from ? this.parseDate(query.from, 'from') : null,
      to: query.to ? this.parseDate(query.to, 'to') : null,
      limit: Math.min(Math.max(query.limit ?? 200, 1), 1000),
    };
  }

  private parseDate(value: string, label: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ${label} date`);
    }
    return d;
  }

  private applyDate(
    filter: Record<string, unknown>,
    field: string,
    scope: { from: Date | null; to: Date | null },
  ) {
    if (!scope.from && !scope.to) return;
    const range: Record<string, Date> = {};
    if (scope.from) range.$gte = scope.from;
    if (scope.to) range.$lte = scope.to;
    filter[field] = range;
  }

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }
}
