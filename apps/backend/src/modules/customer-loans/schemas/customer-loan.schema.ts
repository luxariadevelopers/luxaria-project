import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type CustomerLoanDocument = HydratedDocument<CustomerLoan>;

export enum CustomerLoanStatus {
  Draft = 'draft',
  Applied = 'applied',
  Sanctioned = 'sanctioned',
  Disbursing = 'disbursing',
  Closed = 'closed',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

export enum CorrespondenceDirection {
  Inbound = 'inbound',
  Outbound = 'outbound',
}

@Schema({ _id: true })
export class PendingDocument {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: Boolean, required: true, default: true })
  required!: boolean;

  @Prop({ type: Date, default: null })
  receivedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  filePath!: string | null;
}

export const PendingDocumentSchema =
  SchemaFactory.createForClass(PendingDocument);

@Schema({ _id: true })
export class LoanDisbursement {
  _id?: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  stage!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Date, required: true })
  disbursedAt!: Date;

  @Prop({ type: String, trim: true, default: null })
  reference!: string | null;

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;
}

export const LoanDisbursementSchema =
  SchemaFactory.createForClass(LoanDisbursement);

@Schema({ _id: true })
export class LoanCorrespondence {
  _id?: Types.ObjectId;

  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop({ type: String, required: true, trim: true })
  subject!: string;

  @Prop({ type: String, required: true, trim: true })
  body!: string;

  @Prop({
    type: String,
    enum: CorrespondenceDirection,
    required: true,
  })
  direction!: CorrespondenceDirection;
}

export const LoanCorrespondenceSchema =
  SchemaFactory.createForClass(LoanCorrespondence);

@Schema({
  collection: 'customer_loans',
  timestamps: true,
})
export class CustomerLoan {
  @Prop({ required: true, unique: true, trim: true, uppercase: true })
  loanNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true, index: true })
  unitId!: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  bankName!: string | null;

  @Prop({ type: String, trim: true, default: null })
  bankBranch!: string | null;

  @Prop({ type: String, trim: true, default: null })
  loanAccountNumber!: string | null;

  @Prop({ type: Number, min: 0, default: null })
  sanctionAmount!: number | null;

  @Prop({ type: Date, default: null })
  sanctionedAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  sanctionLetterPath!: string | null;

  @Prop({ type: Number, min: 0, default: null })
  interestRate!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  tenureMonths!: number | null;

  @Prop({ type: Number, min: 0, default: null })
  emiAmount!: number | null;

  @Prop({ type: Date, default: null })
  emiStartDate!: Date | null;

  @Prop({
    type: String,
    enum: CustomerLoanStatus,
    required: true,
    default: CustomerLoanStatus.Draft,
    index: true,
  })
  status!: CustomerLoanStatus;

  @Prop({ type: [PendingDocumentSchema], default: [] })
  pendingDocuments!: PendingDocument[];

  @Prop({ type: [LoanDisbursementSchema], default: [] })
  disbursements!: LoanDisbursement[];

  @Prop({ type: [LoanCorrespondenceSchema], default: [] })
  correspondence!: LoanCorrespondence[];

  @Prop({ type: String, trim: true, default: null })
  notes!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CustomerLoanSchema = SchemaFactory.createForClass(CustomerLoan);

CustomerLoanSchema.plugin(baseSchemaPlugin);
CustomerLoanSchema.plugin(softDeletePlugin);

CustomerLoanSchema.index({ projectId: 1, status: 1, createdAt: -1 });
CustomerLoanSchema.index({ customerId: 1, status: 1 });
CustomerLoanSchema.index({ bookingId: 1, status: 1 });
CustomerLoanSchema.index({ unitId: 1, status: 1 });
