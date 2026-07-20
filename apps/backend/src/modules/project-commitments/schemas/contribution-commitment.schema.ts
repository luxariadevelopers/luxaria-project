import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';
import { baseSchemaPlugin } from '../../../database/plugins/base-schema.plugin';
import { softDeletePlugin } from '../../../database/plugins/soft-delete.plugin';

export type ContributionCommitmentDocument =
  HydratedDocument<ContributionCommitment>;

export enum ContributionType {
  Capital = 'capital',
  Equity = 'equity',
  Loan = 'loan',
  JointVenture = 'joint_venture',
  Other = 'other',
}

export enum CommitmentStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Approved = 'approved',
  Cancelled = 'cancelled',
  /** Prior approved version superseded by an amendment */
  Superseded = 'superseded',
}

@Schema({ _id: false })
export class PaymentScheduleLine {
  @Prop({ type: Date, required: true })
  dueDate!: Date;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, trim: true, default: null })
  label!: string | null;
}

export const PaymentScheduleLineSchema =
  SchemaFactory.createForClass(PaymentScheduleLine);

@Schema({ _id: false })
export class ExpectedBankAccount {
  @Prop({ type: String, trim: true, default: null })
  bankName!: string | null;

  @Prop({ type: String, trim: true, uppercase: true, default: null })
  ifsc!: string | null;

  @Prop({ type: String, trim: true, default: null })
  accountHolderName!: string | null;

  /** Last 4 digits only — full account numbers live on investor bank vault */
  @Prop({ type: String, trim: true, default: null })
  accountNumberLast4!: string | null;
}

export const ExpectedBankAccountSchema =
  SchemaFactory.createForClass(ExpectedBankAccount);

@Schema({ _id: false })
export class CommitmentReceiptLine {
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: Date, required: true })
  receivedAt!: Date;

  @Prop({ type: String, trim: true, default: null })
  reference!: string | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recordedBy!: Types.ObjectId | null;

  /** Link to first-class ContributionReceipt when posted via that module */
  @Prop({ type: Types.ObjectId, ref: 'ContributionReceipt', default: null })
  contributionReceiptId!: Types.ObjectId | null;
}

export const CommitmentReceiptLineSchema =
  SchemaFactory.createForClass(CommitmentReceiptLine);

/**
 * Project contribution commitment — versioned; approved rows are not edited in place.
 * Overdue commitment alerts will be added later.
 */
@Schema({
  collection: 'contribution_commitments',
  timestamps: true,
})
export class ContributionCommitment {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  /** Approved project participant record this commitment belongs to */
  @Prop({
    type: Types.ObjectId,
    ref: 'ProjectParticipant',
    required: true,
    index: true,
  })
  participantId!: Types.ObjectId;

  /** Stable human code across versions, e.g. COM-2026-000001 */
  @Prop({ required: true, trim: true, uppercase: true, index: true })
  commitmentNumber!: string;

  @Prop({ type: Number, required: true, min: 0 })
  commitmentAmount!: number;

  @Prop({ type: Date, required: true, index: true })
  commitmentDate!: Date;

  @Prop({ type: Date, default: null, index: true })
  dueDate!: Date | null;

  @Prop({ type: String, enum: ContributionType, required: true, index: true })
  contributionType!: ContributionType;

  @Prop({ type: [PaymentScheduleLineSchema], default: [] })
  paymentSchedule!: PaymentScheduleLine[];

  @Prop({ type: ExpectedBankAccountSchema, default: () => ({}) })
  expectedBankAccount!: ExpectedBankAccount;

  @Prop({ type: String, trim: true, default: null })
  agreementReference!: string | null;

  @Prop({ type: String, trim: true, default: null })
  remarks!: string | null;

  @Prop({
    type: String,
    enum: CommitmentStatus,
    default: CommitmentStatus.Draft,
    index: true,
  })
  status!: CommitmentStatus;

  @Prop({ type: Number, required: true, min: 1, index: true })
  version!: number;

  @Prop({ type: Types.ObjectId, ref: 'ContributionCommitment', default: null })
  supersedesId!: Types.ObjectId | null;

  /** Sum of recorded receipts — never allow commitmentAmount < this */
  @Prop({ type: Number, default: 0, min: 0 })
  receivedAmount!: number;

  @Prop({ type: [CommitmentReceiptLineSchema], default: [] })
  receipts!: CommitmentReceiptLine[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  submittedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: String, trim: true, default: null })
  cancellationReason!: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContributionCommitmentSchema = SchemaFactory.createForClass(
  ContributionCommitment,
);

ContributionCommitmentSchema.plugin(baseSchemaPlugin);
ContributionCommitmentSchema.plugin(softDeletePlugin);

ContributionCommitmentSchema.index({
  projectId: 1,
  commitmentNumber: 1,
  version: -1,
});
ContributionCommitmentSchema.index({ projectId: 1, participantId: 1, status: 1 });
ContributionCommitmentSchema.index(
  { projectId: 1, commitmentNumber: 1 },
  {
    name: 'one_approved_commitment_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: CommitmentStatus.Approved,
    },
  },
);
ContributionCommitmentSchema.index(
  { projectId: 1, commitmentNumber: 1 },
  {
    name: 'one_pending_commitment_version',
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      status: {
        $in: [CommitmentStatus.Draft, CommitmentStatus.Submitted],
      },
    },
  },
);
