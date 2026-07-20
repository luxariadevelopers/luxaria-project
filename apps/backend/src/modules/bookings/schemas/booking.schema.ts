import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';
import { CustomerFundingType } from '../../customers/schemas/customer.schema';

export type BookingDocument = HydratedDocument<Booking>;

/**
 * Sales booking workflow:
 * Hold → Reserved → Booked → Agreement → Registered
 * (+ pending_approval when discount exceeds limit; expired / cancelled terminals)
 */
export enum BookingStatus {
  Hold = 'hold',
  PendingApproval = 'pending_approval',
  Reserved = 'reserved',
  Booked = 'booked',
  Agreement = 'agreement',
  Registered = 'registered',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

/** Statuses that claim a unit and block another active booking. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Hold,
  BookingStatus.PendingApproval,
  BookingStatus.Reserved,
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

@Schema({ _id: false })
export class BookingPaymentInstallment {
  @Prop({ type: Number, required: true, min: 1 })
  sequence!: number;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ type: Date, default: null })
  dueDate!: Date | null;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  amount!: number;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  percent!: number | null;
}

export const BookingPaymentInstallmentSchema = SchemaFactory.createForClass(
  BookingPaymentInstallment,
);

@Schema({ _id: false })
export class BookingPaymentPlan {
  @Prop({ type: String, trim: true, default: null })
  name!: string | null;

  @Prop({ type: [BookingPaymentInstallmentSchema], default: [] })
  installments!: BookingPaymentInstallment[];
}

export const BookingPaymentPlanSchema =
  SchemaFactory.createForClass(BookingPaymentPlan);

@Schema({ _id: false })
export class BookingBroker {
  @Prop({ type: String, trim: true, default: null })
  name!: string | null;

  @Prop({ type: String, trim: true, default: null })
  firmName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone!: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email!: string | null;

  @Prop({ type: Number, min: 0, max: 100, default: null })
  commissionPercent!: number | null;
}

export const BookingBrokerSchema = SchemaFactory.createForClass(BookingBroker);

@Schema({
  collection: 'bookings',
  timestamps: true,
})
export class Booking {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  bookingNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  /**
   * Optional joint-applicant reference (synthetic id when copied from customer,
   * or client-supplied id). Not a separate collection.
   */
  @Prop({ type: Types.ObjectId, default: null, index: true })
  jointApplicantId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  bookingDate!: Date;

  /** Token / advance collected at booking. */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  bookingAmount!: number;

  /** Negotiated sale price before discount. */
  @Prop({ type: Number, required: true, min: 0 })
  agreedPrice!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  discount!: number;

  /** Final price after discount (agreedPrice − discount). */
  @Prop({ type: Number, required: true, min: 0 })
  approvedPrice!: number;

  @Prop({ type: BookingPaymentPlanSchema, default: () => ({}) })
  paymentPlan!: BookingPaymentPlan;

  @Prop({ type: BookingBrokerSchema, default: () => ({}) })
  broker!: BookingBroker;

  @Prop({
    type: String,
    enum: CustomerFundingType,
    required: true,
    index: true,
  })
  fundingType!: CustomerFundingType;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({
    type: String,
    enum: BookingStatus,
    required: true,
    default: BookingStatus.Hold,
    index: true,
  })
  status!: BookingStatus;

  /** When hold / pending_approval expires and unit is released. */
  @Prop({ type: Date, default: null, index: true })
  holdExpiresAt!: Date | null;

  @Prop({ type: Boolean, default: false })
  discountApprovalRequired!: boolean;

  @Prop({ type: Boolean, default: false })
  discountApproved!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  pdfPath!: string | null;

  @Prop({ type: Date, default: null })
  pdfGeneratedAt!: Date | null;

  @Prop({ type: Date, default: null })
  expiredAt!: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.plugin(baseSchemaPlugin);
BookingSchema.plugin(softDeletePlugin);

BookingSchema.index({ projectId: 1, status: 1 });
BookingSchema.index({ unitId: 1, status: 1 });
BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ holdExpiresAt: 1, status: 1 });
BookingSchema.index(
  { unitId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: [
          BookingStatus.Hold,
          BookingStatus.PendingApproval,
          BookingStatus.Reserved,
          BookingStatus.Booked,
          BookingStatus.Agreement,
          BookingStatus.Registered,
        ],
      },
    },
    name: 'uniq_active_booking_per_unit',
  },
);
