import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  Booking,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import {
  CustomerReceipt,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { Lead, LeadStatus } from '../leads/schemas/lead.schema';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import type {
  SalesDashboardKpis,
  SalesDashboardQuery,
} from './sales-dashboard.types';

const NOT_DELETED = { isDeleted: { $ne: true } } as const;

const RESERVATION_STATUSES = [
  BookingStatus.Hold,
  BookingStatus.Reserved,
  BookingStatus.PendingApproval,
];

const BOOKED_STATUSES = [
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

@Injectable()
export class SalesDashboardService {
  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<Lead>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(PaymentDemand.name)
    private readonly demandModel: Model<PaymentDemand>,
    @InjectModel(CustomerReceipt.name)
    private readonly receiptModel: Model<CustomerReceipt>,
  ) {}

  async getSummary(query: SalesDashboardQuery) {
    const projectOid = this.optionalOid(query.projectId, 'projectId');
    const companyOid = this.optionalOid(query.companyId, 'companyId');

    const leadFilter = this.scopeFilter({ projectOid, companyOid });
    const bookingFilter = this.bookingScopeFilter(projectOid);
    const demandFilter = this.demandScopeFilter(projectOid);
    const receiptFilter = this.receiptScopeFilter(projectOid);

    const [
      leadsTotal,
      leadsByStatusRows,
      conversions,
      reservations,
      bookings,
      salesValueAgg,
      demandAgg,
      receiptAgg,
      outstandingAgg,
      cancelledBookings,
      totalBookings,
    ] = await Promise.all([
      this.leadModel.countDocuments(leadFilter).exec(),
      this.leadModel
        .aggregate<{ _id: string; count: number }>([
          { $match: leadFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.leadModel
        .countDocuments({
          ...leadFilter,
          $or: [
            { status: LeadStatus.Won },
            { convertedCustomerId: { $ne: null } },
          ],
        })
        .exec(),
      this.bookingModel
        .countDocuments({
          ...bookingFilter,
          status: { $in: RESERVATION_STATUSES },
        })
        .exec(),
      this.bookingModel
        .countDocuments({
          ...bookingFilter,
          status: { $in: BOOKED_STATUSES },
        })
        .exec(),
      this.bookingModel
        .aggregate<{ total: number }>([
          {
            $match: {
              ...bookingFilter,
              status: { $in: BOOKED_STATUSES },
            },
          },
          { $group: { _id: null, total: { $sum: '$approvedPrice' } } },
        ])
        .exec(),
      this.demandModel
        .aggregate<{ demanded: number; collected: number }>([
          {
            $match: {
              ...demandFilter,
              status: { $in: [PaymentDemandStatus.Issued, PaymentDemandStatus.Settled] },
            },
          },
          {
            $group: {
              _id: null,
              demanded: { $sum: '$totalAmount' },
              collected: { $sum: '$collectedAmount' },
            },
          },
        ])
        .exec(),
      this.receiptModel
        .aggregate<{ total: number }>([
          {
            $match: {
              ...receiptFilter,
              status: CustomerReceiptStatus.Posted,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        .exec(),
      this.demandModel
        .aggregate<{ total: number }>([
          {
            $match: {
              ...demandFilter,
              status: PaymentDemandStatus.Issued,
              $expr: { $lt: ['$collectedAmount', '$totalAmount'] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $subtract: ['$totalAmount', '$collectedAmount'] },
              },
            },
          },
        ])
        .exec(),
      this.bookingModel
        .countDocuments({
          ...bookingFilter,
          status: BookingStatus.Cancelled,
        })
        .exec(),
      this.bookingModel.countDocuments(bookingFilter).exec(),
    ]);

    const leadsByStatus: Record<string, number> = {};
    for (const row of leadsByStatusRows) {
      leadsByStatus[row._id] = row.count;
    }

    const demanded = this.round2(demandAgg[0]?.demanded ?? 0);
    const collectedFromDemands = this.round2(demandAgg[0]?.collected ?? 0);
    const postedReceipts = this.round2(receiptAgg[0]?.total ?? 0);

    const data: SalesDashboardKpis = {
      projectId: query.projectId ?? null,
      companyId: query.companyId ?? null,
      asOf: new Date().toISOString(),
      leadsTotal,
      leadsByStatus,
      conversions,
      reservations,
      bookings,
      salesValue: this.round2(salesValueAgg[0]?.total ?? 0),
      collectionEfficiency: {
        demanded,
        collectedFromDemands,
        postedReceipts,
        ratio: demanded > 0 ? this.round2(collectedFromDemands / demanded) : 0,
      },
      outstandingDues: this.round2(outstandingAgg[0]?.total ?? 0),
      cancellationRate: {
        cancelled: cancelledBookings,
        total: totalBookings,
        ratio:
          totalBookings > 0
            ? this.round2(cancelledBookings / totalBookings)
            : 0,
      },
    };

    return createSuccessResponse(data, 'Sales dashboard summary');
  }

  private scopeFilter(input: {
    projectOid: Types.ObjectId | null;
    companyOid: Types.ObjectId | null;
  }): FilterQuery<Lead> {
    const filter: FilterQuery<Lead> = { ...NOT_DELETED };
    if (input.projectOid) filter.projectId = input.projectOid;
    if (input.companyOid) filter.companyId = input.companyOid;
    return filter;
  }

  private bookingScopeFilter(
    projectOid: Types.ObjectId | null,
  ): FilterQuery<Booking> {
    const filter: FilterQuery<Booking> = { ...NOT_DELETED };
    if (projectOid) filter.projectId = projectOid;
    return filter;
  }

  private demandScopeFilter(
    projectOid: Types.ObjectId | null,
  ): FilterQuery<PaymentDemand> {
    const filter: FilterQuery<PaymentDemand> = { ...NOT_DELETED };
    if (projectOid) filter.projectId = projectOid;
    return filter;
  }

  private receiptScopeFilter(
    projectOid: Types.ObjectId | null,
  ): FilterQuery<CustomerReceipt> {
    const filter: FilterQuery<CustomerReceipt> = { ...NOT_DELETED };
    if (projectOid) filter.projectId = projectOid;
    return filter;
  }

  private optionalOid(value: string | undefined, label: string) {
    if (!value) return null;
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(value);
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
