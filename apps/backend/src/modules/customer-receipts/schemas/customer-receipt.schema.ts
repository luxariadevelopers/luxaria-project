import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerReceiptDocument = HydratedDocument<CustomerReceipt>;

export enum CustomerReceiptPaymentMode {
  BankTransfer = 'bank_transfer',
  Neft = 'neft',
  Rtgs = 'rtgs',
  Imps = 'imps',
  Upi = 'upi',
  Cheque = 'cheque',
  Cash = 'cash',
  Other = 'other',
}

export enum CustomerReceiptSourceType {
  OwnFund = 'own_fund',
  BankLoan = 'bank_loan',
  RefundAdjustment = 'refund_adjustment',
  Other = 'other',
}

export enum CustomerReceiptStatus {
  Draft = 'draft',
  Posted = 'posted',
  Cancelled = 'cancelled',
}

@Schema({ _id: true })
export class CustomerReceiptAllocation {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PaymentDemand', required: true })
  demandId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  scheduleLineId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  milestone!: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;
}

export const CustomerReceiptAllocationSchema = SchemaFactory.createForClass(
  CustomerReceiptAllocation,
);

@Schema({
  collection: 'customer_receipts',
  timestamps: true,
})
export class CustomerReceipt {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  receiptNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  receiptDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({
    type: String,
    enum: CustomerReceiptPaymentMode,
    required: true,
    index: true,
  })
  paymentMode!: CustomerReceiptPaymentMode;

  @Prop({
    type: Types.ObjectId,
    ref: 'CompanyBankAccount',
    default: null,
    index: true,
  })
  companyBankAccountId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  transactionReference!: string | null;

  @Prop({
    type: String,
    enum: CustomerReceiptSourceType,
    required: true,
    index: true,
  })
  sourceType!: CustomerReceiptSourceType;

  /** Lending bank when sourceType is bank_loan */
  @Prop({ type: String, trim: true, default: null })
  loanBank!: string | null;

  /** Allocations against payment demands; remainder is unallocated advance */
  @Prop({ type: [CustomerReceiptAllocationSchema], default: [] })
  scheduleAllocation!: CustomerReceiptAllocation[];

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  allocatedAmount!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  unallocatedAmount!: number;

  /** Uploaded supporting document path */
  @Prop({ type: String, trim: true, default: null })
  receiptDocument!: string | null;

  /** Generated receipt PDF path */
  @Prop({ type: String, trim: true, default: null })
  receiptPdfPath!: string | null;

  @Prop({
    type: String,
    enum: CustomerReceiptStatus,
    required: true,
    default: CustomerReceiptStatus.Draft,
    index: true,
  })
  status!: CustomerReceiptStatus;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId!: Types.ObjectId | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  postedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  postedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerReceiptSchema =
  SchemaFactory.createForClass(CustomerReceipt);

CustomerReceiptSchema.plugin(baseSchemaPlugin);
CustomerReceiptSchema.plugin(softDeletePlugin);

CustomerReceiptSchema.index({ bookingId: 1, status: 1, receiptDate: -1 });
CustomerReceiptSchema.index({ customerId: 1, status: 1 });
CustomerReceiptSchema.index({ projectId: 1, receiptDate: -1 });

/**
 * Prevent duplicate transaction references within the same company bank account
 * for non-cancelled receipts.
 */
CustomerReceiptSchema.index(
  { companyBankAccountId: 1, transactionReference: 1 },
  {
    name: 'uniq_customer_receipt_txn_ref_per_bank',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      companyBankAccountId: { $type: 'objectId' },
      transactionReference: { $type: 'string' },
      status: {
        $in: [CustomerReceiptStatus.Draft, CustomerReceiptStatus.Posted],
      },
    },
  },
);
