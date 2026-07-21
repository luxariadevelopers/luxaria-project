import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  aggregateSafe,
  collectionExists,
  countDocumentsSafe,
} from '../site-execution-dashboard/optional-collection.helper';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import type {
  ContractorDashboardKpis,
  ContractorDashboardQuery,
} from './contractor-dashboard.types';

const PENDING_BILL_STATUSES = [
  ContractorBillStatus.Draft,
  ContractorBillStatus.Claimed,
  ContractorBillStatus.EngineerVerified,
  ContractorBillStatus.PmCertified,
  ContractorBillStatus.FinanceVerified,
  ContractorBillStatus.DirectorApproved,
];

const OPEN_WO_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'issued',
  'in_progress',
  'on_hold',
];

@Injectable()
export class ContractorDashboardService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(ContractorBill.name)
    private readonly billModel: Model<ContractorBill>,
  ) {}

  async getKpis(query: ContractorDashboardQuery) {
    const projectOid = this.optionalOid(query.projectId, 'projectId');
    const companyOid = this.optionalOid(query.companyId, 'companyId');
    const withinDays = Math.min(Math.max(query.withinDays ?? 30, 1), 365);

    const [
      openWorkOrders,
      pendingBills,
      retentionHeld,
      outstandingPayable,
      complianceExpiries,
    ] = await Promise.all([
      this.openWorkOrders(projectOid),
      this.pendingBills(projectOid),
      this.retentionHeld(projectOid),
      this.outstandingPayable(projectOid),
      this.complianceExpiries(withinDays, companyOid),
    ]);

    const data: ContractorDashboardKpis = {
      projectId: query.projectId ?? null,
      companyId: query.companyId ?? null,
      asOf: new Date().toISOString(),
      openWorkOrders,
      pendingBills,
      retentionHeld,
      outstandingPayable,
      complianceExpiries,
    };

    return createSuccessResponse(data, 'Contractor dashboard KPIs');
  }

  private async openWorkOrders(projectOid: Types.ObjectId | null) {
    const available = await collectionExists(this.connection, 'work_orders');
    if (!available) {
      return { available: false, count: 0 };
    }
    const filter: Record<string, unknown> = {
      status: { $in: OPEN_WO_STATUSES },
    };
    if (projectOid) filter.projectId = projectOid;
    const count = await countDocumentsSafe(
      this.connection,
      'work_orders',
      filter,
    );
    return { available: true, count };
  }

  private async pendingBills(projectOid: Types.ObjectId | null) {
    const available = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!available) {
      return { available: false, count: 0, amount: 0 };
    }

    const match: FilterQuery<ContractorBill> = {
      status: { $in: PENDING_BILL_STATUSES },
      isDeleted: { $ne: true },
    };
    if (projectOid) match.projectId = projectOid;

    const rows = await this.billModel
      .aggregate<{ count: number; amount: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$netPayable' },
          },
        },
      ])
      .exec();

    return {
      available: true,
      count: rows[0]?.count ?? 0,
      amount: this.round2(rows[0]?.amount ?? 0),
    };
  }

  private async retentionHeld(projectOid: Types.ObjectId | null) {
    const available = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!available) {
      return { available: false, amount: 0 };
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
      isDeleted: { $ne: true },
    };
    if (projectOid) match.projectId = projectOid;

    const rows = await this.billModel
      .aggregate<{ amount: number }>([
        { $match: match },
        { $group: { _id: null, amount: { $sum: '$retention' } } },
      ])
      .exec();

    return {
      available: true,
      amount: this.round2(rows[0]?.amount ?? 0),
    };
  }

  private async outstandingPayable(projectOid: Types.ObjectId | null) {
    const available = await collectionExists(
      this.connection,
      'contractor_bills',
    );
    if (!available) {
      return { available: false, amount: 0 };
    }

    const match: FilterQuery<ContractorBill> = {
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.PartiallyPaid,
        ],
      },
      isDeleted: { $ne: true },
    };
    if (projectOid) match.projectId = projectOid;

    const rows = await this.billModel
      .aggregate<{ amount: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            amount: {
              $sum: { $subtract: ['$netPayable', '$paidAmount'] },
            },
          },
        },
      ])
      .exec();

    return {
      available: true,
      amount: this.round2(Math.max(rows[0]?.amount ?? 0, 0)),
    };
  }

  private async complianceExpiries(
    withinDays: number,
    companyOid: Types.ObjectId | null,
  ) {
    const available = await collectionExists(this.connection, 'contractors');
    if (!available) {
      return {
        available: false,
        withinDays,
        count: 0,
        labourLicence: 0,
        insurance: 0,
      };
    }

    const now = new Date();
    const until = new Date(now);
    until.setUTCDate(until.getUTCDate() + withinDays);

    const base: FilterQuery<Contractor> = {
      status: {
        $in: [
          ContractorStatus.Active,
          ContractorStatus.Suspended,
          ContractorStatus.PendingVerification,
        ],
      },
      isDeleted: { $ne: true },
    };
    if (companyOid) base.companyId = companyOid;

    const [labourLicence, insurance, either] = await Promise.all([
      this.contractorModel.countDocuments({
        ...base,
        'labourLicence.validTo': { $ne: null, $lte: until },
      }),
      this.contractorModel.countDocuments({
        ...base,
        'insurance.validTo': { $ne: null, $lte: until },
      }),
      this.contractorModel.countDocuments({
        ...base,
        $or: [
          { 'labourLicence.validTo': { $ne: null, $lte: until } },
          { 'insurance.validTo': { $ne: null, $lte: until } },
        ],
      }),
    ]);

    // also tolerate empty via aggregateSafe for future collections
    await aggregateSafe(this.connection, 'contractor_retentions', [
      { $match: {} },
      { $limit: 1 },
    ]);

    return {
      available: true,
      withinDays,
      count: either,
      labourLicence,
      insurance,
    };
  }

  private optionalOid(
    value: string | undefined,
    label: string,
  ): Types.ObjectId | null {
    if (!value) return null;
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(value);
  }

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }
}
