import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type BookingCancellationDocument = HydratedDocument<BookingCancellation>;

/**
 * Requested → Reviewed → Approved → Refund Processed → Unit Released
 */
export enum BookingCancellationStatus {
  Requested = 'requested',
  Reviewed = 'reviewed',
  PendingApproval = 'pending_approval',
  Approved = 'approved',
  RefundProcessed = 'refund_processed',
  UnitReleased = 'unit_released',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export const OPEN_CANCELLATION_STATUSES: BookingCancellationStatus[] = [
  BookingCancellationStatus.Requested,
  BookingCancellationStatus.Reviewed,
  BookingCancellationStatus.PendingApproval,
  BookingCancellationStatus.Approved,
  BookingCancellationStatus.RefundProcessed,
];

@Schema({ _id: true })
export class BookingCancellationDocumentFile {
  _id?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  /** Relative private storage path */
  @Prop({ required: true, trim: true })
  filePath!: string;

  @Prop({ type: String, trim: true, default: null })
  mimeType!: string | null;

  @Prop({ type: String, trim: true, default: 'general' })
  category!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  uploadedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: () => new Date() })
  uploadedAt!: Date;
}

export const BookingCancellationDocumentFileSchema =
  SchemaFactory.createForClass(BookingCancellationDocumentFile);

@Schema({
  collection: 'booking_cancellations',
  timestamps: true,
})
export class BookingCancellation {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  cancellationNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  cancellationReason!: string;

  @Prop({ type: Date, required: true, index: true })
  cancellationDate!: Date;

  /** Snapshot of posted customer receipts at request time */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  totalReceived!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  cancellationCharge!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  deductions!: number;

  /** totalReceived − cancellationCharge − deductions */
  @Prop({ type: Number, required: true, min: 0, default: 0 })
  approvedRefund!: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    default: null,
    index: true,
  })
  refundBankAccountId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  refundTransactionId!: string | null;

  @Prop({ type: Date, default: null })
  refundProcessedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  refundProcessedBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'ApprovalRequest', default: null })
  approvalRequestId!: Types.ObjectId | null;

  @Prop({ type: [BookingCancellationDocumentFileSchema], default: [] })
  documents!: BookingCancellationDocumentFile[];

  @Prop({
    type: String,
    enum: BookingCancellationStatus,
    required: true,
    default: BookingCancellationStatus.Requested,
    index: true,
  })
  status!: BookingCancellationStatus;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  unitReleasedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  unitReleasedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BookingCancellationSchema =
  SchemaFactory.createForClass(BookingCancellation);

BookingCancellationSchema.plugin(baseSchemaPlugin);
BookingCancellationSchema.plugin(softDeletePlugin);

BookingCancellationSchema.index({ bookingId: 1, status: 1 });
BookingCancellationSchema.index({ projectId: 1, status: 1, cancellationDate: -1 });
BookingCancellationSchema.index(
  { bookingId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: [
          BookingCancellationStatus.Requested,
          BookingCancellationStatus.Reviewed,
          BookingCancellationStatus.PendingApproval,
          BookingCancellationStatus.Approved,
          BookingCancellationStatus.RefundProcessed,
        ],
      },
    },
    name: 'uniq_open_cancellation_per_booking',
  },
);
