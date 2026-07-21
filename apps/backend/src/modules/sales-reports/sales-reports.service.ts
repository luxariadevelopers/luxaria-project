import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Booking,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import {
  BookingCancellation,
} from '../booking-cancellations/schemas/booking-cancellation.schema';
import {
  CustomerLoan,
} from '../customer-loans/schemas/customer-loan.schema';
import {
  CustomerReceipt,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  CustomerWarranty,
} from '../customer-warranties/schemas/customer-warranty.schema';
import { Lead } from '../leads/schemas/lead.schema';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  UnitHandover,
} from '../unit-handovers/schemas/unit-handover.schema';
import {
  UnitRegistration,
} from '../unit-registrations/schemas/unit-registration.schema';
import { Unit } from '../units/schemas/unit.schema';
import type { SalesReportQuery } from './sales-reports.types';

const NOT_DELETED = { isDeleted: { $ne: true } } as const;

@Injectable()
export class SalesReportsService {
  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<Lead>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(BookingCancellation.name)
    private readonly cancellationModel: Model<BookingCancellation>,
    @InjectModel(Unit.name)
    private readonly unitModel: Model<Unit>,
    @InjectModel(PaymentDemand.name)
    private readonly demandModel: Model<PaymentDemand>,
    @InjectModel(CustomerReceipt.name)
    private readonly receiptModel: Model<CustomerReceipt>,
    @InjectModel(CustomerLoan.name)
    private readonly loanModel: Model<CustomerLoan>,
    @InjectModel(UnitRegistration.name)
    private readonly registrationModel: Model<UnitRegistration>,
    @InjectModel(UnitHandover.name)
    private readonly handoverModel: Model<UnitHandover>,
    @InjectModel(CustomerWarranty.name)
    private readonly warrantyModel: Model<CustomerWarranty>,
  ) {}

  async leadRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const [rows, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.leadModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => this.toLeadRow(row)),
      'Lead register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async salesFunnel(query: SalesReportQuery) {
    const filter = this.buildFilter(query, 'createdAt');
    const rows = await this.leadModel
      .aggregate<{ _id: string; count: number }>([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .exec();
    const funnel = rows.map((row) => ({
      status: row._id,
      count: row.count,
    }));
    const total = funnel.reduce((s, row) => s + row.count, 0);
    return createSuccessResponse(
      { projectId: query.projectId ?? null, total, funnel },
      'Sales funnel',
    );
  }

  async unitAvailability(query: SalesReportQuery) {
    const filter = this.buildFilter(query, 'createdAt', 'projectId');
    const rows = await this.unitModel
      .aggregate<{ _id: string; count: number }>([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .exec();
    const byStatus = rows.map((row) => ({
      status: row._id,
      count: row.count,
    }));
    const total = byStatus.reduce((s, row) => s + row.count, 0);
    return createSuccessResponse(
      { projectId: query.projectId ?? null, total, byStatus },
      'Unit availability',
    );
  }

  async bookingRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'bookingDate');
    const [rows, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .sort({ bookingDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => this.toBookingRow(row)),
      'Booking register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async cancellationRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const bookingFilter: FilterQuery<Booking> = {
      ...filter,
      status: BookingStatus.Cancelled,
    };
    const [cancelledBookings, bookingTotal, cancellationRows, cancellationTotal] =
      await Promise.all([
        this.bookingModel
          .find(bookingFilter)
          .sort({ cancelledAt: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.bookingModel.countDocuments(bookingFilter).exec(),
        this.cancellationModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),
        this.cancellationModel.countDocuments(filter).exec(),
      ]);

    const items = [
      ...cancelledBookings.map((row) => ({
        source: 'booking' as const,
        ...this.toBookingRow(row),
        cancellationReason: row.cancellationReason ?? null,
        cancelledAt: row.cancelledAt
          ? new Date(row.cancelledAt).toISOString()
          : null,
      })),
      ...cancellationRows.map((row) => ({
        source: 'cancellation_request' as const,
        id: String(row._id),
        cancellationNumber: row.cancellationNumber,
        bookingId: String(row.bookingId),
        projectId: String(row.projectId),
        customerId: String(row.customerId),
        unitId: String(row.unitId),
        status: row.status,
        cancellationReason: row.cancellationReason,
        cancellationDate: new Date(row.cancellationDate).toISOString(),
        approvedRefund: row.approvedRefund,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
    ];

    return createSuccessResponse(
      items,
      'Cancellation register',
      buildPaginationMeta(
        page,
        limit,
        Math.max(bookingTotal, cancellationTotal),
      ),
    );
  }

  async demandRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'issuedAt');
    const [rows, total] = await Promise.all([
      this.demandModel
        .find(filter)
        .sort({ issuedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.demandModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => this.toDemandRow(row)),
      'Demand register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async collectionRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'receiptDate');
    const [rows, total] = await Promise.all([
      this.receiptModel
        .find(filter)
        .sort({ receiptDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.receiptModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => this.toReceiptRow(row)),
      'Collection register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async outstanding(query: SalesReportQuery) {
    const base = this.buildFilter(query, 'dueDate');
    const filter: FilterQuery<PaymentDemand> = {
      ...base,
      status: PaymentDemandStatus.Issued,
      $expr: { $lt: ['$collectedAmount', '$totalAmount'] },
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [rows, total] = await Promise.all([
      this.demandModel
        .find(filter)
        .sort({ dueDate: 1, issuedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.demandModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => ({
        ...this.toDemandRow(row),
        outstandingAmount: this.round2(
          (row.totalAmount ?? 0) - (row.collectedAmount ?? 0),
        ),
      })),
      'Outstanding demands',
      buildPaginationMeta(page, limit, total),
    );
  }

  async loanStatus(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const [rows, total] = await Promise.all([
      this.loanModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.loanModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        loanNumber: row.loanNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        customerId: String(row.customerId),
        bankName: row.bankName ?? null,
        sanctionAmount: row.sanctionAmount ?? null,
        disbursedAmount: (row.disbursements ?? []).reduce(
          (sum, d) => sum + (d.amount ?? 0),
          0,
        ),
        status: row.status,
        sanctionedAt: row.sanctionedAt
          ? new Date(row.sanctionedAt).toISOString()
          : null,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
      'Loan status register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async registrationRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const [rows, total] = await Promise.all([
      this.registrationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.registrationModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        registrationNumber: row.registrationNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        customerId: String(row.customerId),
        unitId: String(row.unitId),
        agreementId: row.agreementId ? String(row.agreementId) : null,
        status: row.status,
        registeredAt: row.registeredAt
          ? new Date(row.registeredAt).toISOString()
          : null,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
      'Registration register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async handoverRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const [rows, total] = await Promise.all([
      this.handoverModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.handoverModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        handoverNumber: row.handoverNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        customerId: String(row.customerId),
        unitId: String(row.unitId),
        status: row.status,
        scheduledAt: row.scheduledAt
          ? new Date(row.scheduledAt).toISOString()
          : null,
        completedAt: row.completedAt
          ? new Date(row.completedAt).toISOString()
          : null,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
      'Handover register',
      buildPaginationMeta(page, limit, total),
    );
  }

  async warrantyRegister(query: SalesReportQuery) {
    const { filter, page, limit } = this.buildPagedFilter(query, 'createdAt');
    const [rows, total] = await Promise.all([
      this.warrantyModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.warrantyModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((row) => ({
        id: String(row._id),
        ticketNumber: row.ticketNumber,
        projectId: String(row.projectId),
        bookingId: String(row.bookingId),
        customerId: String(row.customerId),
        unitId: String(row.unitId),
        category: row.category,
        description: row.description,
        status: row.status,
        raisedAt: row.raisedAt
          ? new Date(row.raisedAt).toISOString()
          : null,
        closedAt: row.closedAt
          ? new Date(row.closedAt).toISOString()
          : null,
        createdAt: row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      })),
      'Warranty register',
      buildPaginationMeta(page, limit, total),
    );
  }

  private buildPagedFilter(
    query: SalesReportQuery,
    dateField: string,
    projectField = 'projectId',
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = this.buildFilter(query, dateField, projectField);
    return { filter, page, limit };
  }

  private buildFilter(
    query: SalesReportQuery,
    dateField: string,
    projectField = 'projectId',
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...NOT_DELETED };
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter[projectField] = new Types.ObjectId(query.projectId);
    }
    if (query.from || query.to) {
      filter[dateField] = {};
      if (query.from) {
        (filter[dateField] as Record<string, Date>).$gte = new Date(query.from);
      }
      if (query.to) {
        (filter[dateField] as Record<string, Date>).$lte = new Date(query.to);
      }
    }
    return filter;
  }

  private toLeadRow(row: Lead & { _id: Types.ObjectId }) {
    return {
      id: String(row._id),
      leadNumber: row.leadNumber,
      companyId: row.companyId ? String(row.companyId) : null,
      projectId: row.projectId ? String(row.projectId) : null,
      source: row.source,
      status: row.status,
      contact: {
        fullName: row.contact.fullName,
        email: row.contact.email ?? null,
        phone: row.contact.phone ?? null,
      },
      convertedCustomerId: row.convertedCustomerId
        ? String(row.convertedCustomerId)
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    };
  }

  private toBookingRow(row: Booking & { _id: Types.ObjectId }) {
    return {
      id: String(row._id),
      bookingNumber: row.bookingNumber,
      projectId: String(row.projectId),
      customerId: String(row.customerId),
      unitId: String(row.unitId),
      bookingDate: new Date(row.bookingDate).toISOString(),
      approvedPrice: row.approvedPrice,
      status: row.status,
      fundingType: row.fundingType,
      createdAt: row.createdAt
        ? new Date(row.createdAt).toISOString()
        : null,
    };
  }

  private toDemandRow(row: PaymentDemand & { _id: Types.ObjectId }) {
    return {
      id: String(row._id),
      demandNumber: row.demandNumber,
      projectId: String(row.projectId),
      bookingId: String(row.bookingId),
      customerId: String(row.customerId),
      milestone: row.milestone,
      dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
      totalAmount: row.totalAmount,
      collectedAmount: row.collectedAmount,
      status: row.status,
      issuedAt: new Date(row.issuedAt).toISOString(),
    };
  }

  private toReceiptRow(row: CustomerReceipt & { _id: Types.ObjectId }) {
    return {
      id: String(row._id),
      receiptNumber: row.receiptNumber,
      projectId: String(row.projectId),
      bookingId: String(row.bookingId),
      customerId: String(row.customerId),
      unitId: String(row.unitId),
      receiptDate: new Date(row.receiptDate).toISOString(),
      amount: row.amount,
      paymentMode: row.paymentMode,
      sourceType: row.sourceType,
      status: row.status,
      allocatedAmount: row.allocatedAmount,
      unallocatedAmount: row.unallocatedAmount,
    };
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
